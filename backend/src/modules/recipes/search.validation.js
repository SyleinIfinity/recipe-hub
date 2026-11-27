import { z } from 'zod';
import { objectId } from '../auth/auth.validation.js';
import { searchTokens } from './search.normalization.js';
const searchId = objectId.pipe(z.string().length(24));
const integer = (min, max) =>
  z
    .union([
      z
        .string()
        .regex(/^(0|[1-9][0-9]*)$/)
        .refine((v) => String(Number(v)) === v)
        .transform(Number),
      z.number(),
    ])
    .pipe(z.number().int().min(min).max(max));
export const paginationFields = {
  page: integer(1, 1000).default(1),
  limit: integer(1, 100).default(20),
};
export const publicAuthorRecipesQuery = z.strictObject(paginationFields);
const plain = (max) =>
  z
    .string()
    .max(max)
    .refine((v) => !/[<>\p{Cc}\p{Cf}]/u.test(v), 'Plain text required')
    .transform((v) => v.normalize('NFC').trim())
    .pipe(z.string().min(1).max(max));
export const searchQuery = z
  .strictObject({
    ...paginationFields,
    sort: z.enum(['publishedAt', '-publishedAt']).default('-publishedAt'),
    q: plain(120)
      .refine((v) => {
        const tokens = searchTokens(v);
        return tokens.length > 0 && tokens.length <= 10;
      }, 'Use 1 to 10 words')
      .optional(),
    category: searchId.optional(),
    tag: plain(40)
      .transform((v) => v.toLowerCase())
      .optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    maxMinutes: integer(0, 2880).optional(),
    ingredientIds: z
      .string()
      .max(499)
      .refine((v) => {
        const ids = v.split(',');
        return (
          ids.length >= 1 &&
          ids.length <= 20 &&
          ids.every((id) => searchId.safeParse(id).success)
        );
      }, 'Use 1 to 20 comma-separated ObjectIds')
      .transform((v) => [...new Set(v.toLowerCase().split(','))].join(','))
      .optional(),
    ingredientMatch: z.enum(['any', 'all']).optional(),
  })
  .refine(
    (v) => !v.ingredientMatch || Boolean(v.ingredientIds),
    'ingredientMatch requires ingredientIds',
  );
