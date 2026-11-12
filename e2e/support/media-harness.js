import { randomUUID } from 'node:crypto';
import { v2 as sdk } from 'cloudinary';
import { createAccountHarness } from './account-harness.js';
import { createImageStorage } from '../../backend/src/integrations/image-storage/index.js';
import {
  mockCloudinary,
  cloudConfig,
} from '../../backend/tests/helpers/cloudinary-sdk.js';
export async function createMediaHarness({ live = false } = {}) {
  const namespace = `recipe-hub/_verification/${randomUUID()}`;
  const credentials = live
    ? Object.fromEntries(
        [
          'CLOUDINARY_CLOUD_NAME',
          'CLOUDINARY_API_KEY',
          'CLOUDINARY_API_SECRET',
        ].map((k) => [k, process.env[k]]),
      )
    : cloudConfig;
  if (live) {
    if (
      process.env.RUN_CLOUDINARY_LIVE !== '1' ||
      process.env.NODE_ENV === 'production' ||
      process.env.CLOUDINARY_FOLDER_MODE !== 'dynamic' ||
      process.env.IMAGE_DELIVERY_POLICY !== 'authenticated'
    )
      throw new Error('LIVE_SAFETY_PRECONDITIONS');
    const options = {
      cloud_name: credentials.CLOUDINARY_CLOUD_NAME,
      api_key: credentials.CLOUDINARY_API_KEY,
      api_secret: credentials.CLOUDINARY_API_SECRET,
      upload_prefix: 'https://api.cloudinary.com',
      secure: true,
      timeout: 15000,
    };
    try {
      const ping = await sdk.api.ping(options),
        remote = await sdk.api.config({ ...options, settings: true });
      if (ping.status !== 'ok' || remote.settings?.folder_mode !== 'dynamic')
        throw new Error();
    } catch {
      throw new Error('LIVE_READONLY_CHECK_FAILED');
    }
  }
  const overrides = {
    ...credentials,
    NODE_ENV: 'test',
    MEDIA_PROVIDER: 'cloudinary',
    IMAGE_DELIVERY_POLICY: 'authenticated',
    CLOUDINARY_FOLDER_MODE: 'dynamic',
    CLOUDINARY_ASSET_FOLDER: namespace,
    IMAGE_STORAGE_TIMEOUT_MS: 15000,
    MEDIA_CLEANUP_ENABLED: 'false',
  };
  const stub = live ? null : mockCloudinary();
  const faults = { read: null };
  const storage = await createImageStorage(
    overrides,
    live
      ? {}
      : {
          sdk: stub.sdk,
          fetchImpl: async (url) => {
            if (faults.read === 'unavailable')
              throw new Error('Synthetic unavailable');
            if (faults.beforeRead) {
              const hook = faults.beforeRead;
              faults.beforeRead = null;
              await hook();
            }
            const bytes = stub.buffers.get(
              'authenticated/' + url.searchParams.get('public_id'),
            );
            return new Response(
              faults.read === 'invalid' ? Buffer.from('invalid') : bytes,
              {
                status: bytes ? 200 : 404,
                headers: {
                  'Content-Type':
                    faults.read === 'invalid' ? 'text/html' : 'image/png',
                },
              },
            );
          },
        },
  );
  const harness = await createAccountHarness({
    configOverrides: overrides,
    storage,
  });
  async function cleanupOwned(emails) {
    const ids = (
        await harness.identity.models.User.find({ email: { $in: emails } })
      ).map((u) => u._id),
      assets = await harness.media.MediaAsset.find({ ownerId: { $in: ids } });
    // Only this process's test-owned namespace/owners; never start a global cleanup worker.
    const failures = [];
    await harness.recipes.Recipe.deleteMany({ authorId: { $in: ids } });
    await harness.identity.models.User.updateMany(
      { _id: { $in: ids } },
      { $set: { avatarAssetId: null } },
    );
    for (const asset of assets) {
      if (!asset.assetFolder.startsWith(namespace + '/')) {
        failures.push({
          assetId: String(asset._id),
          status: 'namespace_mismatch',
        });
        continue;
      }
      const reference = {
        publicId: asset.cloudinary.publicId,
        resourceType: 'image',
        deliveryType: 'authenticated',
      };
      try {
        if (live) {
          let metadata;
          try {
            metadata = await sdk.api.resource(reference.publicId, {
              cloud_name: credentials.CLOUDINARY_CLOUD_NAME,
              api_key: credentials.CLOUDINARY_API_KEY,
              api_secret: credentials.CLOUDINARY_API_SECRET,
              resource_type: 'image',
              type: 'authenticated',
              upload_prefix: 'https://api.cloudinary.com',
              secure: true,
              timeout: 15000,
            });
          } catch (error) {
            if ((error?.http_code ?? error?.error?.http_code) !== 404)
              throw error;
          }
          if (
            metadata &&
            (metadata.asset_folder !== asset.assetFolder ||
              (asset.cloudinary.assetId &&
                metadata.asset_id !== asset.cloudinary.assetId))
          )
            throw new Error('PROVIDER_OWNERSHIP_MISMATCH');
        }
        await storage.destroyImage(reference);
        const absent = await storage.inspectImage(reference, asset.assetFolder);
        if (absent.outcome !== 'absent') throw new Error();
        await harness.media.MediaAsset.deleteOne({
          _id: asset._id,
          ownerId: asset.ownerId,
        });
      } catch {
        failures.push({
          assetId: String(asset._id),
          status: 'cleanup_incomplete',
        });
      }
    }
    if (!failures.length)
      for (const email of emails) await harness.cleanup(email);
    return {
      status: failures.length ? 'cleanup_incomplete' : 'verified',
      testOwnedAssets: assets.length,
      remaining: failures,
    };
  }
  return { ...harness, storage, faults, live, cleanupOwned };
}
