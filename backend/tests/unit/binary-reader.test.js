import { providerError } from '../../src/integrations/image-storage/storage.error.js';
import { it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createBinaryReader } from '../../src/integrations/image-storage/binary-reader.js';
import { createImageStorage } from '../../src/integrations/image-storage/index.js';
import { cloudConfig } from '../helpers/cloudinary-sdk.js';
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
const ref = {
  publicId: randomUUID(),
  resourceType: 'image',
  deliveryType: 'authenticated',
};
const url =
  'https://api.cloudinary.com/v1_1/fixture-cloud/image/download?signature=internal';
const reader = (response, makeUrl = () => url) =>
  createBinaryReader({
    cloudName: 'fixture-cloud',
    makeUrl,
    fetchImpl: vi.fn(async () => response),
  });
it('P1-U01 bounded PNG bytes accepted and internal URL never returned', async () => {
  const response = await reader(
    new Response(png, { headers: { 'Content-Type': 'image/png' } }),
  )(ref, 'png');
  expect(response).toEqual({ buffer: png, contentType: 'image/png' });
  expect(Object.keys(response)).toEqual(['buffer', 'contentType']);
});
it.each([
  'http://api.cloudinary.com/v1_1/fixture-cloud/image/download',
  'https://evil.test/x',
  'https://api.cloudinary.com/v1_1/other/image/download',
  'https://user:secret@api.cloudinary.com/v1_1/fixture-cloud/image/download',
])('P1-U02 rejects unsafe target %s', async (target) => {
  await expect(reader(null, () => target)(ref, 'png')).rejects.toMatchObject({
    code: 'STORAGE_INVALID_RESPONSE',
  });
});
it.each([
  () => new Response(png, { headers: { 'Content-Type': 'text/html' } }),
  () =>
    new Response(png, {
      headers: { 'Content-Type': 'image/png', 'Content-Length': '6000000' },
    }),
  () =>
    new Response(Buffer.from('not PNG'), {
      headers: { 'Content-Type': 'image/png' },
    }),
  () =>
    new Response(new Uint8Array(), {
      headers: { 'Content-Type': 'image/png' },
    }),
  () =>
    new Response(Buffer.alloc(30), {
      headers: { 'Content-Type': 'image/png' },
    }),
])(
  'P1-U03 MIME/header/empty/magic/stream size errors sanitized',
  async (make) => {
    await expect(
      reader(make())(ref, 'png', { maxBytes: 20 }),
    ).rejects.toMatchObject({ code: 'STORAGE_INVALID_RESPONSE' });
  },
);
it.each([401, 404, 503])(
  'P1-U04 upstream%s does not expose URL/body',
  async (status) => {
    await expect(
      reader(new Response('signature private', { status }))(ref, 'png'),
    ).rejects.not.toHaveProperty('url');
  },
);
it('P1-U05 network errors scrubbed and redirects prohibited', async () => {
  const fetchImpl = vi.fn(async () => {
    throw new Error('signed URL and credentials');
  });
  const read = createBinaryReader({
    cloudName: 'fixture-cloud',
    makeUrl: () => url,
    fetchImpl,
  });
  await expect(read(ref, 'png')).rejects.toMatchObject({
    message: 'STORAGE_UNAVAILABLE',
  });
  expect(fetchImpl.mock.calls[0][1].redirect).toBe('error');
});
it('P1-U06 SDK generates signed download only internally with expiry/type and abort propagated', async () => {
  const make = vi.fn(() => url),
    fetchImpl = vi.fn(
      async () =>
        new Response(png, { headers: { 'Content-Type': 'image/png' } }),
    );
  const storage = await createImageStorage(
    { ...cloudConfig, IMAGE_DELIVERY_POLICY: 'authenticated' },
    { sdk: { utils: { private_download_url: make } }, fetchImpl },
  );
  await expect(storage.readImage(ref, 'png')).resolves.toMatchObject({
    contentType: 'image/png',
  });
  expect(make.mock.calls[0][2]).toMatchObject({
    type: 'authenticated',
    upload_prefix: 'https://api.cloudinary.com',
  });
  expect(make.mock.calls[0][2].expires_at).toBeGreaterThan(Date.now() / 1000);
  await expect(
    storage.readImage({ ...ref, deliveryType: 'upload' }, 'png'),
  ).rejects.toMatchObject({ code: 'STORAGE_PRIVATE_DELIVERY_UNAVAILABLE' });
});
it('P1-U08 read timeout aborts transport without raw diagnostics', async () => {
  let aborted = false;
  const storage = await createImageStorage(
    { ...cloudConfig, IMAGE_DELIVERY_POLICY: 'authenticated' },
    {
      sdk: { utils: { private_download_url: () => url } },
      fetchImpl: async (_url, { signal }) =>
        new Promise((_, reject) =>
          signal.addEventListener('abort', () => {
            aborted = true;
            reject(new Error('private URL'));
          }),
        ),
    },
  );
  await expect(storage.readImage(ref, 'png')).rejects.toMatchObject({
    code: 'STORAGE_TIMEOUT',
  });
  expect(aborted).toBe(true);
});
it.each([0, -1, NaN, Infinity])(
  'P1-U09 unsafe byte limit %s rejected before fetch',
  async (maxBytes) => {
    await expect(reader(null)(ref, 'png', { maxBytes })).rejects.toMatchObject({
      code: 'STORAGE_INVALID_INPUT',
    });
  },
);
it('P1-U11 Cloudinary Admin API nested404 is absent, without exposing wrapped error payload', async () => {
  const storage = await createImageStorage(
    { ...cloudConfig, IMAGE_DELIVERY_POLICY: 'authenticated' },
    {
      sdk: {
        api: {
          resource: async () => {
            throw {
              error: { http_code: 404, message: 'private cloud diagnostics' },
            };
          },
        },
      },
    },
  );
  await expect(
    storage.inspectImage(ref, 'recipe-hub/recipes/covers'),
  ).resolves.toEqual({ outcome: 'absent' });
});

it('P1-U12 nested provider errors preserve sanitized status/network classification', () => {
  expect(
    providerError({
      error: { http_code: 401, message: 'private diagnostics' },
    }),
  ).toMatchObject({
    code: 'STORAGE_AUTHENTICATION',
    message: 'STORAGE_AUTHENTICATION',
  });
  expect(
    providerError({ error: { code: 'ECONNRESET', message: 'private URL' } }),
  ).toMatchObject({ code: 'STORAGE_NETWORK' });
});
