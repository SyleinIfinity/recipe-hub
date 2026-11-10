import mongoose from 'mongoose';
import { AppError } from '../../shared/errors.js';
import { publicRecipePipeline } from '../recipes/recipe-visibility.js';
import {
  boundedAggregate,
  publicCardProjection,
} from '../recipes/search.service.js';
import { favoriteQuery } from './favorite.validation.js';
export function favoritePipeline({ Recipe, User }, userId, { page, limit }) {
  return [
    { $match: { userId } },
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $lookup: {
        from: Recipe.collection.name,
        localField: 'recipeId',
        foreignField: '_id',
        pipeline: [
          ...publicRecipePipeline(User),
          { $project: publicCardProjection },
        ],
        as: 'recipe',
      },
    },
    { $unwind: '$recipe' },
    {
      $facet: {
        rows: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          { $replaceWith: '$recipe' },
        ],
        count: [{ $count: 'total' }],
      },
    },
  ];
}
export function createFavoriteService({ Favorite, Recipe, User, publication }) {
  async function owner(actor) {
    if (
      !actor?.user?._id ||
      actor.user.status !== 'active' ||
      !(await User.exists({ _id: actor.user._id, status: 'active' }))
    )
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    return new mongoose.Types.ObjectId(String(actor.user._id));
  }
  return {
    async add(actor, id) {
      const userId = await owner(actor),
        recipeId = new mongoose.Types.ObjectId(id);
      if (!(await publication.isPublic(recipeId)))
        throw new AppError(404, 'RECIPE_NOT_FOUND', 'Recipe not found');
      // The unique pair, not the visibility read, serializes concurrent PUTs.
      try {
        const result = await Favorite.updateOne(
          { userId, recipeId },
          { $setOnInsert: { userId, recipeId, createdAt: new Date() } },
          { upsert: true, runValidators: true },
        );
        return {
          created: result.upsertedCount === 1,
          recipeId: String(recipeId),
        };
      } catch (err) {
        if (
          err.code === 11000 &&
          err.keyPattern?.userId &&
          err.keyPattern?.recipeId
        )
          return { created: false, recipeId: String(recipeId) };
        throw err;
      }
    },
    async remove(actor, id) {
      await Favorite.deleteOne({ userId: await owner(actor), recipeId: id });
    },
    async list(actor, raw) {
      const userId = await owner(actor),
        query = favoriteQuery.parse(raw);
      const [result] = await boundedAggregate(
        Favorite,
        favoritePipeline({ Recipe, User }, userId, query),
      );
      return {
        rows: result.rows,
        meta: {
          page: query.page,
          limit: query.limit,
          total: result.count[0]?.total ?? 0,
        },
      };
    },
  };
}
