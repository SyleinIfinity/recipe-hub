import { it, expect } from 'vitest';
import sharp from 'sharp';
import {
  validateImage,
  MiB,
} from '../../src/modules/media/media.validation.js';
import { mediaAssetDTO } from '../../src/modules/media/media.dto.js';
import { createMediaService } from '../../src/modules/media/media.service.js';
import { loadSpec } from '../../src/openapi/docs.js';
const fixture = (format, width = 16, height = 12) =>
  sharp({ create: { width, height, channels: 3, background: 'red' } })
    .toFormat(format)
    .toBuffer();
it.each(['jpeg', 'png', 'webp'])(
  'MED-07..09 decodes and canonicalizes %s with exact metadata',
  async (format) => {
    const buffer = await fixture(format);
    const image = await validateImage(
      { buffer, mime: `image/${format}` },
      'recipe_cover',
    );
    expect(image).toMatchObject({
      width: 16,
      height: 12,
      format: format === 'jpeg' ? 'jpg' : format,
    });
    expect(image.bytes).toBe(image.source.length);
    expect((await sharp(image.source).metadata()).width).toBe(16);
  },
);
it.each(['avatar', 'recipe_cover', 'recipe_step'])(
  'MED-17..19 rejects byte overflow for %s',
  async (purpose) => {
    await expect(
      validateImage(
        {
          buffer: Buffer.alloc((purpose === 'avatar' ? 2 : 5) * MiB + 1),
          mime: 'image/png',
        },
        purpose,
      ),
    ).rejects.toMatchObject({ status: 413 });
  },
);
it.each([
  '<svg/>',
  'GIF89a',
  '%PDF-1.0',
  '<script>alert(1)</script>',
  'MZ executable',
  '',
])('MED-12..16 rejects unsupported bytes %s', async (bytes) => {
  await expect(
    validateImage({ buffer: Buffer.from(bytes), mime: 'image/png' }, 'avatar'),
  ).rejects.toMatchObject({ status: 415 });
});
it('MED-15 rejects valid PNG disguised as JPEG', async () => {
  await expect(
    validateImage(
      { buffer: await fixture('png'), mime: 'image/jpeg' },
      'avatar',
    ),
  ).rejects.toMatchObject({ status: 415 });
});
it('MED-16 full decode rejects truncated pixel data', async () => {
  const b = await fixture('jpeg');
  await expect(
    validateImage(
      { buffer: b.subarray(0, b.length - 40), mime: 'image/jpeg' },
      'avatar',
    ),
  ).rejects.toMatchObject({ status: 415 });
});
it.each([
  [5000, 4001],
  [10001, 1],
])('MED-20 bounds dimensions %sx%s', async (w, h) => {
  await expect(
    validateImage(
      { buffer: await fixture('png', w, h), mime: 'image/png' },
      'recipe_cover',
    ),
  ).rejects.toMatchObject({ status: 422 });
});
it.each([undefined, 'cover', { $ne: null }])(
  'MED-21 rejects invalid purpose %j',
  async (purpose) => {
    await expect(
      validateImage(
        { buffer: await fixture('png'), mime: 'image/png' },
        purpose,
      ),
    ).rejects.toMatchObject({ status: 422 });
  },
);
it('MED-46..49 DTO strips all internal metadata and always has null URL', () => {
  const dto = mediaAssetDTO({
    _id: 'a',
    purpose: 'avatar',
    width: 1,
    height: 1,
    bytes: 1,
    format: 'png',
    status: 'temporary',
    expiresAt: new Date(),
    createdAt: new Date(),
    cloudinary: { publicId: 'secret' },
    secureUrl: 'https://private.invalid',
    ownerId: 'other',
    fingerprint: 'hash',
    quotaSlot: 1,
  });
  expect(Object.keys(dto)).toEqual([
    'assetId',
    'purpose',
    'url',
    'width',
    'height',
    'format',
    'bytes',
    'status',
    'expiresAt',
    'createdAt',
  ]);
  expect(dto.url).toBeNull();
});
it.each([
  { IMAGE_DELIVERY_POLICY: 'public' },
  { IMAGE_DELIVERY_POLICY: 'unresolved' },
  { CLOUDINARY_FOLDER_MODE: 'fixed' },
  { MEDIA_PROVIDER: 'cloudinary' },
  { CLOUDINARY_ASSET_FOLDER: 'other' },
])('MED-47/55 policy fails closed %j', (config) => {
  const service = createMediaService({
    config: {
      MEDIA_PROVIDER: 'fake',
      IMAGE_DELIVERY_POLICY: 'authenticated',
      CLOUDINARY_ASSET_FOLDER: 'recipe-hub',
      ...config,
    },
  });
  expect(() => service.assertEnabled()).toThrow();
});
it('MED-56/59 OpenAPI multipart is closed and private URL is null', () => {
  const spec = loadSpec();
  expect(
    spec.paths['/api/v1/media/images'].post.requestBody.content[
      'multipart/form-data'
    ],
  ).toBeDefined();
  expect(spec.components.schemas.MediaUploadRequest.additionalProperties).toBe(
    false,
  );
  expect(spec.components.schemas.MediaAssetDTO.properties.url).toEqual(
    expect.objectContaining({ type: 'null' }),
  );
  expect(spec.paths['/api/v1/me/media'].get.security).toEqual([
    { SessionCookie: [] },
  ]);
  expect(spec.paths['/api/v1/media/images/{assetId}/content']).toBeUndefined();
});
it('MED-16 removes trailing data and EXIF rather than uploading untrusted original', async () => {
  const original = await sharp(await fixture('jpeg'))
    .withMetadata({ exif: { IFD0: { Artist: 'private name' } } })
    .jpeg()
    .toBuffer();
  const image = await validateImage(
    {
      buffer: Buffer.concat([
        original,
        Buffer.from('private trailing payload'),
      ]),
      mime: 'image/jpeg',
    },
    'avatar',
  );
  expect((await sharp(image.source).metadata()).exif).toBeUndefined();
  expect(image.source.includes(Buffer.from('private trailing payload'))).toBe(
    false,
  );
});
