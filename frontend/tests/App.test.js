import { afterEach, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { App } from '../src/App.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('shows success only after the API reports ready', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { status: 'ready' } }),
    }),
  );
  render(createElement(App));
  expect(await screen.findByText('Kết nối thành công')).toBeTruthy();
});
it('shows unavailable when API returns 503', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue({ ok: false, json: async () => ({ success: false }) }),
  );
  render(createElement(App));
  expect(await screen.findByText('Chưa thể kết nối dịch vụ')).toBeTruthy();
});
it('shows unavailable on a network failure', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  render(createElement(App));
  expect(await screen.findByText('Chưa thể kết nối dịch vụ')).toBeTruthy();
});
