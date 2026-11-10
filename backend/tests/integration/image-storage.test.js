import https from 'node:https';
import { afterEach, expect, it, vi } from 'vitest';
import request from 'supertest';
import { v2 as sdk } from 'cloudinary';
import { parseEnv } from '../../src/config/env.js';
import { startServer } from '../../src/server.js';
import { createLogger } from '../../src/config/logger.js';
import { cloudConfig } from '../helpers/cloudinary-sdk.js';

afterEach(() => vi.restoreAllMocks());
it.each(['fake', 'cloudinary'])(
  'CLO-10 startup with %s preserves health without storage calls or media collection',
  async (provider) => {
    const network = vi.spyOn(https, 'request').mockImplementation(() => {
      throw new Error('External network forbidden');
    });
    const upload = vi
      .spyOn(sdk.uploader, 'upload_stream')
      .mockImplementation(() => {
        throw new Error('Upload forbidden');
      });
    const destroy = vi.spyOn(sdk.uploader, 'destroy').mockImplementation(() => {
      throw new Error('Destroy forbidden');
    });
    const config = parseEnv({
      ...(provider === 'cloudinary' ? cloudConfig : {}),
      MEDIA_PROVIDER: provider,
      IMAGE_DELIVERY_POLICY: 'unresolved',
      NODE_ENV: 'test',
      PORT: 0,
      DB_NAME: 'recipe-hub-test',
      MONGODB_URI:
        process.env.TEST_MONGODB_URI ||
        'mongodb://127.0.0.1:27018/recipe-hub-test',
      LOG_LEVEL: 'silent',
      SMTP_ENABLED: 'false',
    });
    const runtime = await startServer(config, createLogger('silent'));
    try {
      expect((await request(runtime.server).get('/health/ready')).status).toBe(
        200,
      );
      expect((await request(runtime.server).get('/api/v1/media')).status).toBe(
        404,
      );
      // BE-08 may already have created the registry in this shared test database.
      // Disabled startup must not initialize its model or issue provider operations.
      expect(runtime.database.connection.models.MediaAsset).toBeUndefined();
      expect(network).not.toHaveBeenCalled();
      expect(upload).not.toHaveBeenCalled();
      expect(destroy).not.toHaveBeenCalled();
    } finally {
      await runtime.shutdown();
    }
  },
);
