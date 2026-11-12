import { createElement as h } from 'react';
import { it, expect, vi, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import {
  MediaPicker,
  validateMediaFile,
} from '../src/features/media/MediaPicker.js';
import { invalidateSecurity } from '../src/services/api.js';
import { serializeRecipe, emptyRecipe } from '../src/features/editor/model.js';
const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
function file(type = 'image/png', bytes = png) {
  const f = new File([bytes], 'private-user-name.png', { type });
  f.arrayBuffer = async () => bytes.buffer;
  return f;
}
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
});
it.each(['recipe_cover', 'recipe_step', 'avatar'])(
  'M-U01 valid PNG purpose %s',
  async (p) => {
    await expect(validateMediaFile(file(), p)).resolves.toBeUndefined();
  },
);
it.each([
  ['image/svg+xml', new Uint8Array([60, 115])],
  ['image/jpeg', png],
  ['image/png', new Uint8Array()],
])('M-U02 rejects content/MIME %s', async (type, bytes) => {
  await expect(
    validateMediaFile(file(type, bytes), 'recipe_cover'),
  ).rejects.toThrow();
});
it('M-U03 purpose size limits enforced before buffering', async () => {
  await expect(
    validateMediaFile({ size: 2 * 1024 * 1024 + 1 }, 'avatar'),
  ).rejects.toThrow();
  await expect(
    validateMediaFile({ size: 5 * 1024 * 1024 + 1 }, 'recipe_step'),
  ).rejects.toThrow();
});
it('M-U04 removes cover/step with explicit null and preserves stable stepId', () => {
  const v = {
    ...emptyRecipe(),
    coverImageAssetId: null,
    steps: [
      {
        stepId: 'persisted',
        key: 'local',
        instruction: 'Nấu rau',
        imageAssetId: null,
      },
    ],
  };
  const body = serializeRecipe(v, 2);
  expect(body.coverImageAssetId).toBeNull();
  expect(body.steps[0].imageAssetId).toBeNull();
  expect(body.steps[0].stepId).toBe('persisted');
  expect(body.steps[0].key).toBeUndefined();
});
it('M-U05 preview distinct from upload, shared CSRF/key/purpose, no filename leak, revokes preview', async () => {
  const create = vi.fn(() => 'blob:preview'),
    revoke = vi.fn();
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }),
  );
  const fetch = vi.fn(async (path) =>
    response(
      path.endsWith('/auth/csrf')
        ? { csrfToken: 'memory' }
        : {
            assetId: 'a'.repeat(24),
            purpose: 'recipe_cover',
            status: 'temporary',
            url: null,
          },
      path.endsWith('/auth/csrf') ? 200 : 201,
    ),
  );
  vi.stubGlobal('fetch', fetch);
  const change = vi.fn(),
    pending = vi.fn();
  const ui = render(
    h(MediaPicker, {
      label: 'Ảnh bìa',
      purpose: 'recipe_cover',
      onChange: change,
      onUnresolved: pending,
    }),
  );
  fireEvent.change(screen.getByLabelText('Chọn ảnh bìa'), {
    target: { files: [file()] },
  });
  await screen.findByAltText('Xem trước cục bộ: Ảnh bìa');
  expect(change).not.toHaveBeenCalled();
  expect(pending).toHaveBeenCalledWith(true);
  fireEvent.click(screen.getByRole('button', { name: 'Tải ảnh bìa' }));
  await waitFor(() => expect(change).toHaveBeenCalledWith('a'.repeat(24)));
  const options = fetch.mock.calls.at(-1)[1];
  expect(options.headers['X-CSRF-Token']).toBe('memory');
  expect(options.headers['Idempotency-Key']).toMatch(/^[a-f0-9-]{36}$/);
  expect(options.headers['Content-Type']).toBeUndefined();
  expect(options.body.get('purpose')).toBe('recipe_cover');
  expect(options.body.get('file').name).toBe('image.png');
  ui.unmount();
  expect(revoke).toHaveBeenCalledWith('blob:preview');
});
it('M-U06 uncertain upload keeps one frozen key, no automatic retry or new selection', async () => {
  vi.stubGlobal(
    'URL',
    Object.assign(URL, {
      createObjectURL: () => 'blob:preview',
      revokeObjectURL: () => {},
    }),
  );
  const fetch = vi.fn(async (path) => {
    if (path.endsWith('/auth/csrf')) return response({ csrfToken: 'memory' });
    throw new Error('network');
  });
  vi.stubGlobal('fetch', fetch);
  render(
    h(MediaPicker, {
      label: 'Ảnh bìa',
      purpose: 'recipe_cover',
      onChange: vi.fn(),
    }),
  );
  fireEvent.change(screen.getByLabelText('Chọn ảnh bìa'), {
    target: { files: [file()] },
  });
  await screen.findByAltText('Xem trước cục bộ: Ảnh bìa');
  fireEvent.click(screen.getByRole('button', { name: 'Tải ảnh bìa' }));
  await screen.findByRole('button', { name: 'Kiểm tra lại cùng upload' });
  expect(fetch.mock.calls).toHaveLength(2);
  expect(screen.getByLabelText('Chọn ảnh bìa').disabled).toBe(true);
  fireEvent.click(
    screen.getByRole('button', { name: 'Kiểm tra lại cùng upload' }),
  );
  await waitFor(() => expect(fetch.mock.calls).toHaveLength(3));
  expect(fetch.mock.calls[1][1].headers['Idempotency-Key']).toBe(
    fetch.mock.calls[2][1].headers['Idempotency-Key'],
  );
});
