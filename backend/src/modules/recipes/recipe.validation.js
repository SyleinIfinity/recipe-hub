import { z } from 'zod';
import { objectId } from '../auth/auth.validation.js';
const text = (max, min = 0) =>
  z
    .string()
    .max(max)
    .regex(/^[^<>\p{Cc}\p{Cf}]*$/u)
    .transform((v) => v.normalize('NFC').trim())
    .pipe(z.string().min(min).max(max));
const minutes = z.number().int().min(0).max(1440).nullable();
const ingredient = z.strictObject({
  ingredientId: objectId.nullable().optional(),
  name: text(100, 1),
  quantity: z.number().min(0).max(1e9).nullable().optional(),
  unit: text(32).nullable().optional(),
  quantityText: text(100).nullable().optional(),
  note: text(500).nullable().optional(),
  order: z.number().int().min(1).max(40),
});
const step = z.strictObject({
  stepId: z.uuidv4().optional(),
  order: z.number().int().min(1).max(30),
  instruction: text(2000).optional(),
  durationMinutes: minutes.optional(),
  imageAssetId: objectId.nullable().optional(),
});
const uniqueOrder = (rows) =>
  new Set(rows.map((v) => v.order)).size === rows.length;
const fields = {
  title: text(150).optional(),
  description: text(2000).optional(),
  coverImageAssetId: objectId.nullable().optional(),
  categoryId: objectId.nullable().optional(),
  tags: z
    .array(text(40, 1))
    .max(12)
    .transform((v) => [...new Set(v.map((t) => t.toLowerCase()))])
    .optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).nullable().optional(),
  prepMinutes: minutes.optional(),
  cookMinutes: minutes.optional(),
  servings: z.number().int().min(1).max(100).nullable().optional(),
  ingredients: z
    .array(ingredient)
    .max(40)
    .refine(uniqueOrder, 'Duplicate order')
    .optional(),
  steps: z
    .array(step)
    .max(30)
    .refine(uniqueOrder, 'Duplicate order')
    .refine(
      (v) =>
        new Set(v.filter((s) => s.stepId).map((s) => s.stepId)).size ===
        v.filter((s) => s.stepId).length,
      'Duplicate step ID',
    )
    .optional(),
};
export const createRecipeSchema = z.strictObject(fields);
export const updateRecipeSchema = z
  .strictObject({
    ...fields,
    version: z
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER - 1),
  })
  .refine((v) => Object.keys(v).length > 1, 'Empty update');
export const recipeParams = z.strictObject({ recipeId: objectId });
export const recipeQuery = z.strictObject({
  status: z.enum(['draft', 'published', 'all']).default('draft'),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .enum(['createdAt', '-createdAt', 'updatedAt', '-updatedAt'])
    .default('-updatedAt'),
});
export const createKeySchema = z.object({
  'idempotency-key': z.uuidv4().transform((v) => v.toLowerCase()),
});
