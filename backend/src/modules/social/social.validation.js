import { z } from 'zod';
import { paginationFields } from '../recipes/search.validation.js';
export const socialId = z
  .string()
  .length(24)
  .regex(/^[a-f0-9]{24}$/i)
  .transform((v) => v.toLowerCase());
export const plainText = (max, min = 1) =>
  z
    .string()
    .max(max)
    .refine((v) => !/[<>\p{Cc}\p{Cf}]/u.test(v), 'Plain text required')
    .transform((v) => v.normalize('NFC').trim())
    .pipe(z.string().min(min).max(max));
export const version = z
  .number()
  .int()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER - 1);
export const reviewBody = z.strictObject({
  rating: z.number().int().min(1).max(5),
  content: plainText(1000, 0).default(''),
});
export const commentBody = z.strictObject({
  content: plainText(1500),
  parentId: socialId.nullable().default(null),
});
export const commentPatch = z.strictObject({
  content: plainText(1500),
  version,
});
export const reportBody = z.strictObject({
  targetType: z.enum(['recipe', 'comment']),
  targetId: socialId,
  reason: z.enum(['spam', 'abuse', 'copyright', 'other']),
  details: plainText(2000, 0).default(''),
});
export const socialQuery = z.strictObject({
  ...paginationFields,
  sort: z.enum(['createdAt', '-createdAt']).default('-createdAt'),
});
export const commentQuery = z.strictObject({
  ...paginationFields,
  sort: z.enum(['createdAt', '-createdAt']).default('createdAt'),
});
export const reportQuery = z.strictObject({
  ...paginationFields,
  status: z.enum(['pending', 'resolved', 'rejected']).default('pending'),
  sort: z.enum(['createdAt', '-createdAt']).default('-createdAt'),
});
export const recipeParams = z.strictObject({ recipeId: socialId });
export const commentParams = z.strictObject({ commentId: socialId });
export const reportParams = z.strictObject({ reportId: socialId });
export const recipeModerationBody = z.strictObject({
  version,
  status: z.enum(['normal', 'hidden']),
  reason: plainText(500),
});
export const commentModerationBody = z.strictObject({
  version,
  status: z.enum(['visible', 'hidden']),
  reason: plainText(500),
});
export const resolutionBody = z
  .strictObject({
    version,
    resolution: z.enum(['resolved', 'rejected']),
    action: z.enum(['none', 'hide']),
    reason: plainText(500),
    targetVersion: version.optional(),
  })
  .refine(
    (v) => v.resolution !== 'rejected' || v.action === 'none',
    'Rejected report cannot moderate',
  )
  .refine(
    (v) => (v.action === 'hide') === (v.targetVersion !== undefined),
    'targetVersion required only for hide',
  );
export const keyHeaders = z.object({
  'idempotency-key': z.uuidv4().transform((v) => v.toLowerCase()),
});
export const noQuery = z.strictObject({});
export const noBody = z.preprocess(
  (v) => (v === undefined ? {} : v),
  z.strictObject({}),
);
