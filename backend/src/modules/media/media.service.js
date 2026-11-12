import { validMediaRoot } from '../../config/cloudinary.js';
import { z } from 'zod';
import { AppError } from '../../shared/errors.js';
import {
  newImageId,
  StorageError,
} from '../../integrations/image-storage/index.js';
import { keySchema, validateImage } from './media.validation.js';
const folder = {
  avatar: 'avatars',
  recipe_cover: 'recipes/covers',
  recipe_step: 'recipes/steps',
};
const unavailable = () =>
  new AppError(
    503,
    'MEDIA_PROVIDER_UNAVAILABLE',
    'Upload unavailable; reuse the same idempotency key when checking the result',
  );
const resultSchema = z.object({
  provider: z.enum(['fake', 'cloudinary']),
  providerAssetId: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/),
  reference: z.object({
    publicId: z.uuidv4(),
    resourceType: z.literal('image'),
    deliveryType: z.literal('authenticated'),
    version: z.number().int().positive(),
  }),
  assetFolder: z.string(),
  secureUrl: z.null(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().positive(),
  format: z.enum(['jpg', 'jpeg', 'png', 'webp']),
});
export function createMediaService({ MediaAsset, storage, config }) {
  function assertEnabled() {
    if (
      !['fake', 'cloudinary'].includes(config.MEDIA_PROVIDER) ||
      (config.MEDIA_PROVIDER === 'cloudinary' &&
        (!config.CLOUDINARY_CLOUD_NAME ||
          !config.CLOUDINARY_API_KEY ||
          !config.CLOUDINARY_API_SECRET ||
          config.CLOUDINARY_FOLDER_MODE !== 'dynamic')) ||
      config.IMAGE_DELIVERY_POLICY !== 'authenticated' ||
      (config.CLOUDINARY_FOLDER_MODE || 'dynamic') !== 'dynamic' ||
      !validMediaRoot(config)
    )
      throw new AppError(
        503,
        'MEDIA_POLICY_UNAVAILABLE',
        'Private upload policy or live provider readiness is not enabled',
      );
  }
  function replay(record, fingerprint) {
    if (record.fingerprint !== fingerprint)
      throw new AppError(
        409,
        'MEDIA_IDEMPOTENCY_CONFLICT',
        'Key already belongs to another upload',
      );
    if (record.status === 'temporary' && record.expiresAt > new Date())
      return record;
    throw new AppError(
      409,
      'MEDIA_UPLOAD_NOT_REPLAYABLE',
      'Upload is pending, expired or rejected; automatic re-upload is not permitted',
    );
  }
  async function reserveUpload(ownerId, purpose, key, image) {
    const prior = await MediaAsset.findOne({ ownerId, idempotencyKey: key });
    if (prior)
      return { record: replay(prior, image.fingerprint), fresh: false };
    const publicId = newImageId();
    for (let quotaSlot = 0; quotaSlot < 20; quotaSlot++) {
      try {
        const record = await MediaAsset.create({
          ownerId,
          purpose,
          provider: config.MEDIA_PROVIDER,
          cloudinary: {
            publicId,
            resourceType: 'image',
            deliveryType: 'authenticated',
          },
          assetFolder: `${config.CLOUDINARY_ASSET_FOLDER}/${folder[purpose]}`,
          format: image.format,
          width: image.width,
          height: image.height,
          bytes: image.bytes,
          idempotencyKey: key,
          fingerprint: image.fingerprint,
          quotaSlot,
        });
        return { record, fresh: true };
      } catch (error) {
        if (error.code !== 11000) throw error;
        const existing = await MediaAsset.findOne({
          ownerId,
          idempotencyKey: key,
        });
        if (existing)
          return { record: replay(existing, image.fingerprint), fresh: false };
        if (!error.keyPattern?.quotaSlot) throw error;
      }
    }
    throw new AppError(
      429,
      'MEDIA_QUOTA_EXCEEDED',
      'At most 20 outstanding uploads are allowed',
    );
  }
  async function markUploadUncertain(record, error) {
    const rejected =
      error instanceof StorageError &&
      error.outcome === 'rejected' &&
      error.code !== 'STORAGE_DUPLICATE';
    const code =
      error instanceof StorageError && /^STORAGE_[A-Z_]{1,60}$/.test(error.code)
        ? error.code
        : 'MEDIA_UPLOAD_UNCERTAIN';
    try {
      await MediaAsset.updateOne(
        { _id: record._id, status: 'pending_upload' },
        {
          $set: {
            uploadOutcome: rejected ? 'rejected' : 'uncertain',
            lastErrorCode: code,
          },
          ...(rejected ? { $unset: { quotaSlot: 1 } } : {}),
        },
      );
    } catch {
      /* Reservation remains durable even if recording the outcome also fails. */
    }
  }
  return {
    assertEnabled,
    async uploadImage(actor, file, purpose, key) {
      assertEnabled();
      if (!actor?.user?._id || actor.user.status !== 'active')
        throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
      if (!keySchema.safeParse(key).success)
        throw new AppError(
          400,
          'MEDIA_INVALID_KEY',
          'Idempotency-Key must be a UUID v4',
        );
      const image = await validateImage(file, purpose);
      const { record, fresh } = await reserveUpload(
        actor.user._id,
        purpose,
        key.toLowerCase(),
        image,
      );
      if (!fresh) return record;
      let result;
      try {
        result = await storage.uploadImage({
          source: image.source,
          purpose,
          publicId: record.cloudinary.publicId,
        });
        const parsed = resultSchema.safeParse(result);
        if (
          !parsed.success ||
          result.provider !== record.provider ||
          result.reference.publicId !== record.cloudinary.publicId ||
          result.assetFolder !== record.assetFolder
        )
          throw new StorageError('STORAGE_INVALID_RESPONSE', 'unknown');
      } catch (error) {
        await markUploadUncertain(record, error);
        throw unavailable();
      }
      try {
        const finalized = await MediaAsset.findOneAndUpdate(
          {
            _id: record._id,
            status: 'pending_upload',
            uploadOutcome: 'pending',
          },
          {
            $set: {
              'cloudinary.assetId': result.providerAssetId,
              'cloudinary.version': result.reference.version,
              status: 'temporary',
              uploadOutcome: 'confirmed',
              expiresAt: new Date(Date.now() + 24 * 3600000),
              lastErrorCode: null,
            },
          },
          { returnDocument: 'after', runValidators: true },
        );
        if (!finalized) throw new Error('Finalize conflict');
        return finalized;
      } catch {
        await markUploadUncertain(
          record,
          new StorageError('STORAGE_DATABASE_FINALIZE', 'unknown'),
        );
        throw new AppError(
          500,
          'MEDIA_FINALIZE_FAILED',
          'Upload result requires reconciliation; preserve the idempotency key',
        );
      }
    },
    async getOwnedMediaMetadata(actor, assetId) {
      if (!actor?.user?._id || actor.user.status !== 'active')
        throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
      if (!/^[a-f\d]{24}$/i.test(String(assetId)))
        throw new AppError(400, 'MEDIA_INVALID_ID', 'Invalid asset ID');
      const asset = await MediaAsset.findOne({
        _id: assetId,
        ownerId: actor.user._id,
      });
      if (!asset) throw new AppError(404, 'MEDIA_NOT_FOUND', 'Media not found');
      return asset;
    },
  };
}
