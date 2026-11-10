import { AppError } from '../../shared/errors.js';
import { createUserMediaReferences } from '../media/media-reference.js';
export function recipeReferences(recipe) {
  const target = (kind, stepId) => ({
    kind,
    resourceId: String(recipe._id),
    ...(stepId ? { stepId } : {}),
  });
  return [
    ...(recipe.coverImageAssetId
      ? [
          {
            assetId: String(recipe.coverImageAssetId),
            target: target('recipe_cover'),
          },
        ]
      : []),
    ...recipe.steps
      .filter((s) => s.imageAssetId)
      .map((s) => ({
        assetId: String(s.imageAssetId),
        target: target('recipe_step', s.stepId),
      })),
  ];
}
export function createRecipeReferences({ Recipe, User }) {
  const users = createUserMediaReferences(User);
  const userTarget = (t) => t.kind === 'user_avatar';
  const owned = (t, owner) => ({ _id: t.resourceId, authorId: owner });
  async function get(t, owner) {
    const r = await Recipe.findOne(owned(t, owner));
    if (!r)
      throw new AppError(404, 'MEDIA_TARGET_NOT_FOUND', 'Target not found');
    return r;
  }
  return {
    async read(t, owner) {
      if (userTarget(t)) return users.read(t, owner);
      const r = await get(t, owner);
      return {
        assetId:
          t.kind === 'recipe_cover'
            ? r.coverImageAssetId
            : (r.steps.find((s) => s.stepId === t.stepId)?.imageAssetId ??
              null),
        version: r.version,
      };
    },
    async compareAndSwap(t, owner, version, assetId) {
      if (userTarget(t))
        return users.compareAndSwap(t, owner, version, assetId);
      const filter = {
        ...owned(t, owner),
        version,
        status: 'draft',
        deletedAt: null,
        creationState: 'complete',
      };
      const field =
        t.kind === 'recipe_cover'
          ? 'coverImageAssetId'
          : 'steps.$.imageAssetId';
      if (t.kind === 'recipe_step') filter['steps.stepId'] = t.stepId;
      return Boolean(
        await Recipe.findOneAndUpdate(
          filter,
          { $set: { [field]: assetId }, $inc: { version: 1 } },
          { runValidators: true },
        ),
      );
    },
    async fence(t, owner, version) {
      if (userTarget(t)) return users.fence(t, owner, version);
      await get(t, owner);
      await Recipe.updateOne(
        { ...owned(t, owner), version },
        { $inc: { version: 1 } },
      );
    },
    async isReferenced(asset) {
      try {
        if (await User.exists({ avatarAssetId: asset._id })) return true;
        // Includes soft-deleted recipes: absence of visibility is not permission to purge media.
        return Boolean(
          await Recipe.exists({
            $or: [
              { coverImageAssetId: asset._id },
              { 'steps.imageAssetId': asset._id },
            ],
          }),
        );
      } catch {
        return null;
      }
    },
  };
}
