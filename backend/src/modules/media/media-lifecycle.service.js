import { randomUUID } from 'node:crypto';
import { AppError } from '../../shared/errors.js';
import {
  attachmentTarget,
  targetPurpose,
  mediaQuery,
} from './media-lifecycle.validation.js';
const fail = (status, code, message) => {
  throw new AppError(status, code, message);
};
export function createMediaLifecycle({
  MediaAsset,
  service,
  references,
  config,
  now = () => new Date(),
}) {
  const grace = config.MEDIA_RELEASE_GRACE_MS ?? 30 * 86400000;
  function enabled() {
    service.assertEnabled();
  }
  async function owned(actor, assetId) {
    enabled();
    return service.getOwnedMediaMetadata(actor, assetId);
  }
  async function inUse(asset) {
    const referenced = await references.isReferenced(asset);
    if (
      referenced !== false ||
      asset.attachmentIntent ||
      asset.status === 'attached'
    )
      fail(
        409,
        'MEDIA_IN_USE',
        'Media is in use or awaiting reference reconciliation',
      );
  }
  function targetInput(target, expectedVersion) {
    const parsed = attachmentTarget.safeParse(target);
    if (
      !parsed.success ||
      !Number.isSafeInteger(expectedVersion) ||
      expectedVersion < 0
    )
      fail(422, 'MEDIA_INVALID_TARGET', 'Invalid target or resource version');
    return parsed.data;
  }
  async function validateAttachableAsset(actor, assetId, target) {
    const asset = await owned(actor, assetId);
    if (asset.purpose !== targetPurpose[target.kind])
      fail(422, 'MEDIA_INVALID_PURPOSE', 'Purpose does not match target');
    if (asset.status !== 'temporary' || asset.attachmentIntent)
      fail(409, 'MEDIA_NOT_ATTACHABLE', 'Media cannot be attached');
    if (!asset.expiresAt || asset.expiresAt <= now())
      fail(422, 'MEDIA_EXPIRED', 'Media has expired');
    return asset;
  }
  async function releaseUnreferenced(asset) {
    if ((await references.isReferenced(asset)) !== false) return false;
    return Boolean(
      await MediaAsset.findOneAndUpdate(
        {
          _id: asset._id,
          status: 'attached',
          attachmentIntent: null,
          leaseToken: null,
        },
        {
          $set: {
            status: 'temporary',
            attachedTo: null,
            everAttached: true,
            expiresAt: new Date(+now() + grace),
          },
        },
      ),
    );
  }
  async function reconcileAttachment(asset) {
    const intent = asset.attachmentIntent;
    if (!intent) return false;
    // Fence FIRST: a writer suspended before canonical CAS must never commit after recovery.
    await references.fence(
      intent.target,
      asset.ownerId,
      intent.expectedVersion,
    );
    const canonical = await references.read(intent.target, asset.ownerId);
    const committed = String(canonical.assetId) === String(asset._id);
    const result = await MediaAsset.findOneAndUpdate(
      {
        _id: asset._id,
        'attachmentIntent.token': intent.token,
        status: 'temporary',
      },
      {
        $set: {
          attachmentIntent: null,
          ...(committed
            ? {
                status: 'attached',
                attachedTo: intent.target,
                everAttached: true,
                expiresAt: null,
              }
            : {}),
        },
      },
      { returnDocument: 'after' },
    );
    if (result && committed && intent.oldAssetId) {
      const old = await MediaAsset.findOne({
        _id: intent.oldAssetId,
        ownerId: asset.ownerId,
      });
      if (old) await releaseUnreferenced(old);
    }
    return Boolean(result);
  }
  async function replaceMediaReference(
    actor,
    { assetId, target, expectedVersion },
  ) {
    target = targetInput(target, expectedVersion);
    const asset = await validateAttachableAsset(actor, assetId, target);
    const canonical = await references.read(target, actor.user._id);
    if (canonical.version !== expectedVersion)
      fail(409, 'VERSION_CONFLICT', 'Resource version conflict');
    const token = randomUUID();
    const claimed = await MediaAsset.findOneAndUpdate(
      {
        _id: asset._id,
        ownerId: actor.user._id,
        status: 'temporary',
        expiresAt: { $gt: now() },
        attachmentIntent: null,
        leaseToken: null,
      },
      {
        $set: {
          attachmentIntent: {
            token,
            target,
            expectedVersion,
            oldAssetId: canonical.assetId,
            startedAt: now(),
          },
        },
      },
      { returnDocument: 'after' },
    );
    if (!claimed)
      fail(409, 'MEDIA_NOT_ATTACHABLE', 'Media changed concurrently');
    let committed;
    try {
      committed = await references.compareAndSwap(
        target,
        actor.user._id,
        expectedVersion,
        asset._id,
      );
    } catch {
      fail(
        503,
        'MEDIA_RECONCILIATION_REQUIRED',
        'Reference outcome requires reconciliation',
      );
    }
    if (!committed) {
      // A definite CAS miss cannot later commit. Recovery still owns the token if it raced us.
      await MediaAsset.updateOne(
        { _id: asset._id, 'attachmentIntent.token': token },
        { $set: { attachmentIntent: null } },
      );
      fail(409, 'VERSION_CONFLICT', 'Resource version conflict');
    }
    try {
      const result = await MediaAsset.findOneAndUpdate(
        {
          _id: asset._id,
          status: 'temporary',
          'attachmentIntent.token': token,
        },
        {
          $set: {
            status: 'attached',
            attachedTo: target,
            attachmentIntent: null,
            everAttached: true,
            expiresAt: null,
          },
        },
        { returnDocument: 'after' },
      );
      if (!result) throw new Error('Attachment requires reconciliation');
      if (canonical.assetId) {
        const old = await MediaAsset.findOne({
          _id: canonical.assetId,
          ownerId: actor.user._id,
        });
        if (old) await releaseUnreferenced(old);
      }
      return { asset: result, version: expectedVersion + 1 };
    } catch {
      fail(
        503,
        'MEDIA_RECONCILIATION_REQUIRED',
        'Reference outcome requires reconciliation',
      );
    }
  }
  async function applyReferences(
    actor,
    { before, after, expectedVersion, commit },
  ) {
    const sameTarget = (a, b) =>
      a.kind === b.kind &&
      String(a.resourceId) === String(b.resourceId) &&
      a.stepId === b.stepId;
    if (new Set(after.map((v) => String(v.assetId))).size !== after.length)
      fail(
        422,
        'MEDIA_DUPLICATE_REFERENCE',
        'One image may occupy only one slot',
      );
    const additions = [];
    for (const entry of after) {
      entry.target = targetInput(entry.target, expectedVersion);
      const prior = before.find(
        (v) =>
          String(v.assetId) === String(entry.assetId) &&
          sameTarget(v.target, entry.target),
      );
      if (prior) {
        const asset = await owned(actor, entry.assetId);
        if (asset.purpose !== targetPurpose[entry.target.kind])
          fail(422, 'MEDIA_INVALID_PURPOSE', 'Purpose does not match target');
        if (
          asset.status !== 'attached' ||
          asset.attachmentIntent ||
          !asset.attachedTo ||
          !sameTarget(asset.attachedTo, entry.target)
        )
          fail(
            409,
            'MEDIA_RECONCILIATION_REQUIRED',
            'Retained reference requires reconciliation',
          );
      } else {
        const asset = await validateAttachableAsset(
          actor,
          entry.assetId,
          entry.target,
        );
        additions.push({ ...entry, asset });
      }
    }
    const claimed = [];
    const clear = async () => {
      for (const asset of claimed)
        await MediaAsset.updateOne(
          {
            _id: asset._id,
            'attachmentIntent.token': asset.attachmentIntent.token,
          },
          { $set: { attachmentIntent: null } },
        );
    };
    try {
      for (const entry of additions) {
        const old = before.find((v) => sameTarget(v.target, entry.target));
        const asset = await MediaAsset.findOneAndUpdate(
          {
            _id: entry.asset._id,
            ownerId: actor.user._id,
            status: 'temporary',
            expiresAt: { $gt: now() },
            attachmentIntent: null,
            leaseToken: null,
          },
          {
            $set: {
              attachmentIntent: {
                token: randomUUID(),
                target: entry.target,
                expectedVersion,
                oldAssetId: old?.assetId ?? null,
                startedAt: now(),
              },
            },
          },
          { returnDocument: 'after' },
        );
        if (!asset)
          fail(409, 'MEDIA_NOT_ATTACHABLE', 'Media changed concurrently');
        claimed.push(asset);
      }
    } catch (error) {
      await clear();
      throw error;
    }
    let result;
    try {
      result = await commit();
    } catch {
      fail(
        503,
        'MEDIA_RECONCILIATION_REQUIRED',
        'Canonical outcome requires reconciliation',
      );
    }
    if (!result) {
      await clear();
      fail(409, 'VERSION_CONFLICT', 'Resource version conflict');
    }
    try {
      for (const asset of claimed) {
        const done = await MediaAsset.findOneAndUpdate(
          {
            _id: asset._id,
            status: 'temporary',
            'attachmentIntent.token': asset.attachmentIntent.token,
          },
          {
            $set: {
              status: 'attached',
              attachedTo: asset.attachmentIntent.target,
              attachmentIntent: null,
              everAttached: true,
              expiresAt: null,
            },
          },
          { returnDocument: 'after' },
        );
        if (!done) throw new Error('Attachment finalize conflict');
      }
      for (const entry of before) {
        if (!after.some((v) => String(v.assetId) === String(entry.assetId))) {
          const asset = await owned(actor, entry.assetId);
          await releaseUnreferenced(asset);
        }
      }
    } catch {
      fail(
        503,
        'MEDIA_RECONCILIATION_REQUIRED',
        'Reference outcome requires reconciliation',
      );
    }
    return result;
  }
  return {
    applyReferences,
    validateOwnedAsset: owned,
    validateAttachableAsset,
    replaceMediaReference,
    attachMedia: replaceMediaReference,
    reconcileAttachment,
    releaseUnreferenced,
    async releaseMedia(actor, { assetId, target, expectedVersion }) {
      target = targetInput(target, expectedVersion);
      const asset = await owned(actor, assetId);
      if (asset.purpose !== targetPurpose[target.kind])
        fail(422, 'MEDIA_INVALID_PURPOSE', 'Purpose does not match target');
      const canonical = await references.read(target, actor.user._id);
      if (
        canonical.version !== expectedVersion ||
        String(canonical.assetId) !== String(asset._id)
      )
        fail(409, 'VERSION_CONFLICT', 'Resource version conflict');
      if (
        !(await references.compareAndSwap(
          target,
          actor.user._id,
          expectedVersion,
          null,
        ))
      )
        fail(409, 'VERSION_CONFLICT', 'Resource version conflict');
      await releaseUnreferenced(asset);
      return { version: expectedVersion + 1 };
    },
    async listOwnedMedia(actor, input) {
      enabled();
      if (!actor?.user?._id || actor.user.status !== 'active')
        fail(401, 'UNAUTHENTICATED', 'Authentication required');
      const { page, limit, status, purpose } = mediaQuery.parse(input);
      const filter = {
        ownerId: actor.user._id,
        status: status || { $ne: 'deleted' },
        ...(purpose ? { purpose } : {}),
      };
      const [assets, total] = await Promise.all([
        MediaAsset.find(filter)
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        MediaAsset.countDocuments(filter),
      ]);
      return { assets, meta: { page, limit, total } };
    },
    async requestDeletion(actor, assetId) {
      const asset = await owned(actor, assetId);
      if (asset.status === 'deleted') return asset;
      if (
        config.MEDIA_CLEANUP_ENABLED === false ||
        config.NODE_ENV === 'production'
      )
        fail(503, 'MEDIA_CLEANUP_DISABLED', 'Deletion worker is not enabled');
      await inUse(asset);
      if (['pending_delete', 'delete_failed'].includes(asset.status))
        return asset;
      if (asset.status !== 'temporary' || asset.uploadOutcome !== 'confirmed')
        fail(
          409,
          'MEDIA_RECONCILIATION_REQUIRED',
          'Upload outcome must be reconciled first',
        );
      const queued = await MediaAsset.findOneAndUpdate(
        {
          _id: asset._id,
          status: 'temporary',
          attachmentIntent: null,
          leaseToken: null,
        },
        {
          $set: {
            status: 'pending_delete',
            deleteRequestedAt: now(),
            nextAttemptAt:
              asset.everAttached && asset.expiresAt > now()
                ? asset.expiresAt
                : now(),
          },
        },
        { returnDocument: 'after' },
      );
      if (!queued)
        fail(409, 'MEDIA_STATE_CONFLICT', 'Media changed concurrently');
      return queued;
    },
  };
}
