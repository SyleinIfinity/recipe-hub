import { publicRecipePipeline } from '../recipes/recipe-visibility.js';
import { boundedAggregate } from '../recipes/search.service.js';
import { activeActor, oid } from '../social/social.policy.js';

export function createMembershipReader({ Recipe, User, Favorite, Bookmark }) {
  return async (actor, recipeIds) => {
    const userId = await activeActor(User, actor);
    const lookup = (model, as) => ({
      $lookup: {
        from: model.collection.name,
        localField: '_id',
        foreignField: 'recipeId',
        pipeline: [{ $match: { userId } }, { $project: { _id: 1 } }],
        as,
      },
    });
    return boundedAggregate(Recipe, [
      ...publicRecipePipeline(User, { _id: { $in: recipeIds.map(oid) } }),
      lookup(Favorite, 'favorite'),
      lookup(Bookmark, 'bookmark'),
      {
        $project: {
          _id: 0,
          recipeId: { $toString: '$_id' },
          favorited: { $gt: [{ $size: '$favorite' }, 0] },
          saved: { $gt: [{ $size: '$bookmark' }, 0] },
        },
      },
    ]);
  };
}
