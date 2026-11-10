import { createElement as h } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react';
import { App } from '../src/App.js';
import { matchRoute, navigate } from '../src/app/router.js';
import { readApi, searchQuery, useRead } from '../src/services/api.js';
import {
  Button,
  SearchForm,
  FilterChip,
  RecipeImage,
  EmptyState,
  ErrorState,
} from '../src/components/ui/primitives.js';
import { RecipeCard } from '../src/features/recipes.js';
const userId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const card = {
  recipeId: '1',
  title: 'Canh rau củ',
  slug: 'canh-rau-cu',
  totalMinutes: 0,
  difficulty: 'easy',
  coverImageUrl: null,
  author: { id: userId, displayName: 'Đặng Thị Hồng' },
};
const response = (data, status = 200) => ({
  status,
  ok: status < 400,
  json: async () => ({ success: status < 400, data }),
});
beforeEach(() => {
  window.history.replaceState({}, '', '/');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it('button uses native click and chips have real routes', () => {
  const click = vi.fn();
  render(
    h(
      'div',
      null,
      h(Button, { onClick: click }, 'Áp dụng'),
      h(FilterChip, { href: '/recipes?maxMinutes=30' }, '≤ 30 phút'),
    ),
  );
  fireEvent.click(screen.getByRole('button'));
  expect(click).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('link').getAttribute('href')).toBe(
    '/recipes?maxMinutes=30',
  );
});
it('search trims once and validates the boundary', () => {
  const submit = vi.fn();
  render(h(SearchForm, { onSearch: submit }));
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: '  canh rau  ' },
  });
  fireEvent.submit(screen.getByRole('search'));
  expect(submit).toHaveBeenCalledExactlyOnceWith('canh rau');
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'x'.repeat(121) },
  });
  fireEvent.submit(screen.getByRole('search'));
  expect(screen.getByRole('alert').textContent).toContain('120');
  expect(submit).toHaveBeenCalledTimes(1);
});
it('cards use DTO routes, retain zero minutes and never synthesize rating', () => {
  render(h(RecipeCard, { recipe: card }));
  expect(screen.getByText('0 phút')).toBeTruthy();
  expect(
    screen.getByRole('link', { name: card.title }).getAttribute('href'),
  ).toBe('/recipes/canh-rau-cu');
  expect(
    screen
      .getByRole('link', { name: card.author.displayName })
      .getAttribute('href'),
  ).toBe('/users/' + userId);
  expect(screen.getByText('Chưa hiển thị được ảnh')).toBeTruthy();
  expect(screen.queryByText(/rating|★/)).toBeNull();
});
it('unsafe image URLs fall back and authorized image failure is recoverable', () => {
  const { rerender, container } = render(
    h(RecipeImage, { url: 'https://elsewhere.test/private.jpg' }),
  );
  expect(container.querySelector('img').getAttribute('src')).toContain(
    'recipe-fallback-vr.svg',
  );
  rerender(h(RecipeImage, { url: '/api/v1/media/example/content' }));
  fireEvent.error(container.querySelector('img'));
  expect(screen.getByText('Chưa hiển thị được ảnh')).toBeTruthy();
});
it('empty and error remain distinct and retry is explicit', () => {
  const retry = vi.fn();
  render(h('div', null, h(EmptyState), h(ErrorState, { onRetry: retry })));
  expect(screen.getByText('Chưa có công thức nào')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  expect(retry).toHaveBeenCalledTimes(1);
});
it('router rejects invalid identifiers and unknown paths', () => {
  expect(matchRoute('/recipes/canh-rau-cu')).toEqual({
    page: 'detail',
    value: 'canh-rau-cu',
  });
  expect(matchRoute('/users/' + userId).page).toBe('profile');
  for (const path of [
    '/users/bad',
    '/recipes/%3Cscript%3E',
    '/login',
    '/recipes/x/y',
  ])
    expect(matchRoute(path).page).toBe('notfound');
});
it('query whitelist rejects duplicates and unknowns', () => {
  expect(searchQuery('?role=admin').error).toBeTruthy();
  expect(searchQuery('?q=a&q=b').error).toBeTruthy();
  expect(searchQuery('?q=%20').error).toBeTruthy();
  expect(searchQuery('?maxMinutes=30&ingredientMatch=all').path).toBe(
    '/recipes?maxMinutes=30&ingredientMatch=all',
  );
});
it('API includes credentials and never parses 204', async () => {
  const json = vi.fn();
  const fetch = vi.fn().mockResolvedValue({ status: 204, ok: true, json });
  vi.stubGlobal('fetch', fetch);
  expect(await readApi('/auth/logout')).toBeNull();
  expect(json).not.toHaveBeenCalled();
  expect(fetch.mock.calls[0][1].credentials).toBe('include');
});
it('API errors preserve status without leaking response content', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(response({ passwordHash: 'secret' }, 404)),
  );
  await expect(readApi('/recipes/missing')).rejects.toMatchObject({
    status: 404,
    code: 'UNAVAILABLE',
  });
});
it('stale requests cannot replace the latest result', async () => {
  const resolve = {};
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (url) =>
        new Promise((r) => {
          resolve[url] = r;
        }),
    ),
  );
  function Reader({ path }) {
    const r = useRead(path);
    return h('p', null, r.status === 'ready' ? r.body.data : r.status);
  }
  const { rerender } = render(h(Reader, { path: '/old' }));
  rerender(h(Reader, { path: '/new' }));
  resolve['/api/v1/new'](response('new result'));
  await screen.findByText('new result');
  resolve['/api/v1/old'](response('old result'));
  await waitFor(() => expect(screen.queryByText('old result')).toBeNull());
});
function mockAPI(overrides = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      const path = url.replace('/api/v1', '');
      if (overrides[path]) return overrides[path]();
      if (path === '/auth/me') return response(null, 401);
      if (path === '/health') return response({ status: 'ready' });
      if (path.startsWith('/recipes?')) return response([card]);
      if (path === '/recipes/canh-rau-cu')
        return response({
          ...card,
          description: 'Bữa cơm ấm áp',
          ingredients: [{ name: 'Cà rốt', quantity: 1, unit: 'củ', order: 1 }],
          steps: [{ stepId: '1', instruction: 'Nấu chín', imageUrl: null }],
        });
      if (path === '/users/' + userId)
        return response({
          displayName: card.author.displayName,
          bio: 'Yêu căn bếp nhỏ',
        });
      return response([]);
    }),
  );
}
it('Home shows real public data and guest state; search writes URL', async () => {
  mockAPI();
  render(h(App));
  await screen.findByText('Khách ghé bếp');
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
    'Hôm nay nấu món gì?',
  );
  expect(
    (await screen.findAllByRole('link', { name: card.title })).length,
  ).toBe(2);
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'canh rau' },
  });
  fireEvent.submit(screen.getByRole('search'));
  await screen.findByRole('heading', { name: 'Khám phá công thức', level: 1 });
  expect(window.location.search).toBe('?q=canh+rau');
});
it('detail and profile read safe DTOs, no fictitious step media', async () => {
  mockAPI();
  window.history.replaceState({}, '', '/recipes/canh-rau-cu');
  const { container } = render(h(App));
  await screen.findByText('Nấu chín');
  expect(container.querySelector('.step-image')).toBeNull();
  fireEvent.click(screen.getByRole('main').querySelector('.detail-author a'));
  await screen.findByRole('heading', {
    name: card.author.displayName,
    level: 1,
  });
  expect(screen.getByText('Yêu căn bếp nhỏ')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /follow/i })).toBeNull();
});
it('empty collection is not a network error', async () => {
  mockAPI({ '/recipes?limit=4&sort=-publishedAt': () => response([]) });
  render(h(App));
  await screen.findByText('Chưa có công thức nào');
  expect(screen.queryByText('Gợi ý hôm nay')).toBeNull();
});
it('network failure displays retry and hidden detail displays 404', async () => {
  mockAPI({
    '/recipes?limit=4&sort=-publishedAt': () =>
      Promise.reject(new Error('offline')),
    '/recipes/hidden': () => response(null, 404),
  });
  render(h(App));
  await screen.findByRole('button', { name: 'Thử lại' });
  navigate('/recipes/hidden');
  await screen.findByRole('heading', {
    name: 'Không tìm thấy nội dung',
    level: 1,
  });
});
it('sidebar contains only implemented destinations; error routes work', async () => {
  mockAPI();
  window.history.replaceState({}, '', '/forbidden');
  render(h(App));
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
    'Bạn không có quyền truy cập',
  );
  const nav = screen.getByRole('navigation', { name: 'Chính' });
  expect(
    [...nav.querySelectorAll('a')].map((a) => a.getAttribute('href')),
  ).toEqual(['/', '/recipes']);
});

it('authenticated greeting uses Backend displayName', async () => {
  mockAPI({ '/auth/me': () => response({ displayName: 'Đặng Thị Hồng' }) });
  render(h(App));
  await screen.findByRole('heading', {
    level: 1,
    name: 'Chào mừng trở lại, Đặng Thị Hồng!',
  });
});
it('mobile drawer locks scrolling, handles Escape and restores focus', async () => {
  const { MobileDrawer } =
    await import('../src/components/kitchen/KitchenShell.js');
  const trigger = document.createElement('button');
  document.body.append(trigger);
  const triggerRef = { current: trigger },
    close = vi.fn();
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390);
  const { rerender } = render(
    h(MobileDrawer, { open: true, onClose: close, triggerRef, pathname: '/' }),
  );
  expect(document.body.style.overflow).toBe('hidden');
  expect(document.activeElement.textContent).toBe('');
  fireEvent(
    screen.getByRole('dialog'),
    new Event('cancel', { bubbles: true, cancelable: true }),
  );
  expect(close).toHaveBeenCalledTimes(1);
  rerender(
    h(MobileDrawer, { open: false, onClose: close, triggerRef, pathname: '/' }),
  );
  expect(document.body.style.overflow).toBe('');
  expect(document.activeElement).toBe(trigger);
  trigger.remove();
});
