import { z } from 'zod';

const credential = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9_-]+$/)
  .refine(
    (value) => !/^(?:your[-_]|example|placeholder|change[-_]?me)/i.test(value),
  );
export const storageEnvFields = {
  MEDIA_PROVIDER: z.enum(['fake', 'cloudinary']).default('fake'),
  CLOUDINARY_CLOUD_NAME: credential.optional(),
  CLOUDINARY_API_KEY: credential.optional(),
  CLOUDINARY_API_SECRET: credential.optional(),
  CLOUDINARY_ASSET_FOLDER: z
    .string()
    .max(120)
    .regex(/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/)
    .default('recipe-hub'),
  CLOUDINARY_FOLDER_MODE: z.enum(['dynamic', 'fixed']).optional(),
  IMAGE_DELIVERY_POLICY: z
    .enum(['unresolved', 'public', 'authenticated'])
    .default('unresolved'),
  IMAGE_STORAGE_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(60000)
    .default(15000),
};
export function refineStorageEnv(env, ctx) {
  if (env.MEDIA_PROVIDER !== 'cloudinary') return;
  for (const key of [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'CLOUDINARY_FOLDER_MODE',
  ]) {
    if (!env[key])
      ctx.addIssue({
        code: 'custom',
        path: [key],
        message: 'Cloudinary configuration required',
      });
  }
}
const schema = z.object(storageEnvFields).superRefine(refineStorageEnv);
export function parseStorageConfig(input) {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error('Invalid image storage configuration');
  return Object.freeze(result.data);
}

export function validMediaRoot(config) {
  return (
    config.CLOUDINARY_ASSET_FOLDER === 'recipe-hub' ||
    (config.NODE_ENV === 'test' &&
      /^recipe-hub\/_verification\/[a-f0-9-]{36}$/i.test(
        config.CLOUDINARY_ASSET_FOLDER,
      ))
  );
}
