import { it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { retryDelay } from '../../src/modules/media/media-cleanup.js';
import {
  attachmentTarget,
  mediaQuery,
} from '../../src/modules/media/media-lifecycle.validation.js';
import { createImageStorage } from '../../src/integrations/image-storage/index.js';
import { createStorage } from '../../src/integrations/image-storage/storage.js';
import { parseEnv } from '../../src/config/env.js';
const config = {
  MEDIA_PROVIDER: 'fake',
  IMAGE_DELIVERY_POLICY: 'authenticated',
  CLOUDINARY_FOLDER_MODE: 'dynamic',
  CLOUDINARY_ASSET_FOLDER: 'recipe-hub',
  IMAGE_STORAGE_TIMEOUT_MS: 100,
};
const ref = () => ({
  publicId: randomUUID(),
  resourceType: 'image',
  deliveryType: 'authenticated',
});
it('ML-30 retry exponential backoff caps at one hour', () => {
  expect([1, 2, 3, 100].map((n) => retryDelay(n))).toEqual([
    1000, 2000, 4000, 3600000,
  ]);
});
it.each([
  { kind: 'recipe_step', resourceId: 'a'.repeat(24) },
  { kind: 'recipe_cover', resourceId: 'a'.repeat(24), stepId: 'step-1' },
  { kind: 'recipe_step', resourceId: 'a'.repeat(24), stepId: 0 },
  { kind: 'recipe_step', resourceId: 'a'.repeat(24), stepId: 'step/1' },
  { kind: 'user_avatar', resourceId: 'invalid' },
  { kind: 'user_avatar', resourceId: 'a'.repeat(24), ownerId: 'spoof' },
])('ML-08 stable attachment target rejects %j', (target) => {
  expect(attachmentTarget.safeParse(target).success).toBe(false);
});
it('ML-08 step identity contract accepts stable ID without creating Recipe domain', () => {
  expect(
    attachmentTarget.safeParse({
      kind: 'recipe_step',
      resourceId: 'a'.repeat(24),
      stepId: 'step-uuid_1',
    }).success,
  ).toBe(true);
});
it('ML-55 list defaults match Catalog and unknown fields rejected', () => {
  expect(mediaQuery.parse({})).toEqual({ page: 1, limit: 20 });
  expect(mediaQuery.safeParse({ ownerId: 'a'.repeat(24) }).success).toBe(false);
});
it('ML-41/42 fake inspection distinguishes same-instance confirmed delete from new-instance absence', async () => {
  const first = await createImageStorage(config),
    reference = ref();
  expect(await first.inspectImage(reference, 'recipe-hub/avatars')).toEqual({
    outcome: 'unknown',
  });
  const uploaded = await first.uploadImage({
    source: Buffer.from('synthetic'),
    purpose: 'avatar',
    publicId: reference.publicId,
  });
  expect(await first.inspectImage(reference, 'recipe-hub/avatars')).toEqual({
    outcome: 'found',
    asset: uploaded,
  });
  await first.destroyImage(reference);
  expect(await first.inspectImage(reference, 'recipe-hub/avatars')).toEqual({
    outcome: 'absent',
  });
  expect(
    await (
      await createImageStorage(config)
    ).inspectImage(reference, 'recipe-hub/avatars'),
  ).toEqual({ outcome: 'unknown' });
});
it('ML-70 real inspection unsupported capability is unknown without network', async () => {
  const adapter = createStorage(config, 'cloudinary', {});
  expect(await adapter.inspectImage(ref(), 'recipe-hub/avatars')).toEqual({
    outcome: 'unknown',
  });
});
it('ML-38 inspection timeout retains unknown outcome and strips provider detail', async () => {
  const adapter = await createImageStorage(config, {
    faults: [{ operation: 'inspect', kind: 'timeout' }],
  });
  await expect(
    adapter.inspectImage(ref(), 'recipe-hub/avatars'),
  ).rejects.toMatchObject({ code: 'STORAGE_TIMEOUT', outcome: 'unknown' });
});
it.each([
  'MEDIA_CLEANUP_BATCH_SIZE',
  'MEDIA_CLEANUP_MAX_ATTEMPTS',
  'MEDIA_CLEANUP_RETRY_MS',
  'MEDIA_CLEANUP_LEASE_MS',
  'MEDIA_RELEASE_GRACE_MS',
])('ML-70 invalid worker config %s fails validation', (key) => {
  expect(() =>
    parseEnv({
      NODE_ENV: 'test',
      DB_NAME: 'recipe-hub-test',
      MONGODB_URI: 'mongodb://127.0.0.1:27018/recipe-hub-test',
      [key]: 0,
    }),
  ).toThrow('Invalid environment');
});
