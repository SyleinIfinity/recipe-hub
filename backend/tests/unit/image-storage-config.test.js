import { Writable } from 'node:stream';
import https from 'node:https';
import { afterEach, expect, it, vi } from 'vitest';
import { parseStorageConfig } from '../../src/config/cloudinary.js';
import { parseEnv } from '../../src/config/env.js';
import { createLogger } from '../../src/config/logger.js';
import { createImageStorage } from '../../src/integrations/image-storage/index.js';
import { cloudConfig, mockCloudinary } from '../helpers/cloudinary-sdk.js';

afterEach(() => vi.restoreAllMocks());
it('CLO-01 fake is the default and needs no credentials', async () => {
  expect(parseStorageConfig({})).toMatchObject({
    MEDIA_PROVIDER: 'fake',
    IMAGE_DELIVERY_POLICY: 'unresolved',
  });
  const storage = await createImageStorage({ IMAGE_DELIVERY_POLICY: 'public' });
  expect(
    (
      await storage.uploadImage({
        source: Buffer.from('synthetic'),
        purpose: 'avatar',
      })
    ).provider,
  ).toBe('fake');
});
it('CLO-02 accepts explicit real configuration without network', async () => {
  const network = vi.spyOn(https, 'request').mockImplementation(() => {
    throw new Error('Network forbidden');
  });
  expect(parseStorageConfig(cloudConfig).MEDIA_PROVIDER).toBe('cloudinary');
  const { sdk, calls } = mockCloudinary();
  expect(await createImageStorage(cloudConfig, { sdk })).toHaveProperty(
    'uploadImage',
  );
  expect(calls).toEqual([]);
  expect(network).not.toHaveBeenCalled();
});
it.each([
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'CLOUDINARY_FOLDER_MODE',
])('CLO-03..05 missing %s fails before use', async (key) => {
  const config = { ...cloudConfig };
  delete config[key];
  expect(() => parseStorageConfig(config)).toThrow(
    'Invalid image storage configuration',
  );
  await expect(createImageStorage(config)).rejects.toMatchObject({
    code: 'STORAGE_INVALID_CONFIG',
    outcome: 'not_started',
  });
});
it.each([
  '../images',
  '/images',
  'images/',
  'images//avatar',
  'images?x',
  '',
  'a'.repeat(121),
])('CLO-07 rejects unsafe folder %s', (folder) => {
  expect(() =>
    parseStorageConfig({ CLOUDINARY_ASSET_FOLDER: folder }),
  ).toThrow();
});
it.each([
  { CLOUDINARY_FOLDER_MODE: 'auto' },
  { MEDIA_PROVIDER: 'other' },
  { IMAGE_DELIVERY_POLICY: 'draft' },
  { IMAGE_STORAGE_TIMEOUT_MS: 0 },
  { CLOUDINARY_API_SECRET: 'your-secret' },
])('CLO-08 rejects invalid configuration %#', (input) => {
  expect(() => parseStorageConfig(input)).toThrow();
});
it('CLO-06 configuration errors and structured logs redact secrets', () => {
  const secret = 'synthetic sensitive value';
  expect(() =>
    parseStorageConfig({ ...cloudConfig, CLOUDINARY_API_SECRET: secret }),
  ).toThrow('Invalid image storage configuration');
  let output = '';
  const destination = new Writable({
    write(chunk, _encoding, done) {
      output += chunk;
      done();
    },
  });
  createLogger('info', destination).info({
    CLOUDINARY_API_SECRET: secret,
    CLOUDINARY_API_KEY: secret,
    CLOUDINARY_URL: secret,
    api_key: secret,
    api_secret: secret,
  });
  expect(output).toContain('[REDACTED]');
  expect(output).not.toContain(secret);
});
it('application env rejects incomplete real configuration at startup', () => {
  expect(() =>
    parseEnv({
      NODE_ENV: 'test',
      DB_NAME: 'recipe-hub-test',
      MONGODB_URI: 'mongodb://127.0.0.1:27018/recipe-hub-test',
      MEDIA_PROVIDER: 'cloudinary',
    }),
  ).toThrow('Invalid environment fields');
});
it('CLO-09 module import and real factory construction make no request', async () => {
  const network = vi.spyOn(https, 'request').mockImplementation(() => {
    throw new Error('Network forbidden');
  });
  const { createCloudinaryStorage } =
    await import('../../src/integrations/image-storage/cloudinary.storage.js');
  expect(await createCloudinaryStorage(cloudConfig)).toHaveProperty(
    'destroyImage',
  );
  expect(network).not.toHaveBeenCalled();
});
