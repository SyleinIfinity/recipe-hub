import { it, expect } from 'vitest';
import {
  searchTokens,
  recipeSearchFields,
} from '../../src/modules/recipes/search.normalization.js';
import { searchQuery } from '../../src/modules/recipes/search.validation.js';
import { searchFilter } from '../../src/modules/recipes/search.service.js';
import {
  favoriteQuery,
  emptyFavoriteBody,
} from '../../src/modules/favorites/favorite.validation.js';
const a = '1234567890abcdef12345678',
  b = 'abcdef1234567890abcdef12';
it.each([
  'Thịt KHO trứng ĐẬU',
  'thit kho trung dau',
  'Thịt kho trứng đậu'.normalize('NFD'),
])('SRCH-03..05 folds %s', (text) => {
  expect(searchTokens(text)).toEqual(['thit', 'kho', 'trung', 'dau']);
});
it('SRCH-02 tokenizer deduplicates punctuation-separated Unicode words without executing regex', () => {
  expect(searchTokens('thịt-thịt (kho)+ .* 日本 123')).toEqual([
    'thit',
    'kho',
    '日本',
    '123',
  ]);
  expect(
    recipeSearchFields({ title: 'Thịt', description: 'Kho trứng' }),
  ).toEqual({ searchTokens: ['thit', 'kho', 'trung'], searchVersion: 1 });
});
it.each([
  { q: '' },
  { q: 'text\n' },
  { maxMinutes: '1\n' },
  { category: a + '\n' },
  { q: ' ' },
  { q: '.*' },
  { q: 'x'.repeat(121) },
  { q: Array(2).fill('x') },
  { q: { $ne: '' } },
  { q: 'one two three four five six seven eight nine ten eleven' },
  { q: 'a\u0000b' },
  { q: '<script>' },
  { category: 'bad' },
  { difficulty: 'expert' },
  { maxMinutes: '-1' },
  { maxMinutes: 'NaN' },
  { maxMinutes: 'Infinity' },
  { maxMinutes: '1e2' },
  { maxMinutes: '01' },
  { maxMinutes: '1.5' },
  { maxMinutes: ' 1' },
  { maxMinutes: 2881 },
  { ingredientIds: '' },
  { ingredientIds: `${a},` },
  { ingredientIds: `${a}, ${b}` },
  { ingredientIds: [a, b] },
  { ingredientIds: Array(21).fill(a).join(',') },
  { ingredientMatch: 'all' },
  { ingredientIds: a, ingredientMatch: 'ALL' },
  { page: 0 },
  { page: 1001 },
  { limit: 101 },
  { limit: '0x10' },
  { sort: 'relevance' },
  { status: 'draft' },
  { tag: '' },
])('SRCH-06..09/18..20/25..27/35 rejects %j', (q) =>
  expect(searchQuery.safeParse(q).success).toBe(false),
);
it('SRCH-14/24 canonical tag and IDs, inclusive zero/defaults', () => {
  const q = searchQuery.parse({
    tag: ' BỮA TỐI ',
    ingredientIds: `${a.toUpperCase()},${a}`,
    maxMinutes: '0',
  });
  expect(q).toMatchObject({
    tag: 'bữa tối',
    ingredientIds: a,
    maxMinutes: 0,
    page: 1,
    limit: 20,
    sort: '-publishedAt',
  });
  expect(searchQuery.parse(q)).toEqual(q);
});
it('SRCH-15..17/21..23/29 query builder ANDs whitelisted filters and all canonical IDs', () => {
  const q = searchQuery.parse({
    q: 'Thịt kho',
    category: a,
    tag: 'Dinner',
    difficulty: 'easy',
    maxMinutes: '45',
    ingredientIds: `${a},${b}`,
    ingredientMatch: 'all',
  });
  const f = searchFilter(q);
  expect(f.searchTokens).toEqual({ $all: ['thit', 'kho'] });
  expect(f.totalMinutes).toEqual({ $gte: 0, $lte: 45 });
  expect(f.tags).toBe('dinner');
  expect(f['ingredients.ingredientId'].$all.map(String)).toEqual([a, b]);
  expect(
    searchFilter(searchQuery.parse({ ingredientIds: a }))[
      'ingredients.ingredientId'
    ].$in.map(String),
  ).toEqual([a]);
});
it('FAV-19 rejects user override/filter/body injection; empty body tolerated', () => {
  expect(favoriteQuery.safeParse({ userId: a }).success).toBe(false);
  expect(emptyFavoriteBody.safeParse({ userId: a }).success).toBe(false);
  expect(emptyFavoriteBody.safeParse(undefined).success).toBe(true);
  expect(emptyFavoriteBody.safeParse({}).success).toBe(true);
});
