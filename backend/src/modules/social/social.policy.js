import mongoose from 'mongoose';
import { AppError } from '../../shared/errors.js';
import { publicRecipePipeline } from '../recipes/recipe-visibility.js';
import { boundedAggregate } from '../recipes/search.service.js';
export const oid = (v) => new mongoose.Types.ObjectId(String(v));
export const fail = (status, code, message) => {
  throw new AppError(status, code, message);
};
export async function activeActor(User, actor, admin = false) {
  if (!actor?.user?._id || actor.user.status !== 'active')
    fail(401, 'UNAUTHENTICATED', 'Authentication required');
  const user = await User.findOne({
    _id: actor.user._id,
    status: 'active',
  }).select('_id role');
  if (!user) fail(401, 'UNAUTHENTICATED', 'Authentication required');
  if (admin && (actor.user.role !== 'admin' || user.role !== 'admin'))
    fail(403, 'FORBIDDEN', 'Insufficient permissions');
  return user._id;
}
export function activeAuthorPipeline(
  User,
  field = 'authorId',
  as = 'publicAuthor',
) {
  return [
    {
      $lookup: {
        from: User.collection.name,
        localField: field,
        foreignField: '_id',
        pipeline: [
          { $match: { status: 'active' } },
          { $project: { _id: 1, displayName: 1 } },
        ],
        as,
      },
    },
    { $unwind: `$${as}` },
  ];
}
export const visibleCommentMatch = () => ({
  status: 'visible',
  deletedAt: null,
  creationState: 'complete',
});
export function commentVisibilityPipeline(Comment, User, filter = {}) {
  return [
    { $match: { ...filter, ...visibleCommentMatch() } },
    ...activeAuthorPipeline(User),
    {
      $lookup: {
        from: Comment.collection.name,
        localField: 'parentId',
        foreignField: '_id',
        let: { recipe: '$recipeId' },
        pipeline: [
          {
            $match: {
              ...visibleCommentMatch(),
              parentId: null,
              $expr: { $eq: ['$recipeId', '$$recipe'] },
            },
          },
          ...activeAuthorPipeline(User),
          { $project: { _id: 1 } },
        ],
        as: 'publicParent',
      },
    },
    {
      $match: {
        $or: [{ parentId: null }, { 'publicParent.0': { $exists: true } }],
      },
    },
  ];
}
export async function publicInteractions(
  { Recipe, User },
  recipeId,
  collection,
  pipeline,
) {
  const [row] = await boundedAggregate(Recipe, [
    ...publicRecipePipeline(User, { _id: oid(recipeId) }),
    { $lookup: { from: collection, pipeline, as: 'interactions' } },
    { $project: { interactions: 1 } },
  ]);
  if (!row) fail(404, 'RECIPE_NOT_FOUND', 'Recipe not found');
  return row.interactions[0];
}
export const pageFacet = (query, extra = {}) => {
  const direction = query.sort.startsWith('-') ? -1 : 1;
  return [
    { $sort: { createdAt: direction, _id: direction } },
    {
      $facet: {
        rows: [
          { $skip: (query.page - 1) * query.limit },
          { $limit: query.limit },
        ],
        count: [{ $count: 'total' }],
        ...extra,
      },
    },
  ];
};
export const pageResult = (result, query) => ({
  rows: result.rows,
  meta: {
    page: query.page,
    limit: query.limit,
    total: result.count[0]?.total ?? 0,
  },
});
