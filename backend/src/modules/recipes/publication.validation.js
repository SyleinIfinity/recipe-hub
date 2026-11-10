import { z } from 'zod';
import { createRecipeSchema } from './recipe.validation.js';
import { objectId } from '../auth/auth.validation.js';
import { AppError } from '../../shared/errors.js';
export const transitionSchema = z.strictObject({
  version: z
    .number()
    .int()
    .min(0)
    .max(Number.MAX_SAFE_INTEGER - 1),
});
export { searchQuery as publicRecipeQuery } from './search.validation.js';
export const slugParams = z.strictObject({
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});
export const recipeImageParams = z.strictObject({
  recipeId: objectId,
  assetId: objectId,
});
export function validatePublication(recipe) {
  const data = {};
  for (const key of Object.keys(createRecipeSchema.shape))
    data[key] = recipe[key];
  data.categoryId =
    recipe.categoryId == null ? null : String(recipe.categoryId);
  data.coverImageAssetId =
    recipe.coverImageAssetId == null ? null : String(recipe.coverImageAssetId);
  data.ingredients = recipe.ingredients.map((v) => ({
    ingredientId: v.ingredientId == null ? null : String(v.ingredientId),
    name: v.name,
    quantity: v.quantity,
    unit: v.unit,
    quantityText: v.quantityText,
    note: v.note,
    order: v.order,
  }));
  data.steps = recipe.steps.map((v) => ({
    stepId: v.stepId,
    order: v.order,
    instruction: v.instruction,
    durationMinutes: v.durationMinutes,
    imageAssetId: v.imageAssetId == null ? null : String(v.imageAssetId),
  }));
  const parsed = createRecipeSchema.safeParse(data);
  const details = parsed.success
    ? []
    : parsed.error.issues.map((i) => ({
        field: i.path.join('.'),
        code: i.code,
      }));
  const required = (field, valid, code = 'required') => {
    if (!valid) details.push({ field, code });
  };
  required(
    'title',
    typeof recipe.title === 'string' && recipe.title.trim().length >= 3,
    'too_small',
  );
  required(
    'description',
    typeof recipe.description === 'string' &&
      recipe.description.trim().length >= 10,
    'too_small',
  );
  for (const field of [
    'categoryId',
    'difficulty',
    'servings',
    'prepMinutes',
    'cookMinutes',
  ])
    required(field, recipe[field] != null);
  required('ingredients', recipe.ingredients.length > 0, 'too_small');
  required('steps', recipe.steps.length > 0, 'too_small');
  recipe.ingredients.forEach((v, i) => {
    required(`ingredients.${i}.order`, v.order === i + 1, 'invalid_order');
    required(
      `ingredients.${i}.quantity`,
      v.quantity != null || Boolean(v.quantityText?.trim()),
      'quantity_required',
    );
  });
  recipe.steps.forEach((v, i) => {
    required(`steps.${i}.stepId`, Boolean(v.stepId));
    required(`steps.${i}.order`, v.order === i + 1, 'invalid_order');
    required(
      `steps.${i}.instruction`,
      typeof v.instruction === 'string' && v.instruction.trim().length >= 5,
      'too_small',
    );
  });
  if (details.length)
    throw new AppError(
      422,
      'RECIPE_NOT_PUBLISHABLE',
      'Recipe is not publishable',
      details,
    );
}
export function recipeSlug(title) {
  return (
    title
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 150)
      .replace(/-$/g, '') || 'recipe'
  );
}
