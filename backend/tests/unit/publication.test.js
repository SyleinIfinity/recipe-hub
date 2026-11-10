import { it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  recipeSlug,
  validatePublication,
  transitionSchema,
  publicRecipeQuery,
} from '../../src/modules/recipes/publication.validation.js';
import {
  publicRecipeCardDTO,
  publicRecipeDetailDTO,
} from '../../src/modules/recipes/recipe.dto.js';
const valid = () => ({
  _id: 'a'.repeat(24),
  title: 'Thịt kho trứng',
  description: 'Món ngon cho gia đình',
  categoryId: 'b'.repeat(24),
  difficulty: 'easy',
  servings: 2,
  prepMinutes: 0,
  cookMinutes: 30,
  totalMinutes: 30,
  coverImageAssetId: null,
  tags: [],
  ingredients: [
    {
      name: 'Salt',
      quantity: 0,
      unit: null,
      quantityText: null,
      note: null,
      ingredientId: null,
      order: 1,
    },
  ],
  steps: [
    {
      stepId: randomUUID(),
      order: 1,
      instruction: 'Nấu thật kỹ',
      durationMinutes: null,
      imageAssetId: null,
    },
  ],
  publicAuthor: {
    _id: 'c'.repeat(24),
    displayName: 'Cook',
    email: 'secret@example.test',
  },
  publishedAt: new Date(),
  slug: 'thit-kho-trung',
});
it.each([
  ['Thịt kho trứng', 'thit-kho-trung'],
  ['ĐẬU đen', 'dau-den'],
  ['  -- Hello /// World -- ', 'hello-world'],
  ['🍜', 'recipe'],
  ['漢字', 'recipe'],
  ['a'.repeat(200), 'a'.repeat(150)],
])('PUB-21 slug %s', (a, b) => expect(recipeSlug(a)).toBe(b));
it('PUB-01 valid optional cover and quantity zero', () =>
  expect(() => validatePublication(valid())).not.toThrow());
it.each([
  ['title', '<b>title</b>'],
  ['title', 'ab'],
  ['description', 'short'],
  ['prepMinutes', -1],
  ['cookMinutes', 1441],
  ['servings', 101],
  ['difficulty', 'extreme'],
  ['categoryId', 'bad'],
  ['tags', Array(13).fill('tag')],
])('PUB-02..14 strict persisted %s', (field, value) =>
  expect(() => validatePublication({ ...valid(), [field]: value })).toThrow(),
);
it.each([
  {},
  { version: -1 },
  { version: '1' },
  { version: 0, role: 'admin' },
  { version: 0, status: 'published' },
  { version: Number.MAX_SAFE_INTEGER },
])('PUB-66/67 strict transition %j', (input) =>
  expect(transitionSchema.safeParse(input).success).toBe(false),
);
it.each([
  { q: { $ne: 'search' } },
  { limit: 101 },
  { page: 0 },
  { sort: 'title' },
  { status: 'draft' },
])('PUB-41 strict public query %j', (q) =>
  expect(publicRecipeQuery.safeParse(q).success).toBe(false),
);
it('PUB-43/44 public DTO independent whitelist excludes internal author/media fields', () => {
  const r = {
    ...valid(),
    creationKey: 'secret',
    moderationReason: 'private',
    cloudinary: { publicId: 'secret' },
  };
  for (const dto of [publicRecipeCardDTO(r), publicRecipeDetailDTO(r)])
    expect(JSON.stringify(dto)).not.toMatch(
      /secret|private|email|imageAssetId|creationKey|moderationReason|cloudinary/,
    );
});
