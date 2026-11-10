import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import https from 'node:https';
import http from 'node:http';
import { Readable, Writable } from 'node:stream';
import {
  createImageStorage,
  newImageId,
} from '../../src/integrations/image-storage/index.js';
import { createFakeStorage } from '../../src/integrations/image-storage/fake.storage.js';
import { providerError } from '../../src/integrations/image-storage/storage.error.js';
import { cloudConfig, mockCloudinary } from '../helpers/cloudinary-sdk.js';
const bytes = Buffer.from('trusted test bytes, decoding belongs to BE-08');
beforeEach(() => {
  vi.spyOn(https, 'request').mockImplementation(() => {
    throw new Error('Network forbidden');
  });
  vi.spyOn(http, 'request').mockImplementation(() => {
    throw new Error('Network forbidden');
  });
});
afterEach(() => {
  expect(https.request).not.toHaveBeenCalled();
  expect(http.request).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});
async function factory(provider, config = {}, faults = []) {
  const harness = mockCloudinary({ faults });
  const storage = await createImageStorage(
    { ...cloudConfig, ...config, MEDIA_PROVIDER: provider },
    { sdk: harness.sdk, faults },
  );
  return { storage, ...harness };
}
describe.each(['fake', 'cloudinary'])('CLO contract parity: %s', (provider) => {
  it.each(['dynamic', 'fixed'])(
    'CLO-11/13/15/16 upload normalized metadata in %s mode',
    async (mode) => {
      const { storage } = await factory(provider, {
        CLOUDINARY_FOLDER_MODE: mode,
      });
      for (const purpose of ['avatar', 'recipe_cover', 'recipe_step']) {
        const result = await storage.uploadImage({ source: bytes, purpose });
        expect(result.provider).toBe(provider);
        expect(result.reference.resourceType).toBe('image');
        expect(result.reference.deliveryType).toBe('upload');
        expect(result.bytes).toBe(bytes.length);
        expect(result.width).toBeGreaterThan(0);
        expect(result.assetFolder).toBe(
          'recipe-hub/' +
            {
              avatar: 'avatars',
              recipe_cover: 'recipes/covers',
              recipe_step: 'recipes/steps',
            }[purpose],
        );
        if (mode === 'fixed')
          expect(
            result.reference.publicId.startsWith(result.assetFolder + '/'),
          ).toBe(true);
        else expect(result.reference.publicId).toMatch(/^[a-f\d-]{36}$/);
        expect(JSON.stringify(result)).not.toContain('ignored_secret');
      }
    },
  );
  it('CLO-17/18 duplicate ID is rejected and concurrent calls have one winner', async () => {
    const { storage } = await factory(provider),
      publicId = newImageId();
    const results = await Promise.allSettled(
      [1, 2].map(() =>
        storage.uploadImage({ source: bytes, purpose: 'avatar', publicId }),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected').reason.code).toBe(
      'STORAGE_DUPLICATE',
    );
  });
  it('CLO-21/22 destroy confirms deletion and repeat not-found', async () => {
    const { storage } = await factory(provider),
      result = await storage.uploadImage({
        source: bytes,
        purpose: 'recipe_step',
      });
    expect(await storage.destroyImage(result.reference)).toEqual({
      status: 'deleted',
      outcome: 'confirmed',
    });
    expect(await storage.destroyImage(result.reference)).toEqual({
      status: 'not_found',
      outcome: 'confirmed',
    });
  });
  it.each(['upload', 'destroy'])(
    'CLO-12/22 %s failures are sanitized',
    async (operation) => {
      const { storage } = await factory(provider, {}, [
        {
          operation,
          kind: 'error',
          error: { http_code: 401, message: 'secret diagnostic' },
        },
      ]);
      const action =
        operation === 'upload'
          ? storage.uploadImage({ source: bytes, purpose: 'avatar' })
          : storage.destroyImage({
              publicId: newImageId(),
              resourceType: 'image',
              deliveryType: 'upload',
            });
      await expect(action).rejects.toMatchObject({
        code: 'STORAGE_AUTHENTICATION',
        outcome: 'rejected',
      });
      await action.catch((e) =>
        expect(String(e) + JSON.stringify(e)).not.toContain(
          'secret diagnostic',
        ),
      );
    },
  );
  it.each(['upload', 'destroy'])(
    'CLO-20/24 invalid %s response is unknown, never success',
    async (operation) => {
      const { storage } = await factory(provider, {}, [
        { operation, kind: 'invalid_response' },
      ]);
      const action =
        operation === 'upload'
          ? storage.uploadImage({ source: bytes, purpose: 'avatar' })
          : storage.destroyImage({
              publicId: newImageId(),
              resourceType: 'image',
              deliveryType: 'upload',
            });
      await expect(action).rejects.toMatchObject({
        code: 'STORAGE_INVALID_RESPONSE',
        outcome: 'unknown',
        reference: expect.any(Object),
      });
    },
  );
  it.each(['upload', 'destroy'])(
    'CLO-23 %s timeout is unknown',
    async (operation) => {
      const { storage } = await factory(provider, {}, [
        { operation, kind: 'timeout' },
      ]);
      const action =
        operation === 'upload'
          ? storage.uploadImage({ source: bytes, purpose: 'avatar' })
          : storage.destroyImage({
              publicId: newImageId(),
              resourceType: 'image',
              deliveryType: 'upload',
            });
      await expect(action).rejects.toMatchObject({
        code: 'STORAGE_TIMEOUT',
        outcome: 'unknown',
        reference: expect.any(Object),
      });
    },
  );
  it('CLO-24 timeout may follow a committed upload; retry cannot overwrite', async () => {
    const { storage } = await factory(provider, {}, [
        { operation: 'upload', kind: 'commit_timeout' },
      ]),
      publicId = newImageId();
    await expect(
      storage.uploadImage({ source: bytes, purpose: 'avatar', publicId }),
    ).rejects.toMatchObject({ outcome: 'unknown', reference: { publicId } });
    await expect(
      storage.uploadImage({ source: bytes, purpose: 'avatar', publicId }),
    ).rejects.toMatchObject({ code: 'STORAGE_DUPLICATE' });
  });
  it('CLO-26..29 controlled versioned HTTPS URLs, no arbitrary transformations', async () => {
    const { storage } = await factory(provider),
      result = await storage.uploadImage({
        source: bytes,
        purpose: 'recipe_cover',
      });
    for (const preset of ['avatar', 'card', 'cover', 'step']) {
      const url = storage.buildDeliveryUrl(result.reference, { preset });
      expect(url).toMatch(/^https:/);
      expect(url).toContain('/v1/');
      expect(url).toContain('f_auto');
      expect(url).toContain('q_auto');
      expect(url).not.toContain(cloudConfig.CLOUDINARY_API_SECRET);
    }
    expect(() =>
      storage.buildDeliveryUrl(result.reference, {
        preset: 'card',
        transformation: { fetch: 'http://evil.test' },
      }),
    ).toThrow('STORAGE_INVALID_TRANSFORMATION');
  });
  it('CLO-30 unresolved privacy does not upload or publish a URL', async () => {
    const { storage, calls } = await factory(provider, {
      IMAGE_DELIVERY_POLICY: 'unresolved',
    });
    await expect(
      storage.uploadImage({ source: bytes, purpose: 'avatar' }),
    ).rejects.toMatchObject({
      code: 'STORAGE_POLICY_UNRESOLVED',
      outcome: 'not_started',
    });
    expect(() =>
      storage.buildDeliveryUrl(
        {
          publicId: newImageId(),
          resourceType: 'image',
          deliveryType: 'upload',
        },
        { preset: 'card' },
      ),
    ).toThrow('STORAGE_POLICY_UNRESOLVED');
    expect(calls).toHaveLength(0);
  });
  it('CLO-30 authenticated asset never becomes public or receives a permanent signed URL implicitly', async () => {
    const { storage } = await factory(provider, {
      IMAGE_DELIVERY_POLICY: 'authenticated',
    });
    const result = await storage.uploadImage({
      source: bytes,
      purpose: 'avatar',
    });
    expect(result.reference.deliveryType).toBe('authenticated');
    expect(result.secureUrl).toBeNull();
    expect(() =>
      storage.buildDeliveryUrl(result.reference, { preset: 'avatar' }),
    ).toThrow('STORAGE_PRIVATE_DELIVERY_UNAVAILABLE');
    const publicStorage = (await factory(provider)).storage;
    expect(() =>
      publicStorage.buildDeliveryUrl(result.reference, { preset: 'avatar' }),
    ).toThrow('STORAGE_PRIVATE_DELIVERY_UNAVAILABLE');
  });
  it('CLO-17 input rejects remote URLs, filenames, injected folders and transforms', async () => {
    const { storage, calls } = await factory(provider);
    for (const input of [
      { source: 'https://example.test/image.png', purpose: 'avatar' },
      { source: bytes, purpose: 'other' },
      { source: bytes, purpose: 'avatar', publicId: 'my-file.jpg' },
      { source: bytes, purpose: 'avatar', folder: '../other' },
      { source: bytes, purpose: 'avatar', overwrite: true },
    ])
      await expect(storage.uploadImage(input)).rejects.toMatchObject({
        code: 'STORAGE_INVALID_INPUT',
      });
    for (const publicId of ['https://example.test/image', '../a', 'a/../b'])
      await expect(
        storage.destroyImage({
          publicId,
          resourceType: 'image',
          deliveryType: 'upload',
        }),
      ).rejects.toMatchObject({ code: 'STORAGE_INVALID_REFERENCE' });
    expect(calls).toHaveLength(0);
  });
  it('source stream failure settles once and is sanitized', async () => {
    const { storage } = await factory(provider);
    const source = new Readable({
      read() {
        this.destroy(new Error('private source details'));
      },
    });
    await expect(
      storage.uploadImage({ source, purpose: 'avatar' }),
    ).rejects.toMatchObject({
      code: 'STORAGE_STREAM_FAILED',
      outcome: 'unknown',
    });
  });
  it('stalled readable is destroyed at deadline', async () => {
    const { storage } = await factory(provider);
    const source = new Readable({ read() {} });
    await expect(
      storage.uploadImage({ source, purpose: 'avatar' }),
    ).rejects.toMatchObject({ code: 'STORAGE_TIMEOUT' });
    expect(source.destroyed).toBe(true);
  });
});
it('CLO-14 SDK receives signed, explicit options and per-request TLS agent without global config', async () => {
  const { storage, calls } = await factory('cloudinary');
  const result = await storage.uploadImage({
    source: bytes,
    purpose: 'recipe_cover',
  });
  const options = calls[0].options;
  expect(options).toMatchObject({
    asset_folder: 'recipe-hub/recipes/covers',
    resource_type: 'image',
    overwrite: false,
    use_filename: false,
    unsigned: false,
    upload_preset: '',
    disable_promises: true,
    upload_prefix: 'https://api.cloudinary.com',
  });
  expect(options).not.toHaveProperty('folder');
  expect(options).not.toHaveProperty('transformation');
  expect(options.agent.options.rejectUnauthorized).toBe(true);
  await storage.destroyImage(result.reference);
  expect(calls[1].options).toMatchObject({
    invalidate: true,
    resource_type: 'image',
    type: 'upload',
  });
});
it('SDK destination stream error and synchronous throw are handled', async () => {
  const { storage } = await factory('cloudinary', {}, [
    { operation: 'upload', kind: 'stream_error' },
  ]);
  await expect(
    storage.uploadImage({ source: bytes, purpose: 'avatar' }),
  ).rejects.toMatchObject({ code: 'STORAGE_STREAM_FAILED' });
  const sdk = {
    uploader: {
      upload_stream() {
        throw { http_code: 403, message: 'private' };
      },
    },
  };
  const other = await createImageStorage(cloudConfig, { sdk });
  await expect(
    other.uploadImage({ source: bytes, purpose: 'avatar' }),
  ).rejects.toMatchObject({ code: 'STORAGE_PERMISSION' });
});
it('fake instance state is isolated', async () => {
  const config = { IMAGE_DELIVERY_POLICY: 'public' };
  const a = createFakeStorage(config),
    b = createFakeStorage(config),
    publicId = newImageId();
  await expect(
    a.uploadImage({ source: bytes, purpose: 'avatar', publicId }),
  ).resolves.toBeDefined();
  await expect(
    b.uploadImage({ source: bytes, purpose: 'avatar', publicId }),
  ).resolves.toBeDefined();
});
it.each([
  [400, 'STORAGE_INVALID_INPUT', 'rejected'],
  [401, 'STORAGE_AUTHENTICATION', 'rejected'],
  [403, 'STORAGE_PERMISSION', 'rejected'],
  [409, 'STORAGE_DUPLICATE', 'rejected'],
  [413, 'STORAGE_QUOTA_EXCEEDED', 'rejected'],
  [415, 'STORAGE_UNSUPPORTED_RESOURCE', 'rejected'],
  [420, 'STORAGE_RATE_LIMITED', 'rejected'],
  [429, 'STORAGE_RATE_LIMITED', 'rejected'],
  [499, 'STORAGE_TIMEOUT', 'unknown'],
  [503, 'STORAGE_UNAVAILABLE', 'unknown'],
])(
  'error %s normalizes without raw diagnostics',
  (http_code, code, outcome) => {
    const error = providerError({
      http_code,
      message: 'credential private',
      headers: { authorization: 'private' },
    });
    expect(error).toMatchObject({ code, outcome });
    expect(JSON.stringify(error) + String(error)).not.toContain('private');
  },
);
it('network failures remain unknown; quota and unrecognized responses are distinguished', () => {
  expect(providerError({ code: 'ECONNRESET' })).toMatchObject({
    code: 'STORAGE_NETWORK',
    outcome: 'unknown',
  });
  expect(
    providerError({ http_code: 400, message: 'File size too large' }),
  ).toMatchObject({ code: 'STORAGE_QUOTA_EXCEEDED', outcome: 'rejected' });
  expect(providerError(new Error('secret'))).toMatchObject({
    code: 'STORAGE_UNKNOWN_OUTCOME',
    outcome: 'unknown',
  });
});

it('late SDK success cannot turn a timeout into success', async () => {
  let callback;
  const destination = new Writable({
    write(_chunk, _encoding, done) {
      done();
    },
  });
  const sdk = {
    uploader: {
      upload_stream(_options, done) {
        callback = done;
        return destination;
      },
    },
  };
  const storage = await createImageStorage(cloudConfig, { sdk });
  const action = storage.uploadImage({ source: bytes, purpose: 'avatar' });
  await expect(action).rejects.toMatchObject({
    code: 'STORAGE_TIMEOUT',
    outcome: 'unknown',
  });
  expect(() => callback(null, { private: 'late response' })).not.toThrow();
  await expect(action).rejects.toMatchObject({ code: 'STORAGE_TIMEOUT' });
});
it('synchronous SDK callback rejection stops the source and destination', async () => {
  const source = new Readable({ read() {} });
  const destination = new Writable({
    write(_chunk, _encoding, done) {
      done();
    },
  });
  const sdk = {
    uploader: {
      upload_stream(_options, done) {
        done({ http_code: 401 });
        return destination;
      },
    },
  };
  const storage = await createImageStorage(cloudConfig, { sdk });
  await expect(
    storage.uploadImage({ source, purpose: 'avatar' }),
  ).rejects.toMatchObject({ code: 'STORAGE_AUTHENTICATION' });
  expect(source.destroyed).toBe(true);
  expect(destination.destroyed).toBe(true);
});
