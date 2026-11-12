import { createElement as h } from 'react';
import { it, expect, vi, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react';
import {
  emptyRecipe,
  editValues,
  serializeRecipe,
  validateRecipe,
  moveRow,
  confirmedRecipe,
  recipeError,
} from '../src/features/editor/model.js';
import { EditorScreen } from '../src/features/editor/screens.js';
import { invalidateSecurity, requestApi } from '../src/services/api.js';
import { matchRoute, safeReturnPath, navigate } from '../src/app/router.js';
const id = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const recipe = () => ({
  ...emptyRecipe(),
  recipeId: id,
  status: 'draft',
  moderationStatus: 'normal',
  version: 0,
  steps: [],
  ingredients: [],
});
const session = { revision: 1 };
const response = (data, status = 200) => ({
  status,
  ok: true,
  headers: new Headers({ 'Content-Type': 'application/json' }),
  json: async () => ({ success: true, data }),
});
afterEach(() => {
  cleanup();
  invalidateSecurity();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});
it.each(['/my/recipes', '/my/recipes/new', `/my/recipes/${id}/edit`])(
  'ED-U01 implemented private safe return %s',
  (p) => {
    expect(matchRoute(p).page).not.toBe('notfound');
    expect(safeReturnPath(p)).toBe(p);
  },
);
it.each(['\n', '\t', '<', '>', '\u200b'])(
  'ED-U02 rejects forbidden plaintext %j without stripping',
  (char) => {
    const v = emptyRecipe();
    v.title = 'Món' + char + 'mới';
    expect(validateRecipe(v).title).toBeTruthy();
    expect(serializeRecipe(v).title).toBe(v.title);
  },
);
it('ED-U03 draft optional fields and numeric zero survive serialization', () => {
  const v = emptyRecipe();
  expect(validateRecipe(v)).toEqual({});
  v.prepMinutes = '0';
  v.ingredients = [
    {
      name: 'Muối',
      quantity: '0',
      unit: '',
      quantityText: '',
      note: '',
      key: 'local',
    },
  ];
  expect(validateRecipe(v)).toEqual({});
  const b = serializeRecipe(v, 0);
  expect(b.prepMinutes).toBe(0);
  expect(b.cookMinutes).toBeNull();
  expect(b.ingredients[0]).toMatchObject({ quantity: 0, order: 1 });
  expect(b.ingredients[0].key).toBeUndefined();
});
it.each([
  ['servings', '0'],
  ['prepMinutes', '1441'],
  ['cookMinutes', '1.5'],
  ['title', 'a'.repeat(151)],
])('ED-U04 boundary %s', (field, value) => {
  const v = { ...emptyRecipe(), [field]: value };
  expect(validateRecipe(v)[field]).toBeTruthy();
});
it('ED-U05 publication requirements differ from draft and do not require images', () => {
  const v = emptyRecipe();
  expect(Object.keys(validateRecipe(v, true))).toContain('steps');
  Object.assign(v, {
    title: 'Canh rau',
    description: 'Canh rau ngon mỗi ngày',
    categoryId: id,
    difficulty: 'easy',
    servings: '1',
    prepMinutes: '0',
    cookMinutes: '0',
    ingredients: [{ name: 'Muối', quantity: 0 }],
    steps: [{ instruction: 'Nấu canh chín' }],
  });
  expect(validateRecipe(v, true)).toEqual({});
});
it('ED-U06 stable row identity, reorder and canonical step IDs', () => {
  const r = recipe();
  r.steps = [
    { stepId: 'persisted', instruction: 'Bước trước', durationMinutes: null },
  ];
  const v = editValues(r);
  const key = v.steps[0].key;
  v.steps.push({ key: 'local-new', instruction: 'Bước sau' });
  v.steps = moveRow(v.steps, 'local-new', -1);
  const b = serializeRecipe(v, 3);
  expect(b.steps[0]).toMatchObject({ order: 1 });
  expect(b.steps[0].stepId).toBeUndefined();
  expect(b.steps[1]).toMatchObject({ order: 2, stepId: 'persisted' });
  expect(v.steps[1].key).toBe(key);
  expect(moveRow(v.steps, 'local-new', -1)).toBe(v.steps);
});
it('ED-U07 quantity negatives and duplicated canonical IDs rejected', () => {
  const v = emptyRecipe();
  v.ingredients = [
    { name: 'A', quantity: -1, ingredientId: id },
    { name: 'B', ingredientId: id },
  ];
  expect(validateRecipe(v)).toHaveProperty('ingredients.0.quantity');
  expect(validateRecipe(v)).toHaveProperty('ingredients.1.ingredientId');
});
it('ED-U08 list maximums and Unicode text', () => {
  const v = emptyRecipe();
  v.title = 'Cơm Việt Đậm Đà';
  v.ingredients = Array.from({ length: 41 }, () => ({ name: 'Rau' }));
  v.steps = Array.from({ length: 31 }, () => ({ instruction: 'Nấu rau' }));
  expect(validateRecipe(v).title).toBeUndefined();
  expect(validateRecipe(v).ingredients).toBeTruthy();
  expect(validateRecipe(v).steps).toBeTruthy();
});
it('ED-U09 actual published owner status accepted, unexpected202 rejected', () => {
  const r = { ...recipe(), status: 'published' };
  expect(confirmedRecipe({ data: r, http: { status: 200 } }).status).toBe(
    'published',
  );
  expect(() => confirmedRecipe({ data: r, http: { status: 202 } })).toThrow();
});
it.each([401, 403, 404, 409, 422, 429, 503])(
  'ED-U10 safe error %s',
  (status) => {
    expect(recipeError({ status, message: 'passwordsecret' })).not.toContain(
      'passwordsecret',
    );
  },
);
it('ED-U11 shared client sends only valid idempotency header alongside CSRF', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(response({ csrfToken: 'memory' }))
    .mockResolvedValueOnce(response(recipe(), 201));
  vi.stubGlobal('fetch', fetch);
  const key = crypto.randomUUID();
  await requestApi('/recipes', {
    method: 'POST',
    body: {},
    idempotencyKey: key,
  });
  expect(fetch.mock.calls[1][1].headers).toMatchObject({
    'Idempotency-Key': key,
    'X-CSRF-Token': 'memory',
  });
  await expect(
    requestApi('/recipes', { method: 'POST', idempotencyKey: 'invalid' }),
  ).rejects.toThrow('INVALID_IDEMPOTENCY_KEY');
});
it('ED-U12 local row edits/reorder/delete preserve other values and dirty leave cancellation', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([])));
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  render(h(EditorScreen, { session }));
  fireEvent.click(screen.getByRole('button', { name: 'Thêm nguyên liệu' }));
  fireEvent.change(screen.getByLabelText('Tên nguyên liệu 1'), {
    target: { value: 'Muối' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Thêm nguyên liệu' }));
  fireEvent.change(screen.getByLabelText('Tên nguyên liệu 2'), {
    target: { value: 'Rau' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Đưa nguyên liệu 2 lên' }),
  );
  expect(screen.getByLabelText('Tên nguyên liệu 1').value).toBe('Rau');
  fireEvent.click(screen.getByRole('button', { name: 'Xóa nguyên liệu 1' }));
  expect(screen.getByLabelText('Tên nguyên liệu 1').value).toBe('Muối');
  navigate('/recipes');
  expect(confirm).toHaveBeenCalled();
  expect(location.pathname).toBe('/');
});
it('ED-U13 409 keeps local fields, does not change expected version or replay', async () => {
  const fetch = vi.fn(async (url) => {
    if (url.endsWith('/auth/csrf')) return response({ csrfToken: 'memory' });
    if (url.includes('/me/recipes/')) return response(recipe());
    if (url.includes('/categories')) return response([]);
    return {
      status: 409,
      ok: false,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({
        success: false,
        error: { code: 'VERSION_CONFLICT' },
      }),
    };
  });
  vi.stubGlobal('fetch', fetch);
  render(h(EditorScreen, { recipeId: id, session }));
  await screen.findByLabelText('Tên công thức');
  fireEvent.change(screen.getByLabelText('Tên công thức'), {
    target: { value: 'Local unsaved' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }));
  await screen.findByRole('button', { name: 'Đọc bản máy chủ để đối chiếu' });
  expect(screen.getByLabelText('Tên công thức').value).toBe('Local unsaved');
  expect(
    screen.getByRole('button', { name: 'Lưu bản nháp' }).matches(':disabled'),
  ).toBe(true);
  expect(
    fetch.mock.calls.filter(([, o]) => o?.method === 'PATCH'),
  ).toHaveLength(1);
});
it('ED-U14 uncertain create cannot start a new intent or auto retry', async () => {
  const fetch = vi.fn(async (url, o) => {
    if (url.includes('/categories')) return response([]);
    if (url.endsWith('/auth/csrf')) return response({ csrfToken: 'memory' });
    if (o.method === 'POST') throw new Error('offline');
  });
  vi.stubGlobal('fetch', fetch);
  render(h(EditorScreen, { session }));
  fireEvent.click(screen.getByRole('button', { name: 'Tạo bản nháp' }));
  await screen.findByRole('button', { name: 'Kiểm tra lại cùng yêu cầu tạo' });
  expect(fetch.mock.calls.filter(([, o]) => o.method === 'POST')).toHaveLength(
    1,
  );
  expect(screen.getByLabelText('Tên công thức').matches(':disabled')).toBe(
    true,
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Kiểm tra lại cùng yêu cầu tạo' }),
  );
  await waitFor(() =>
    expect(
      fetch.mock.calls.filter(([, o]) => o.method === 'POST'),
    ).toHaveLength(2),
  );
  const writes = fetch.mock.calls.filter(([, o]) => o.method === 'POST');
  expect(writes[0][1].headers['Idempotency-Key']).toBe(
    writes[1][1].headers['Idempotency-Key'],
  );
  expect(writes[0][1].body).toBe(writes[1][1].body);
});
it('ED-U15 published owner view is read-only without save/delete actions', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) =>
      response(
        url.includes('/me/recipes/')
          ? { ...recipe(), status: 'published' }
          : [],
      ),
    ),
  );
  render(h(EditorScreen, { recipeId: id, session }));
  await screen.findByLabelText('Tên công thức');
  expect(screen.queryByRole('button', { name: 'Lưu bản nháp' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Xóa bản nháp' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Ngừng xuất bản' })).toBeTruthy();
});
it('ED-U16 unexpected202 cannot produce saved confirmation', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, o) =>
      response(
        url.endsWith('/auth/csrf')
          ? { csrfToken: 'memory' }
          : url.includes('/categories')
            ? []
            : recipe(),
        o.method === 'POST' ? 202 : 200,
      ),
    ),
  );
  render(h(EditorScreen, { session }));
  fireEvent.click(screen.getByRole('button', { name: 'Tạo bản nháp' }));
  await screen.findByRole('button', { name: 'Kiểm tra lại cùng yêu cầu tạo' });
  expect(screen.queryByText('Đã lưu bản nháp.')).toBeNull();
});
it('ED-U17 session revision unmount aborts private reads and ignores delayed results', async () => {
  let resolveRead, signal;
  vi.stubGlobal(
    'fetch',
    vi.fn((url, o) => {
      if (url.includes('/me/recipes/')) {
        signal = o.signal;
        return new Promise((r) => (resolveRead = r));
      }
      return Promise.resolve(response([]));
    }),
  );
  const ui = render(h(EditorScreen, { recipeId: id, session }));
  await waitFor(() => expect(signal).toBeDefined());
  ui.unmount();
  expect(signal.aborted).toBe(true);
  resolveRead(response({ ...recipe(), title: 'Private A' }));
  await Promise.resolve();
  expect(screen.queryByText('Private A')).toBeNull();
});
it('ED-U18 unexpected205 must not masquerade as confirmed204 delete', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(response({ csrfToken: 'memory' }))
      .mockResolvedValueOnce(response({}, 205)),
  );
  await expect(
    requestApi('/recipes/' + id, { method: 'DELETE' }),
  ).rejects.toMatchObject({
    code: 'INVALID_RESPONSE',
    mutationOutcomeUncertain: true,
  });
});
