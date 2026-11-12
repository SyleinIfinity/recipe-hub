import { authorizedReader } from '../media/authorized-reader.js';
import { AppError, unauthenticated } from '../../shared/errors.js';
export function createUserService({ User, AuditLog, logger }) {
  let media;
  const actorFilter = (actor) => ({
    _id: actor.user._id,
    status: 'active',
    authVersion: actor.session.authVersion,
  });
  async function updateSelf(actor, update) {
    const user = await User.findOneAndUpdate(actorFilter(actor), update, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!user) throw unauthenticated();
    return user;
  }
  return {
    setMedia(value) {
      media = value;
    },
    async readAvatar(userId, assetId) {
      const authorize = async () => {
        const user = await User.findOne({
          _id: userId,
          status: 'active',
          avatarAssetId: assetId,
        });
        const asset =
          user &&
          media?.MediaAsset &&
          (await media.MediaAsset.findOne({
            _id: assetId,
            ownerId: userId,
            purpose: 'avatar',
            status: 'attached',
            uploadOutcome: 'confirmed',
            attachmentIntent: null,
            deleteRequestedAt: null,
            'attachedTo.kind': 'user_avatar',
            'attachedTo.resourceId': userId,
            'cloudinary.deliveryType': 'authenticated',
          }));
        if (!asset)
          throw new AppError(404, 'MEDIA_NOT_FOUND', 'Image not found');
        return asset;
      };
      return authorizedReader(authorize, media?.reader)();
    },
    async getPublicProfile(userId) {
      const user = await User.findOne({ _id: userId, status: 'active' });
      if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
      return user;
    },
    getCurrentProfile: (actor) => actor.user,
    async updateProfile(actor, input) {
      const { mediaVersion, ...fields } = input;
      if (!Object.hasOwn(input, 'avatarAssetId'))
        return updateSelf(actor, { $set: fields });
      if (!media)
        throw new AppError(503, 'MEDIA_NOT_AVAILABLE', 'Media unavailable');
      const old = await User.findOne(actorFilter(actor));
      if (!old) throw unauthenticated();
      if ((old.mediaVersion ?? 0) !== mediaVersion)
        throw new AppError(409, 'VERSION_CONFLICT', 'Avatar changed');
      const target = { kind: 'user_avatar', resourceId: String(old._id) };
      const before = old.avatarAssetId
        ? [{ assetId: String(old.avatarAssetId), target }]
        : [];
      const after = fields.avatarAssetId
        ? [{ assetId: fields.avatarAssetId, target }]
        : [];
      return media.lifecycle.applyReferences(actor, {
        before,
        after,
        expectedVersion: mediaVersion,
        commit: () =>
          User.findOneAndUpdate(
            {
              ...actorFilter(actor),
              ...(mediaVersion === 0
                ? {
                    $or: [
                      { mediaVersion: 0 },
                      { mediaVersion: { $exists: false } },
                    ],
                  }
                : { mediaVersion }),
            },
            { $set: fields, $inc: { mediaVersion: 1 } },
            { returnDocument: 'after', runValidators: true },
          ),
      });
    },
    async updatePreferences(actor, input) {
      const fields = {};
      for (const [key, value] of Object.entries(input)) {
        if (key === 'notificationSettings') {
          for (const [name, enabled] of Object.entries(value))
            fields[`preferences.notificationSettings.${name}`] = enabled;
        } else fields[`preferences.${key}`] = value;
      }
      return updateSelf(actor, { $set: fields });
    },
    async listUsers(actor, { page, limit, status }) {
      if (actor.user.role !== 'admin')
        throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions');
      const filter = status ? { status } : {};
      const [users, total] = await Promise.all([
        User.find(filter)
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        User.countDocuments(filter),
      ]);
      return { users, meta: { page, limit, total } };
    },
    async changeUserStatus(actor, userId, { status, reason }, requestId) {
      if (actor.user.role !== 'admin')
        throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions');
      if (String(actor.user._id) === userId)
        throw new AppError(
          409,
          'SELF_STATUS_CHANGE',
          'Cannot change your own account status',
        );
      const audit = await AuditLog.create({
        actorId: actor.user._id,
        targetId: userId,
        targetType: 'user',
        action: 'user_status_change',
        reason,
        after: { status },
        requestId,
      });
      const user = await User.findOneAndUpdate(
        { _id: userId },
        { $set: { status }, $inc: { authVersion: 1 } },
        { returnDocument: 'after', runValidators: true },
      );
      if (!user) {
        await AuditLog.updateOne(
          { _id: audit._id },
          { $set: { outcome: 'not_found' } },
        );
        throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
      }
      try {
        await AuditLog.updateOne(
          { _id: audit._id },
          { $set: { outcome: 'applied' } },
        );
      } catch {
        logger.error(
          { event: 'audit_outcome_pending', auditId: String(audit._id) },
          'Audit intent requires reconciliation',
        );
      }
      logger.info(
        {
          event: 'user_status_changed',
          actorId: String(actor.user._id),
          userId,
          status,
          requestId,
        },
        'user status changed',
      );
      return user;
    },
  };
}
