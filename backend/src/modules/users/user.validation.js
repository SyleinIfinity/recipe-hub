import { z } from 'zod';
import { displayName, objectId } from '../auth/auth.validation.js';
import { dietaryTags } from './user.model.js';
const nonempty = (schema) =>
  schema.refine(
    (value) => Object.keys(value).length > 0,
    'At least one field is required',
  );
export const profileSchema = nonempty(
  z
    .strictObject({
      displayName: displayName.optional(),
      bio: z.string().max(500).optional(),
      avatarAssetId: objectId.nullable().optional(),
      mediaVersion: z
        .number()
        .int()
        .min(0)
        .max(Number.MAX_SAFE_INTEGER - 1)
        .optional(),
    })
    .refine(
      (v) =>
        Object.hasOwn(v, 'avatarAssetId')
          ? v.mediaVersion !== undefined
          : v.mediaVersion === undefined,
      'Avatar update requires mediaVersion',
    ),
);
const ids = z
  .array(objectId)
  .max(100)
  .refine((values) => new Set(values).size === values.length);
export const preferencesSchema = nonempty(
  z.strictObject({
    dietaryTags: z
      .array(z.enum(dietaryTags))
      .max(dietaryTags.length)
      .optional(),
    excludedIngredientIds: ids.optional(),
    favoriteCategoryIds: ids.optional(),
    maxPrepMinutes: z.number().int().min(0).max(1440).nullable().optional(),
    timezone: z
      .string()
      .max(100)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: value });
          return true;
        } catch {
          return false;
        }
      })
      .optional(),
    notificationSettings: z
      .strictObject({
        follows: z.boolean().optional(),
        recipes: z.boolean().optional(),
        comments: z.boolean().optional(),
      })
      .optional(),
    recommendationOptIn: z.boolean().optional(),
  }),
);
export const listUsersSchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'suspended']).optional(),
});
export const statusSchema = z.strictObject({
  status: z.enum(['active', 'suspended']),
  reason: z.string().trim().min(3).max(500),
});
