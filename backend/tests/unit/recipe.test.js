import { it, expect } from 'vitest';
import {
  createRecipeSchema,
  updateRecipeSchema,
  recipeQuery,
} from '../../src/modules/recipes/recipe.validation.js';
import { ownerRecipeDTO } from '../../src/modules/recipes/recipe.dto.js';
it('RCP-01/19 draft may be empty; Vietnamese NFC tags normalize and deduplicate', () => {
  expect(createRecipeSchema.parse({})).toEqual({});
  expect(
    createRecipeSchema.parse({ title: '  Phở bò  ', tags: ['CƠM', 'cơm'] }),
  ).toEqual({ title: 'Phở bò', tags: ['cơm'] });
});
it.each([
  { title: 'x'.repeat(151) },
  { description: 'x'.repeat(2001) },
  { title: '<script>alert(1)</script>' },
  { title: 'bad\u0000text' },
  { title: {} },
  { tags: Array(13).fill('tag') },
  { tags: ['x'.repeat(41)] },
  { prepMinutes: -1 },
  { cookMinutes: 1441 },
  { prepMinutes: 0.5 },
  { prepMinutes: '10' },
  { prepMinutes: Infinity },
  { servings: 0 },
  { servings: 101 },
  { servings: true },
  { difficulty: 'expert' },
  {
    ingredients: Array.from({ length: 41 }, (_, i) => ({
      name: 'Salt',
      order: i + 1,
    })),
  },
  {
    steps: Array.from({ length: 31 }, (_, i) => ({
      instruction: 'Stir',
      order: i + 1,
    })),
  },
  { ingredients: [{ name: '', order: 1 }] },
  { ingredients: [{ name: 'Salt', quantity: NaN, order: 1 }] },
  { ingredients: [{ name: 'Salt', quantity: -1, order: 1 }] },
  { ingredients: [{ name: 'Salt', unit: 'x'.repeat(33), order: 1 }] },
  { steps: [{ order: 1 }, { order: 1 }] },
  { steps: [{ stepId: '1', order: 1 }] },
  { steps: [{ order: 1, imageUrl: 'https://example.test' }] },
  { categoryId: 'bad' },
  { totalMinutes: 10 },
  { authorId: 'a'.repeat(24) },
  { status: 'published' },
  { moderationStatus: 'normal' },
  { deletedAt: null },
  { publishedAt: null },
  { __v: 0 },
  { version: 0 },
  { creationState: 'complete' },
  JSON.parse('{"__proto__":{"polluted":true}}'),
  { $set: { title: 'Injected' } },
])('RCP-11..20 strict draft rejects %j', (body) => {
  expect(createRecipeSchema.safeParse(body).success).toBe(false);
});
it('RCP-11/12 maximum draft bounds and optional null fields accepted', () => {
  expect(
    createRecipeSchema.safeParse({
      title: 'x'.repeat(150),
      description: 'x'.repeat(2000),
      prepMinutes: 1440,
      cookMinutes: 0,
      servings: 100,
      difficulty: null,
      ingredients: [{ name: 'Muối', quantity: 0, unit: null, order: 1 }],
      steps: [{ order: 1, instruction: '', durationMinutes: null }],
    }).success,
  ).toBe(true);
});
it('RCP-15 duplicate stable step UUID rejected', () => {
  const stepId = '00000000-0000-4000-8000-000000000001';
  expect(
    createRecipeSchema.safeParse({
      steps: [
        { stepId, order: 1 },
        { stepId, order: 2 },
      ],
    }).success,
  ).toBe(false);
});
it('RCP-34 version required and version-only update forbidden', () => {
  expect(updateRecipeSchema.safeParse({ title: 'Draft' }).success).toBe(false);
  expect(updateRecipeSchema.safeParse({ version: 0 }).success).toBe(false);
  expect(updateRecipeSchema.safeParse({ version: 0, title: '' }).success).toBe(
    true,
  );
});
it.each([
  { authorId: 'spoof' },
  { status: 'archived' },
  { sort: 'title' },
  { page: 0 },
  { limit: 101 },
])('RCP-27 list query rejects %j', (q) => {
  expect(recipeQuery.safeParse(q).success).toBe(false);
});
it('owner list defaults to draft and accepts the published and combined views', () => {
  expect(recipeQuery.parse({}).status).toBe('draft');
  for (const status of ['draft', 'published', 'all']) {
    expect(recipeQuery.parse({ status }).status).toBe(status);
  }
});
it('RCP-28/52 DTO whitelists and never uses provider URL', () => {
  const dto = ownerRecipeDTO({
    _id: 'a'.repeat(24),
    ingredients: [],
    steps: [
      {
        stepId: 'step',
        order: 1,
        imageAssetId: 'b'.repeat(24),
        imageUrl: 'https://secret.invalid',
      },
    ],
    coverImageUrl: 'https://secret.invalid',
    creationKey: 'secret',
    attachmentIntent: { token: 'secret' },
    cloudinary: { publicId: 'secret' },
  });
  expect(dto.coverImageUrl).toBeNull();
  expect(dto.steps[0].imageUrl).toBe(
    '/api/v1/recipes/' + 'a'.repeat(24) + '/images/' + 'b'.repeat(24),
  );
  expect(JSON.stringify(dto)).not.toMatch(
    /secret|creationKey|attachmentIntent|cloudinary/,
  );
});
