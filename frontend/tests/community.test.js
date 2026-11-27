import { createElement as h } from 'react';
import { afterEach, it, expect, vi } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { RecipePost } from '../src/features/community/post.js';
import { InteractionScope } from '../src/features/community/interactions.js';
import { CommentSection } from '../src/features/community/comments.js';
import { invalidateSecurity } from '../src/services/api.js';
import { listLocation } from '../src/app/library-location.js';
const recipe = {
  recipeId: 'abc123abc123abc123abc123',
  slug: 'canh-gung',
  title: 'Canh gừng',
  summary: 'Canh rau củ',
  author: { id: '123123123123123123123123', displayName: 'An' },
  interactionSummary: { favoriteCount: 3, commentCount: 2 },
};
afterEach(() => {
  cleanup();
  invalidateSecurity();
  vi.unstubAllGlobals();
});
function post(session) {
  return h(
    InteractionScope,
    { session, recipes: [recipe] },
    h(RecipePost, { session, recipe }),
  );
}
it.each([
  [true, true],
  [true, false],
  [false, true],
  [false, false],
])(
  'renders independent membership favorited=%s saved=%s from one batch',
  async (favorited, saved) => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: [{ recipeId: recipe.recipeId, favorited, saved }],
        }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetch);
    render(
      post({
        status: 'authenticated',
        revision: 1,
        body: { data: { id: 'reader' } },
      }),
    );
    expect(
      screen
        .getByRole('button', { name: 'Kiểm tra lượt thích…' })
        .getAttribute('aria-pressed'),
    ).toBeNull();
    await screen.findByRole('button', {
      name: favorited ? 'Đã thích' : 'Thích',
      pressed: favorited,
    });
    expect(
      screen.getByRole('button', {
        name: saved ? 'Đã lưu' : 'Lưu',
        pressed: saved,
      }),
    ).toBeTruthy();
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/me/recipe-interactions?recipeIds=' + recipe.recipeId,
    ]);
    expect(screen.queryByRole('link', { name: 'Chỉnh sửa' })).toBeNull();
  },
);
it('guest reads the post and can return to it after signing in', () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const { container } = render(post({ status: 'guest' }));
  expect(screen.getByRole('heading', { name: recipe.title })).toBeTruthy();
  expect(
    screen
      .getByRole('link', { name: 'Đăng nhập để thích' })
      .getAttribute('href'),
  ).toContain('returnTo=%2Frecipes%2Fcanh-gung');
  expect(container.querySelector('.post-avatar').textContent).toBe('A');
  expect(fetch).not.toHaveBeenCalled();
});
it('parses only bounded library pages and supported tabs', () => {
  expect(listLocation('?tab=saved&page=2', true)).toEqual({
    tab: 'saved',
    page: 2,
  });
  for (const query of [
    '?tab=private',
    '?tab=saved&tab=draft',
    '?page=0',
    '?userId=other',
  ])
    expect(listLocation(query, true)).toBeNull();
});

const reply = (data, meta) =>
  new Response(JSON.stringify({ success: true, data, meta }), {
    headers: { 'Content-Type': 'application/json' },
  });
const account = (id, revision = 1) => ({
  status: 'authenticated',
  revision,
  body: { data: { id } },
});
it('discards old membership when a second account opens the same post', async () => {
  const id = recipe.recipeId;
  let release;
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      reply([{ recipeId: id, saved: true, favorited: true }]),
    )
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
  vi.stubGlobal('fetch', fetch);
  const ui = render(post(account('first')));
  await screen.findByRole('button', { name: 'Đã lưu', pressed: true });
  ui.rerender(post(account('second', 2)));
  expect(screen.queryByRole('button', { name: 'Đã lưu' })).toBeNull();
  expect(
    screen.getByRole('button', { name: 'Kiểm tra đã lưu…' }).disabled,
  ).toBe(true);
  release(reply([{ recipeId: id, saved: false, favorited: false }]));
  await screen.findByRole('button', { name: 'Lưu', pressed: false });
});
it('locks both controls during a write and re-reads membership after a lost response', async () => {
  let failWrite,
    reads = 0;
  const fetch = vi.fn(async (url, init) => {
    if (url.endsWith('/csrf')) return reply({ csrfToken: 'test' });
    if (init.method === 'PUT')
      return new Promise((_, reject) => {
        failWrite = reject;
      });
    reads++;
    return reply([
      { recipeId: recipe.recipeId, saved: reads > 1, favorited: false },
    ]);
  });
  vi.stubGlobal('fetch', fetch);
  render(post(account('first')));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Lưu', pressed: false }),
  );
  await waitFor(() => expect(failWrite).toBeTypeOf('function'));
  expect(screen.getByRole('button', { name: 'Đang lưu…' }).disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Thích' }).disabled).toBe(true);
  failWrite(new Error('Disconnected'));
  await screen.findByRole('button', { name: 'Đã lưu', pressed: true });
  expect(
    fetch.mock.calls.filter(([, init]) => init.method === 'PUT'),
  ).toHaveLength(1);
});
it('keeps an uncertain comment and uses its original key to confirm the same intent', async () => {
  const actor = account('123123123123123123123123');
  const writes = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init) => {
      if (url.endsWith('/csrf')) return reply({ csrfToken: 'test' });
      if (init.method === 'POST') {
        writes.push(init);
        if (writes.length === 1) throw new Error('Lost response');
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              recipeId: recipe.recipeId,
              commentId: recipe.author.id,
              parentId: null,
            },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return reply([], { total: 0, page: 1, limit: 8 });
    }),
  );
  render(h(CommentSection, { session: actor, recipe }));
  const field = screen.getByLabelText('Nội dung bình luận');
  fireEvent.change(field, { target: { value: 'Xin cảm ơn!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi bình luận' }));
  await screen.findByText(/Chưa xác nhận được lần gửi/);
  expect(field.value).toBe('Xin cảm ơn!');
  fireEvent.submit(field.closest('form'));
  await waitFor(() => expect(field.value).toBe(''));
  expect(writes).toHaveLength(2);
  expect(writes[0].headers['Idempotency-Key']).toBe(
    writes[1].headers['Idempotency-Key'],
  );
});
