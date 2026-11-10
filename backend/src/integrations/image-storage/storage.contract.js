import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { z } from 'zod';
import { StorageError } from './storage.error.js';
export const newImageId = () => randomUUID();
const folders = Object.freeze({
  avatar: 'avatars',
  recipe_cover: 'recipes/covers',
  recipe_step: 'recipes/steps',
});
const uploadSchema = z.strictObject({
  source: z.custom(
    (value) =>
      (Buffer.isBuffer(value) && value.length > 0) ||
      (value instanceof Readable &&
        !value.destroyed &&
        !value.readableEnded &&
        !value.readableObjectMode),
  ),
  purpose: z.enum(['avatar', 'recipe_cover', 'recipe_step']),
  publicId: z.uuidv4().optional(),
});
const referenceSchema = z.strictObject({
  publicId: z.string().min(1).max(250),
  resourceType: z.literal('image'),
  deliveryType: z.enum(['upload', 'authenticated']),
  version: z.number().int().positive().optional(),
});
export const deliveryPresets = Object.freeze({
  avatar: Object.freeze({
    width: 160,
    height: 160,
    crop: 'fill',
    gravity: 'auto',
  }),
  card: Object.freeze({
    width: 480,
    height: 320,
    crop: 'fill',
    gravity: 'auto',
  }),
  cover: Object.freeze({ width: 1200, height: 800, crop: 'limit' }),
  step: Object.freeze({ width: 1000, crop: 'limit' }),
});
export function prepareUpload(input, config) {
  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) throw new StorageError('STORAGE_INVALID_INPUT');
  if (config.IMAGE_DELIVERY_POLICY === 'unresolved')
    throw new StorageError('STORAGE_POLICY_UNRESOLVED');
  const { source, purpose } = parsed.data;
  const id = parsed.data.publicId || newImageId();
  const folder = `${config.CLOUDINARY_ASSET_FOLDER}/${folders[purpose]}`;
  const mode = config.CLOUDINARY_FOLDER_MODE || 'dynamic'; // Fake only; real config requires an explicit mode.
  const type =
    config.IMAGE_DELIVERY_POLICY === 'authenticated'
      ? 'authenticated'
      : 'upload';
  const reference = {
    publicId: mode === 'fixed' ? `${folder}/${id}` : id,
    resourceType: 'image',
    deliveryType: type,
  };
  return {
    source,
    folder,
    reference,
    options: {
      public_id: id,
      resource_type: 'image',
      type,
      overwrite: false,
      unique_filename: false,
      use_filename: false,
      ...(mode === 'dynamic'
        ? { asset_folder: folder, use_asset_folder_as_public_id_prefix: false }
        : { folder }),
    },
  };
}
export function validateReference(input, config) {
  const result = referenceSchema.safeParse(input);
  if (!result.success) throw new StorageError('STORAGE_INVALID_REFERENCE');
  const ref = result.data;
  const mode = config.CLOUDINARY_FOLDER_MODE || 'dynamic';
  let uuid = ref.publicId;
  if (mode === 'fixed') {
    const prefix = Object.values(folders)
      .map((folder) => `${config.CLOUDINARY_ASSET_FOLDER}/${folder}/`)
      .find((prefix) => ref.publicId.startsWith(prefix));
    if (!prefix) throw new StorageError('STORAGE_INVALID_REFERENCE');
    uuid = ref.publicId.slice(prefix.length);
  }
  if (!z.uuidv4().safeParse(uuid).success)
    throw new StorageError('STORAGE_INVALID_REFERENCE');
  return ref;
}
export function deliveryOptions(input, reference, config) {
  const parsed = z
    .strictObject({ preset: z.enum(['avatar', 'card', 'cover', 'step']) })
    .safeParse(input);
  if (!parsed.success) throw new StorageError('STORAGE_INVALID_TRANSFORMATION');
  if (config.IMAGE_DELIVERY_POLICY === 'unresolved')
    throw new StorageError('STORAGE_POLICY_UNRESOLVED');
  // Authenticated delivery needs an access/expiry/cache policy in a future ADR.
  // A permanent signed URL alone is not per-user authorization.
  if (
    config.IMAGE_DELIVERY_POLICY !== 'public' ||
    reference.deliveryType !== 'upload'
  )
    throw new StorageError('STORAGE_PRIVATE_DELIVERY_UNAVAILABLE');
  return {
    secure: true,
    resource_type: 'image',
    type: reference.deliveryType,
    ...(reference.version ? { version: reference.version } : {}),
    transformation: [
      {
        ...deliveryPresets[parsed.data.preset],
        fetch_format: 'auto',
        quality: 'auto',
      },
    ],
  };
}
const metadataSchema = z.object({
  asset_id: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[A-Za-z0-9_-]+$/),
  public_id: z.string(),
  resource_type: z.literal('image'),
  type: z.enum(['upload', 'authenticated']),
  version: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().positive(),
  format: z.enum(['jpg', 'jpeg', 'png', 'webp']),
  secure_url: z.string().url(),
});
export function safeUrl(value, host, cloud) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === host &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.search &&
      !url.hash &&
      url.pathname.startsWith(`/${cloud}/image/`)
    );
  } catch {
    return false;
  }
}
export function normalizeUpload(raw, expected, provider, config) {
  if (raw?.existing === true)
    throw new StorageError('STORAGE_DUPLICATE', 'rejected', expected.reference);
  const result = metadataSchema.safeParse(raw);
  if (!result.success)
    throw new StorageError(
      'STORAGE_INVALID_RESPONSE',
      'unknown',
      expected.reference,
    );
  const m = result.data,
    host = provider === 'fake' ? 'images.invalid' : 'res.cloudinary.com',
    cloud = provider === 'fake' ? 'fake' : config.CLOUDINARY_CLOUD_NAME;
  if (
    m.public_id !== expected.reference.publicId ||
    m.type !== expected.reference.deliveryType ||
    !safeUrl(m.secure_url, host, cloud)
  )
    throw new StorageError(
      'STORAGE_INVALID_RESPONSE',
      'unknown',
      expected.reference,
    );
  return {
    provider,
    providerAssetId: m.asset_id,
    reference: { ...expected.reference, version: m.version },
    assetFolder: expected.folder,
    secureUrl: m.type === 'upload' ? m.secure_url : null,
    width: m.width,
    height: m.height,
    bytes: m.bytes,
    format: m.format,
  };
}
