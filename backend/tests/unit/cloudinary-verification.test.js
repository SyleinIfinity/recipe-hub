import { it, expect } from 'vitest';
import { verifyCloudinary } from '../../scripts/verify-cloudinary.js';
it('P1-U07 missing credentials or fake provider skips all live mutations without values in report', async () => {
  const r = await verifyCloudinary({
    NODE_ENV: 'test',
    MEDIA_PROVIDER: 'cloudinary',
    CLOUDINARY_API_SECRET: 'value-that-must-not-escape',
  });
  expect(r.validation).toBe('invalid_config');
  expect(JSON.stringify(r)).not.toContain('value-that-must-not-escape');
  const fake = await verifyCloudinary({
    NODE_ENV: 'test',
    MEDIA_PROVIDER: 'fake',
    DB_NAME: 'recipe-hub-test',
    MONGODB_URI: 'mongodb://127.0.0.1:27018/recipe-hub-test',
  });
  expect(fake.connection).toBe('blocked_provider_not_selected');
  expect(fake.cleanup).toBe('not_started');
});
it('P1-U10 verification never deletes an existing identifier or mutates production', async () => {
  const env = {
    NODE_ENV: 'test',
    DB_NAME: 'recipe-hub-test',
    MONGODB_URI: 'mongodb://127.0.0.1:27018/recipe-hub-test',
    MEDIA_PROVIDER: 'cloudinary',
    CLOUDINARY_CLOUD_NAME: 'fixture-cloud',
    CLOUDINARY_API_KEY: 'fixture-key',
    CLOUDINARY_API_SECRET: 'fixture-secret',
    CLOUDINARY_FOLDER_MODE: 'dynamic',
    CLOUDINARY_ASSET_FOLDER: 'recipe-hub',
    IMAGE_DELIVERY_POLICY: 'authenticated',
  };
  let mutations = 0;
  const client = {
    api: {
      ping: async () => ({ status: 'ok' }),
      config: async () => ({ settings: { folder_mode: 'dynamic' } }),
      resource: async () => ({}),
    },
    uploader: {
      upload_stream: () => {
        mutations++;
      },
    },
  };
  const existing = await verifyCloudinary(env, {
    client,
    storageFactory: async () => ({
      destroyImage: async () => {
        mutations++;
      },
    }),
  });
  expect(existing.smoke).toBe('blocked_identifier_already_exists');
  expect(mutations).toBe(0);
  expect(existing.cleanup).toBe('not_started');
  const production = await verifyCloudinary(
    {
      ...env,
      NODE_ENV: 'production',
      APP_DOCS_ENABLED: 'false',
      APP_ORIGINS: 'https://fixture.example.test',
      APP_PUBLIC_URL: 'https://fixture.example.test',
      CSRF_SECRET: 'fixture-secret-for-production-guard-123456789',
      COOKIE_SECURE: 'true',
      DB_NAME: 'recipe-hub',
      MONGODB_URI: 'mongodb://127.0.0.1:27019/recipe-hub',
    },
    { client },
  );
  expect(production.smoke).toBe('blocked_safety_preconditions');
  expect(mutations).toBe(0);
});
