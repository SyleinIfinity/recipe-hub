import { objectId } from '../auth/auth.validation.js';
import { z } from 'zod';
import { paginationFields } from '../recipes/search.validation.js';
export const favoriteQuery = z.strictObject(paginationFields);
export const emptyFavoriteBody = z.preprocess(
  (v) => (v === undefined ? {} : v),
  z.strictObject({}),
);
export const emptyFavoriteQuery = z.strictObject({});

export const favoriteParams = z.strictObject({
  recipeId: objectId.pipe(z.string().length(24)),
});
