import { createElement as h } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  act,
} from '@testing-library/react';
import { searchQuery } from '../src/services/api.js';
import { searchQuery as backendQuery } from '../../backend/src/modules/recipes/search.validation.js';
import { RecipeDetail, PublicProfile } from '../src/features/recipes.js';
import { Explore } from '../src/features/search.js';
import { ErrorState } from '../src/components/ui/primitives.js';
import { App } from '../src/App.js';
const id = 'abcdefabcdefabcdefabcdef';
const second = '123456789012345678901234';
const response = (data, status = 200, code = 'UNAVAILABLE') => ({
  status,
  ok: status < 400,
  headers: new Headers({ 'Content-Type': 'application/json' }),
  json: async () =>
    status < 400
      ? { success: true, data, meta: { page: 1, limit: 20, total: 0 } }
      : { success: false, error: { code } },
});
beforeEach(() => {
  window.history.replaceState({}, '', '/');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it.each([
  '',
  '?q=ĐẬU%20HŨ',
  '?q=canh%20%20rau',
  '?q=rau-ca',
  '?q=100%25',
  '?tag=%20BỮA%20TỐI%20',
  '?page=1000&limit=100&maxMinutes=0',
  '?maxMinutes=30&difficulty=easy',
  '?sort=publishedAt',
  `?category=${id.toUpperCase()}`,
  `?ingredientIds=${id.toUpperCase()},${id},${second}&ingredientMatch=all`,
])('PUB-U01 query conforms to Backend: %s', (input) => {
  const parsed = searchQuery(input);
  expect(parsed.error).toBeUndefined();
  expect(
    backendQuery.safeParse(
      Object.fromEntries(new URLSearchParams(parsed.path.split('?')[1])),
    ).success,
  ).toBe(true);
});
it.each([
  '?q=',
  '?q=%20',
  '?q=!!!',
  '?q=%3Cscript%3E',
  '?q=%E2%80%8B',
  '?q=a%09b',
  '?q=' + 'x'.repeat(121),
  '?q=one+two+three+four+five+six+seven+eight+nine+ten+eleven',
  '?page=0',
  '?page=01',
  '?page=1001',
  '?limit=101',
  '?limit=1e2',
  '?maxMinutes=-1',
  '?maxMinutes=2881',
  '?maxMinutes=Infinity',
  '?category=bad',
  '?difficulty=expert',
  '?sort=rating',
  '?ingredientIds=',
  '?ingredientIds=bad',
  `?ingredientIds=${Array(21).fill(id).join(',')}`,
  '?ingredientMatch=all',
  `?ingredientIds=${id}&ingredientMatch=none`,
  '?authorId=' + id,
  '?q=a&q=b',
])('PUB-U02 invalid query is retained but not dispatched: %s', (input) => {
  const parsed = searchQuery(input);
  expect(parsed.error).toBeTruthy();
  expect(parsed.path).toBeUndefined();
  expect(parsed.params.toString()).toBe(new URLSearchParams(input).toString());
});
it('PUB-U03 canonicalizes IDs without changing the server matching semantics', () => {
  const parsed = searchQuery(
    `?ingredientIds=${id.toUpperCase()},${id},${second}&ingredientMatch=any`,
  );
  expect(parsed.params.get('ingredientIds')).toBe(`${id},${second}`);
});
it.each([401, 403, 429, 503])(
  'PUB-U04 Detail/Profile preserve normalized %i and retry the same GET',
  async (status) => {
    const fetch = vi.fn().mockResolvedValue(response(null, status));
    vi.stubGlobal('fetch', fetch);
    const { rerender } = render(h(RecipeDetail, { slug: 'public-recipe' }));
    const alert = await screen.findByRole('alert');
    if (status === 401) expect(alert.textContent).toContain('Phiên đăng nhập');
    if (status === 403) expect(alert.textContent).toContain('không có quyền');
    if (status === 429) expect(alert.textContent).toContain('quá nhanh');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(fetch.mock.calls[1][0]).toBe('/api/v1/recipes/public-recipe');
    rerender(h(PublicProfile, { userId: id }));
    const profileAlert = await screen.findByRole('alert');
    if (status === 429) expect(profileAlert.textContent).toContain('quá nhanh');
    if (status === 403)
      expect(profileAlert.textContent).toContain('không có quyền');
  },
);
it('PUB-U05 Detail renders category, sorted steps/ingredients and literal text safely', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) =>
      response(
        url.includes('/categories')
          ? [{ id, name: 'Món Việt' }]
          : {
              title: '<img src=x onerror=alert(1)>',
              categoryId: id,
              author: { id: 'invalid', displayName: 'Author' },
              ingredients: [
                { order: 2, name: 'Sau', quantityText: 'vừa đủ' },
                { order: 1, name: 'Trước', quantity: 0, unit: 'g' },
              ],
              steps: [
                { order: 2, stepId: 'two', instruction: 'Bước sau' },
                { order: 1, stepId: 'one', instruction: 'Bước trước' },
              ],
            },
      ),
    ),
  );
  const { container } = render(h(RecipeDetail, { slug: 'public-recipe' }));
  await screen.findByRole('link', { name: 'Món Việt' });
  expect(
    screen.getByRole('link', { name: 'Món Việt' }).getAttribute('href'),
  ).toBe('/recipes?category=' + id);
  expect(
    [...container.querySelectorAll('.ingredients li')].map(
      (e) => e.textContent,
    ),
  ).toEqual(['Trước0 g', 'Sauvừa đủ']);
  expect(
    [...container.querySelectorAll('.cooking-steps li')].map(
      (e) => e.textContent,
    ),
  ).toEqual(['Bước trước', 'Bước sau']);
  expect(container.querySelector('[onerror]')).toBeNull();
  expect(container.querySelector('.detail-author a')).toBeNull();
  expect(screen.queryByText('Chuẩn bị')).toBeNull();
});
it('PUB-U06 Profile renders only public fields and requests only the public author page', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(
    response({
      displayName: 'Bếp Việt',
      bio: '<script>secret</script>',
      email: 'private@example.test',
      role: 'admin',
      passwordHash: 'private-hash',
      preferences: { secret: true },
    }),
  );
  fetch.mockResolvedValue(response([]));
  vi.stubGlobal('fetch', fetch);
  const { container } = render(h(PublicProfile, { userId: id }));
  await screen.findByRole('heading', { name: 'Bếp Việt' });
  expect(container.textContent).not.toContain('private@example');
  expect(container.textContent).not.toContain('private-hash');
  expect(container.querySelector('script')).toBeNull();
  expect(container.textContent).not.toContain('admin');
  expect(fetch.mock.calls.map(([url]) => url)).toEqual([
    '/api/v1/users/' + id,
    '/api/v1/users/' + id + '/recipes?page=1&limit=12',
  ]);
});
it('PUB-U07 category page2 and ingredient limits expose real supported GETs', async () => {
  const categories = Array.from({ length: 100 }, (_, i) => ({
    id: i.toString(16).padStart(24, '0'),
    name: 'Danh mục ' + i,
  }));
  const fetch = vi.fn(async (url) =>
    response(
      url.includes('/categories')
        ? url.includes('page=2')
          ? [{ id, name: 'Danh mục trang hai' }]
          : categories
        : url.includes('/ingredients')
          ? Array.from(
              { length: url.includes('limit=40') ? 21 : 20 },
              (_, i) => ({
                id: i.toString(16).padStart(24, '0'),
                name: 'Nguyên liệu ' + i,
              }),
            )
          : [],
    ),
  );
  vi.stubGlobal('fetch', fetch);
  render(h(Explore, { search: '' }));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Tải thêm danh mục' }),
  );
  await screen.findByRole('option', { name: 'Danh mục trang hai' });
  expect(
    screen.getAllByRole('option').some((o) => o.textContent === 'Danh mục 0'),
  ).toBe(true);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Tải thêm nguyên liệu' }),
  );
  await screen.findByRole('checkbox', { name: 'Nguyên liệu 20' });
  expect(
    fetch.mock.calls.some(([url]) => url.endsWith('limit=100&page=2')),
  ).toBe(true);
  expect(
    fetch.mock.calls.some(([url]) => url.includes('ingredients?q=&limit=40')),
  ).toBe(true);
});
it('PUB-U08 invalid enum does not query recipes, preserves keyword for editing', async () => {
  const fetch = vi.fn().mockResolvedValue(response([]));
  vi.stubGlobal('fetch', fetch);
  render(h(Explore, { search: '?q=canh+rau&difficulty=invalid' }));
  expect(screen.getByRole('searchbox', { name: 'Tìm công thức' }).value).toBe(
    'canh rau',
  );
  expect(screen.getByRole('alert').textContent).toContain('Bộ lọc');
  await waitFor(() => expect(fetch.mock.calls.length).toBeGreaterThan(0));
  expect(fetch.mock.calls.some(([url]) => url.includes('/recipes'))).toBe(
    false,
  );
});
it('PUB-U09 public Home remains available when auth/me fails', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) =>
      url.endsWith('/auth/me')
        ? response(null, 503)
        : url.endsWith('/health')
          ? response({ status: 'ready' })
          : response([]),
    ),
  );
  render(h(App));
  await screen.findByText('Chưa có công thức nào');
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
    'Hôm nay nấu món gì?',
  );
  expect(screen.queryByText('Khách ghé bếp')).toBeNull();
});

it('PUB-U10 respects Retry-After and never retries without a user action', async () => {
  vi.useFakeTimers();
  const retry = vi.fn();
  render(
    h(ErrorState, {
      error: { status: 429, retryAfterSeconds: 2 },
      onRetry: retry,
    }),
  );
  expect(screen.getByRole('button').disabled).toBe(true);
  fireEvent.click(screen.getByRole('button'));
  expect(retry).not.toHaveBeenCalled();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
  expect(screen.getByRole('button').disabled).toBe(false);
  fireEvent.click(screen.getByRole('button'));
  expect(retry).toHaveBeenCalledOnce();
});

it('keeps a newly checked ingredient when removing a different applied ingredient', async () => {
  const options = [
    { id, name: 'Cà rốt' },
    { id: second, name: 'Đậu hũ' },
  ];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => response(url.includes('/ingredients') ? options : [])),
  );
  const search = '?ingredientIds=' + id + '&ingredientMatch=any';
  window.history.replaceState({}, '', '/recipes' + search);
  const view = render(h(Explore, { search }));
  const added = await screen.findByRole('checkbox', { name: 'Đậu hũ' });
  fireEvent.click(added);
  fireEvent.click(
    screen.getByRole('button', { name: 'Bỏ Cà rốt', exact: true }),
  );
  view.rerender(h(Explore, { search: window.location.search }));
  expect(screen.getByRole('checkbox', { name: 'Cà rốt' }).checked).toBe(false);
  expect(added.checked).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Áp dụng bộ lọc' }));
  expect(new URLSearchParams(window.location.search).get('ingredientIds')).toBe(
    second,
  );
});
