import { COMMENT_COLLECTION } from '../comments/comment.model.js';
import { FAVORITE_COLLECTION } from '../favorites/favorite.model.js';
import {
  activeAuthorPipeline,
  commentVisibilityPipeline,
} from './social.policy.js';

// Append after public visibility and the page limit. Both counts are scoped by
// the outer recipe ID; the database returns counts, never member identities.
export function interactionSummaryStages(User) {
  return [
    {
      $lookup: {
        from: FAVORITE_COLLECTION,
        localField: '_id',
        foreignField: 'recipeId',
        pipeline: [
          ...activeAuthorPipeline(User, 'userId'),
          { $count: 'total' },
        ],
        as: 'visibleFavorites',
      },
    },
    {
      $lookup: {
        from: COMMENT_COLLECTION,
        localField: '_id',
        foreignField: 'recipeId',
        pipeline: [...commentVisibilityPipeline(User), { $count: 'total' }],
        as: 'visibleComments',
      },
    },
    {
      $set: {
        interactionSummary: {
          favoriteCount: {
            $ifNull: [{ $first: '$visibleFavorites.total' }, 0],
          },
          commentCount: { $ifNull: [{ $first: '$visibleComments.total' }, 0] },
        },
      },
    },
    { $unset: ['visibleFavorites', 'visibleComments'] },
  ];
}
