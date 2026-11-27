import { activeActor, oid } from '../social/social.policy.js';
import { interactionSummaryStages } from '../social/interaction-summary.js';
import { AppError } from '../../shared/errors.js';
import { publicRecipePipeline } from '../recipes/recipe-visibility.js';
import {
  boundedAggregate,
  publicCardProjection,
} from '../recipes/search.service.js';
import { favoriteQuery } from './favorite.validation.js';
export function recipeRelationPipeline(
  { Recipe, User },
  userId,
  { page, limit },
) {
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
          ...interactionSummaryStages(User),
        ],
        count: [{ $count: 'total' }],
      },
    },
  ];
}
export function createRecipeRelationService({
  Relation,
  Recipe,
  User,
  publication,
}) {
  return {
    async add(actor, id) {
      const userId = await activeActor(User, actor),
        recipeId = oid(id);
      if (!(await publication.isPublic(recipeId)))
        throw new AppError(404, 'RECIPE_NOT_FOUND', 'Recipe not found');
      // The unique pair, not the visibility read, serializes concurrent PUTs.
      try {
        const result = await Relation.updateOne(
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
      await Relation.deleteOne({
        userId: await activeActor(User, actor),
        recipeId: id,
      });
    },
    async list(actor, raw) {
      const userId = await activeActor(User, actor),
        query = favoriteQuery.parse(raw);
      const [result] = await boundedAggregate(
        Relation,
        recipeRelationPipeline({ Recipe, User }, userId, query),
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
