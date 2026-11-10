import { reviewBody, socialQuery } from '../social/social.validation.js';
import {
  oid,
  activeActor,
  activeAuthorPipeline,
  publicInteractions,
  pageFacet,
  pageResult,
  fail,
} from '../social/social.policy.js';
export function createReviewService({ Review, Recipe, User, publication }) {
  return {
    async put(actor, id, raw) {
      const userId = await activeActor(User, actor),
        input = reviewBody.parse(raw),
        recipe = await publication.isPublic(oid(id));
      if (!recipe) fail(404, 'RECIPE_NOT_FOUND', 'Recipe not found');
      if (String(recipe.authorId) === String(userId))
        fail(422, 'SELF_REVIEW', 'Cannot review your own recipe');
      let result;
      for (let attempt = 0; attempt < 2; attempt++)
        try {
          result = await Review.findOneAndUpdate(
            { userId, recipeId: id, status: 'visible' },
            {
              $set: {
                rating: input.rating,
                content: input.content,
                deletedAt: null,
              },
              $setOnInsert: { userId, recipeId: id, status: 'visible' },
            },
            {
              upsert: true,
              returnDocument: 'after',
              includeResultMetadata: true,
              runValidators: true,
            },
          );
          break;
        } catch (err) {
          if (err.code !== 11000) throw err;
          const prior = await Review.findOne({ userId, recipeId: id });
          if (prior?.status === 'hidden')
            fail(409, 'REVIEW_HIDDEN', 'Hidden review cannot be edited');
          if (attempt === 1)
            fail(
              409,
              'REVIEW_CONFLICT',
              'Concurrent review change; retry the same PUT',
            );
        }
      return {
        row: {
          ...result.value.toObject(),
          publicAuthor: { _id: userId, displayName: actor.user.displayName },
        },
        created: !result.lastErrorObject.updatedExisting,
      };
    },
    async remove(actor, id) {
      await Review.updateOne(
        {
          userId: await activeActor(User, actor),
          recipeId: id,
          deletedAt: null,
        },
        { $set: { deletedAt: new Date() } },
      );
    },
    async list(id, raw) {
      const query = socialQuery.parse(raw);
      const result = await publicInteractions(
        { Recipe, User },
        id,
        Review.collection.name,
        [
          { $match: { recipeId: oid(id), status: 'visible', deletedAt: null } },
          ...activeAuthorPipeline(User, 'userId'),
          ...pageFacet(query, {
            summary: [
              {
                $group: {
                  _id: null,
                  averageRating: { $avg: '$rating' },
                  ratingCount: { $sum: 1 },
                },
              },
              {
                $project: {
                  _id: 0,
                  averageRating: { $round: ['$averageRating', 2] },
                  ratingCount: 1,
                },
              },
            ],
          }),
        ],
      );
      return {
        ...pageResult(result, query),
        summary: result.summary[0] ?? { averageRating: null, ratingCount: 0 },
      };
    },
  };
}
