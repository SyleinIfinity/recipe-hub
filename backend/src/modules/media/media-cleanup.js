import { randomUUID } from 'node:crypto';
export const retryDelay = (attempt, base = 1000) =>
  Math.min(3600000, base * 2 ** Math.min(20, Math.max(0, attempt - 1)));
export function createMediaCleanup({
  MediaAsset,
  storage,
  service,
  lifecycle,
  references,
  config,
  logger,
  now = () => new Date(),
}) {
  const max = config.MEDIA_CLEANUP_MAX_ATTEMPTS ?? 5;
  const leaseMs = config.MEDIA_CLEANUP_LEASE_MS ?? 120000;
  const base = config.MEDIA_CLEANUP_RETRY_MS ?? 1000;
  const settle = Math.max(
    60000,
    (config.IMAGE_STORAGE_TIMEOUT_MS ?? 15000) * 4,
  );
  const batchSize = config.MEDIA_CLEANUP_BATCH_SIZE ?? 20;
  let stopped = false,
    running;
  const log = (asset, outcome) =>
    logger?.info(
      { event: 'media_cleanup', assetId: String(asset._id), outcome },
      'Media lifecycle processed',
    );
  const fence = (asset) => ({
    _id: asset._id,
    leaseToken: asset.leaseToken,
    leaseUntil: { $gt: now() },
  });
  async function update(asset, set, unset = {}) {
    return MediaAsset.findOneAndUpdate(
      fence(asset),
      { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { returnDocument: 'after' },
    );
  }
  async function inspect(asset) {
    if (
      asset.provider !== 'fake' ||
      asset.cloudinary.deliveryType !== 'authenticated'
    )
      return { outcome: 'unknown' };
    const r = await storage.inspectImage(
      {
        publicId: asset.cloudinary.publicId,
        resourceType: asset.cloudinary.resourceType,
        deliveryType: asset.cloudinary.deliveryType,
      },
      asset.assetFolder,
    );
    if (r.outcome === 'found') {
      const m = r.asset;
      if (
        m.provider !== asset.provider ||
        m.reference.publicId !== asset.cloudinary.publicId ||
        m.reference.deliveryType !== 'authenticated' ||
        m.assetFolder !== asset.assetFolder ||
        !m.providerAssetId ||
        !m.reference.version ||
        (asset.cloudinary.assetId &&
          m.providerAssetId !== asset.cloudinary.assetId)
      )
        return { outcome: 'unknown' };
    }
    return r;
  }
  async function processAsset(asset) {
    if (asset.attachmentIntent) {
      await lifecycle.reconcileAttachment(asset);
      return 'attachment_reconciled';
    }
    const used = await references.isReferenced(asset);
    if (used !== false) {
      await update(asset, {
        lastErrorCode: used ? 'MEDIA_IN_USE' : 'MEDIA_REFERENCE_UNVERIFIED',
        nextAttemptAt: new Date(+now() + 3600000),
      });
      return 'reference_protected';
    }
    if (asset.status === 'attached') {
      // Worker owns the lease; preserve the grace period when repairing stale denormalization.
      await update(asset, {
        status: 'temporary',
        attachedTo: null,
        everAttached: true,
        expiresAt: new Date(
          +now() + (config.MEDIA_RELEASE_GRACE_MS ?? 30 * 86400000),
        ),
        nextAttemptAt: null,
      });
      return 'released';
    }
    if (asset.status === 'pending_upload') {
      if (asset.uploadOutcome === 'rejected') {
        await update(
          asset,
          { status: 'deleted', lastErrorCode: null },
          { quotaSlot: 1 },
        );
        return 'rejection_confirmed';
      }
      const result = await inspect(asset);
      if (result.outcome === 'found') {
        await update(asset, {
          status: 'temporary',
          uploadOutcome: 'confirmed',
          'cloudinary.assetId': result.asset.providerAssetId,
          'cloudinary.version': result.asset.reference.version,
          expiresAt: new Date(+now() + 86400000),
          lastErrorCode: null,
          nextAttemptAt: null,
        });
        return 'upload_reconciled';
      }
      // Even absent inspection cannot disprove a late upload commit. Preserve the reservation.
      await update(asset, {
        lastErrorCode: 'MEDIA_INSPECTION_UNCERTAIN',
        reconcileAttempts: asset.reconcileAttempts + 1,
        nextAttemptAt: new Date(
          +now() + retryDelay(asset.reconcileAttempts + 1, base),
        ),
      });
      return 'upload_uncertain';
    }
    if (asset.status === 'temporary') {
      asset = await update(asset, {
        status: 'pending_delete',
        deleteRequestedAt: now(),
        nextAttemptAt: now(),
      });
      if (!asset) return 'lease_lost';
    }
    if (!['pending_delete', 'delete_failed'].includes(asset.status))
      return 'ignored';
    if (asset.everAttached && asset.expiresAt > now()) return 'grace_period';
    // Claim attempt durably before touching provider. A crash consumes an attempt, never quota.
    asset = await update(asset, { deleteAttempts: asset.deleteAttempts + 1 });
    if (!asset) return 'lease_lost';
    const result = await inspect(asset);
    if (result.outcome === 'unknown') throw new Error('Unknown provider state');
    if (!(await MediaAsset.exists(fence(asset)))) return 'lease_lost';
    if ((await references.isReferenced(asset)) !== false)
      throw new Error('Reference changed');
    if (result.outcome === 'found') {
      const destroyed = await storage.destroyImage({
        publicId: asset.cloudinary.publicId,
        resourceType: asset.cloudinary.resourceType,
        deliveryType: asset.cloudinary.deliveryType,
      });
      if (
        destroyed.outcome !== 'confirmed' ||
        !['deleted', 'not_found'].includes(destroyed.status)
      )
        throw new Error('Unconfirmed deletion');
    }
    const done = await update(
      asset,
      { status: 'deleted', lastErrorCode: null, nextAttemptAt: null },
      { quotaSlot: 1 },
    );
    return done ? 'deleted' : 'lease_lost';
  }
  async function batch({ dryRun = false, limit = batchSize } = {}) {
    service.assertEnabled();
    if (config.NODE_ENV === 'production')
      throw new Error('Production media worker disabled');
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new Error('Invalid batch limit');
    const date = now();
    const query = {
      provider: 'fake',
      $and: [
        { $or: [{ leaseUntil: null }, { leaseUntil: { $lte: date } }] },
        { $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: date } }] },
        {
          $or: [
            { status: 'temporary', expiresAt: { $lte: date } },
            {
              attachmentIntent: { $ne: null },
              'attachmentIntent.startedAt': { $lte: new Date(+date - settle) },
            },
            { status: 'attached' },
            {
              status: { $in: ['pending_delete', 'delete_failed'] },
              deleteAttempts: { $lt: max },
            },
            {
              status: 'pending_upload',
              updatedAt: { $lte: new Date(+date - settle) },
              $or: [
                { reconcileAttempts: { $lt: max } },
                { reconcileAttempts: { $exists: false } },
              ],
            },
          ],
        },
      ],
    };
    const candidates = await MediaAsset.find(query)
      .sort({ nextAttemptAt: 1, _id: 1 })
      .limit(limit);
    if (dryRun)
      return candidates.map((a) => ({
        assetId: String(a._id),
        outcome: 'candidate',
      }));
    const outcomes = [];
    for (const candidate of candidates) {
      if (stopped) break;
      const asset = await MediaAsset.findOneAndUpdate(
        { ...query, _id: candidate._id },
        {
          $set: {
            leaseToken: randomUUID(),
            leaseUntil: new Date(+now() + leaseMs),
          },
        },
        { returnDocument: 'after' },
      );
      if (!asset) continue;
      let outcome;
      try {
        outcome = await processAsset(asset);
      } catch {
        outcome = 'retry_pending';
        try {
          const current = await MediaAsset.findOne(fence(asset));
          if (current)
            await update(current, {
              ...(['pending_delete', 'delete_failed'].includes(current.status)
                ? { status: 'delete_failed' }
                : {}),
              lastErrorCode: 'MEDIA_CLEANUP_UNCERTAIN',
              nextAttemptAt: new Date(
                +now() +
                  retryDelay(
                    current.deleteAttempts || current.reconcileAttempts + 1,
                    base,
                  ),
              ),
              ...(current.status === 'pending_upload'
                ? { reconcileAttempts: current.reconcileAttempts + 1 }
                : {}),
            });
        } catch {
          /* Durable claim survives; next worker recovers after lease expiry. */
        }
      } finally {
        try {
          await MediaAsset.updateOne(fence(asset), {
            $set: { leaseToken: null, leaseUntil: null },
          });
        } catch {
          /* Lease expires naturally after a database outage. */
        }
      }
      log(asset, outcome);
      outcomes.push({ assetId: String(asset._id), outcome });
    }
    return outcomes;
  }
  return {
    runOnce(options) {
      if (running) return running;
      running = batch(options).finally(() => {
        running = null;
      });
      return running;
    },
    async stop() {
      stopped = true;
      if (running) await running;
    },
  };
}
