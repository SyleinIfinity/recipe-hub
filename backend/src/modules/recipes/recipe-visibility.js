// Reused by public reads and media authorization. Do not cache positive grants.
export const publicRecipeMatch = () => ({
  status: 'published',
  moderationStatus: 'normal',
  deletedAt: null,
  creationState: 'complete',
});
export function publicRecipePipeline(User, filter = {}) {
  return [
    { $match: { ...filter, ...publicRecipeMatch() } },
    {
      $lookup: {
        from: User.collection.name,
        localField: 'authorId',
        foreignField: '_id',
        pipeline: [
          { $match: { status: 'active' } },
          { $project: { _id: 1, displayName: 1, avatarAssetId: 1 } },
        ],
        as: 'publicAuthor',
      },
    },
    { $unwind: '$publicAuthor' },
  ];
}
