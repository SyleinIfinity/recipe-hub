import { AppError } from '../../shared/errors.js';
// Resource adapters own the canonical CAS and fencing protocol. Recipe supplies its adapter in BE-10.
export function createUserMediaReferences(User) {
  function owned(target, ownerId) {
    if (
      target.kind !== 'user_avatar' ||
      String(target.resourceId) !== String(ownerId)
    )
      throw new AppError(404, 'MEDIA_TARGET_NOT_FOUND', 'Target not found');
    return { _id: target.resourceId };
  }
  const version = (expected) =>
    expected === 0
      ? { $or: [{ mediaVersion: 0 }, { mediaVersion: { $exists: false } }] }
      : { mediaVersion: expected };
  return {
    async read(target, ownerId) {
      const user = await User.findOne(owned(target, ownerId));
      if (!user)
        throw new AppError(404, 'MEDIA_TARGET_NOT_FOUND', 'Target not found');
      return { assetId: user.avatarAssetId, version: user.mediaVersion ?? 0 };
    },
    async compareAndSwap(target, ownerId, expectedVersion, assetId) {
      return Boolean(
        await User.findOneAndUpdate(
          {
            ...owned(target, ownerId),
            status: 'active',
            ...version(expectedVersion),
          },
          { $set: { avatarAssetId: assetId }, $inc: { mediaVersion: 1 } },
        ),
      );
    },
    async fence(target, ownerId, expectedVersion) {
      await User.updateOne(
        { ...owned(target, ownerId), ...version(expectedVersion) },
        { $inc: { mediaVersion: 1 } },
      );
    },
    async isReferenced(asset) {
      if (await User.exists({ avatarAssetId: asset._id })) return true;
      // Previously attached Recipe data cannot be proven unused until its domain checker exists.
      if (
        (asset.attachedTo && asset.attachedTo.kind !== 'user_avatar') ||
        (asset.purpose !== 'avatar' &&
          (asset.status === 'attached' ||
            asset.everAttached ||
            asset.attachedTo ||
            asset.attachmentIntent))
      )
        return null;
      return false;
    },
  };
}
