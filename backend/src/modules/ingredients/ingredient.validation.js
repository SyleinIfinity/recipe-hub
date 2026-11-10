import { z } from 'zod';
import {
  catalogTextPattern,
  cleanText,
  lookupName,
} from '../../shared/catalog-normalization.js';
import { objectId } from '../auth/auth.validation.js';
const text = (max) =>
  z
    .string()
    .transform(cleanText)
    .pipe(z.string().max(max).regex(catalogTextPattern));
const fields = {
  name: text(100).refine((value) => value.length > 0),
  aliases: z
    .array(text(100).refine((value) => value.length > 0))
    .max(20)
    .optional(),
  defaultUnit: text(32).optional(),
  group: text(80).optional(),
  isActive: z.boolean().optional(),
};
export const createIngredientSchema = z.strictObject(fields);
export const updateIngredientSchema = z
  .strictObject(fields)
  .partial()
  .refine((value) => Object.keys(value).length > 0);
export const ingredientParams = z.strictObject({ ingredientId: objectId });
export const ingredientQuery = z.strictObject({
  q: z
    .string()
    .max(100)
    .transform(lookupName)
    .refine((value) => catalogTextPattern.test(value))
    .default(''),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
