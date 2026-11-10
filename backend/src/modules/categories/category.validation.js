import { z } from 'zod';
import {
  catalogTextPattern,
  cleanText,
  categorySlug,
} from '../../shared/catalog-normalization.js';
import { objectId } from '../auth/auth.validation.js';
const name = z
  .string()
  .transform(cleanText)
  .pipe(z.string().min(1).max(100).regex(catalogTextPattern));
const slug = z
  .string()
  .max(200)
  .transform(categorySlug)
  .pipe(z.string().min(1).max(100).regex(catalogTextPattern));
const fields = {
  name,
  slug: slug.optional(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
};
export const createCategorySchema = z
  .strictObject(fields)
  .refine(
    (value) => Boolean(value.slug || categorySlug(value.name)),
    'Name must produce a slug or supply one',
  );
export const updateCategorySchema = z
  .strictObject(fields)
  .partial()
  .refine((value) => Object.keys(value).length > 0);
export const categoryParams = z.strictObject({ categoryId: objectId });
export const categoryQuery = z.strictObject({
  active: z.literal('true').optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
