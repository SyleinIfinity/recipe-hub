import { z } from 'zod';
import { objectId } from '../auth/auth.validation.js';
export const mediaStatuses = [
  'pending_upload',
  'temporary',
  'attached',
  'pending_delete',
  'delete_failed',
  'deleted',
];
export const mediaQuery = z.strictObject({
  purpose: z.enum(['avatar', 'recipe_cover', 'recipe_step']).optional(),
  status: z.enum(mediaStatuses).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const mediaParams = z.strictObject({ assetId: objectId });
export const attachmentTarget = z
  .strictObject({
    kind: z.enum(['user_avatar', 'recipe_cover', 'recipe_step']),
    resourceId: objectId,
    stepId: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-zA-Z0-9_-]+$/)
      .optional(),
  })
  .refine((v) => (v.kind === 'recipe_step') === Boolean(v.stepId));
export const targetPurpose = {
  user_avatar: 'avatar',
  recipe_cover: 'recipe_cover',
  recipe_step: 'recipe_step',
};
