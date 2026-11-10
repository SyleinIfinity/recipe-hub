import { it, expect } from 'vitest';
import mongoose from 'mongoose';
import {
  cleanText,
  lookupName,
  categorySlug,
  escapeRegex,
} from '../../src/shared/catalog-normalization.js';
import { normalizeIngredient } from '../../src/modules/ingredients/ingredient.normalization.js';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../../src/modules/categories/category.validation.js';
import {
  createIngredientSchema,
  ingredientQuery,
  updateIngredientSchema,
} from '../../src/modules/ingredients/ingredient.validation.js';
import { createCategoryModel } from '../../src/modules/categories/category.model.js';
import { createIngredientModel } from '../../src/modules/ingredients/ingredient.model.js';
import { requireCatalogAdmin } from '../../src/shared/catalog-policy.js';

it('CAT-08/09 and ING-05/07 normalize Unicode/whitespace/case without removing Vietnamese accents', () => {
  const value = '  THỊT   LỢN  '.normalize('NFD');
  expect(cleanText(value)).toBe('THỊT LỢN');
  expect(lookupName(value)).toBe('thịt lợn');
  expect(lookupName(lookupName(value))).toBe('thịt lợn');
  expect(lookupName('thịt')).not.toBe(lookupName('thit'));
  expect(categorySlug(' Món   Ăn / Việt ')).toBe('món-ăn-việt');
});
it('ING-08/09 deduplicates aliases and removes canonical self alias deterministically', () => {
  expect(
    normalizeIngredient('Thịt heo', [' Thịt lợn ', 'THỊT LỢN', 'thịt heo']),
  ).toEqual({
    name: 'Thịt heo',
    normalizedName: 'thịt heo',
    aliases: ['Thịt lợn'],
    lookupKeys: ['thịt heo', 'thịt lợn'],
  });
});
it('CAT-06/11 strict validation rejects protected fields, operators and empty PATCH', () => {
  for (const body of [
    { name: '' },
    { name: ' ' },
    { name: { $ne: null } },
    { name: 'a', sortOrder: 1.5 },
    { name: 'a', isActive: 'true' },
    { name: 'a', createdAt: 'today' },
    { name: 'a', slug: '***' },
  ])
    expect(createCategorySchema.safeParse(body).success).toBe(false);
  expect(updateCategorySchema.safeParse({}).success).toBe(false);
  expect(
    createCategorySchema.safeParse({
      name: 'a'.repeat(100),
      description: 'x'.repeat(1000),
      sortOrder: 100000,
    }).success,
  ).toBe(true);
  expect(
    createCategorySchema.safeParse({ name: 'a'.repeat(101) }).success,
  ).toBe(false);
});
it('ING-18 validates name, alias and unit boundaries without accepting internal lookup fields', () => {
  for (const body of [
    { name: '' },
    { name: 42 },
    { name: 'a', aliases: [''] },
    { name: 'a', aliases: Array(21).fill('alias') },
    { name: 'a', normalizedName: 'override' },
    { name: 'a', lookupKeys: ['override'] },
    { name: 'a', defaultUnit: 'x'.repeat(33) },
  ])
    expect(createIngredientSchema.safeParse(body).success).toBe(false);
  expect(updateIngredientSchema.safeParse({}).success).toBe(false);
  expect(
    createIngredientSchema.safeParse({
      name: 'a'.repeat(100),
      aliases: ['b'.repeat(100)],
      group: 'x'.repeat(80),
      defaultUnit: 'muỗng',
    }).success,
  ).toBe(true);
});
it('ING-16 escapes every regex metacharacter literally', () => {
  const value = 'a.*+?^${}()|[]\\';
  const regex = new RegExp(`^${escapeRegex(value)}`);
  expect(regex.test(value)).toBe(true);
  expect(regex.test('anything')).toBe(false);
});
it('model validation/defaults agree with normalized ingredient and category contracts', async () => {
  const connection = mongoose.createConnection();
  const Category = createCategoryModel(connection);
  const Ingredient = createIngredientModel(connection);
  const category = new Category({ name: ' A ', slug: ' A ' });
  await category.validate();
  expect(category.isActive).toBe(true);
  expect(category.sortOrder).toBe(0);
  expect(category.slug).toBe('a');
  const ingredient = new Ingredient({
    name: ' THỊT ',
    aliases: ['Thịt', 'Heo', 'HEO'],
  });
  await ingredient.validate();
  expect(ingredient.normalizedName).toBe('thịt');
  expect(ingredient.aliases).toEqual(['Heo']);
  expect(ingredient.lookupKeys).toEqual(['thịt', 'heo']);
  await expect(
    new Category({ name: 'x'.repeat(101), slug: 'x' }).validate(),
  ).rejects.toThrow();
});
it('service role policy rejects guest/user/suspended admin', () => {
  for (const actor of [
    null,
    { user: { role: 'user', status: 'active' } },
    { user: { role: 'admin', status: 'suspended' } },
  ])
    expect(() => requireCatalogAdmin(actor)).toThrow();
  expect(() =>
    requireCatalogAdmin({ user: { role: 'admin', status: 'active' } }),
  ).not.toThrow();
});

it('catalog rejects hidden control characters in names and search query', () => {
  expect(createCategorySchema.safeParse({ name: 'a\u0000b' }).success).toBe(
    false,
  );
  expect(createIngredientSchema.safeParse({ name: 'a\u200Bb' }).success).toBe(
    false,
  );
  expect(ingredientQuery.safeParse({ q: 'a\u0000b' }).success).toBe(false);
});
