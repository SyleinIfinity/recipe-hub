import { createElement as h } from 'react';
import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react';
import { App } from '../src/App.js';
import {
  validate,
  authError,
  confirmResponse,
} from '../src/features/account/forms.js';
import { safeReturnPath, matchRoute } from '../src/app/router.js';
import { invalidateSecurity } from '../src/services/api.js';
const user = {
  id: 'a'.repeat(24),
  displayName: 'Bếp tài khoản',
  email: 'account@example.test',
  status: 'active',
  role: 'user',
  bio: 'Giới thiệu',
  preferences: {
    timezone: 'Asia/Ho_Chi_Minh',
    maxPrepMinutes: null,
    recommendationOptIn: false,
  },
};
const response = (data, status = 200, code = 'UNAUTHENTICATED') => ({
  status,
  ok: status < 400,
  headers: new Headers({ 'Content-Type': 'application/json' }),
  json: async () =>
    status < 400
      ? { success: true, data }
      : { success: false, error: { code } },
});
function transport({ loggedIn = false, loginError, profileError } = {}) {
  let authenticated = loggedIn;
  const fetch = vi.fn(async (url, options) => {
    const path = url.replace('/api/v1', '');
    if (path === '/auth/csrf') return response({ csrfToken: 'unit-only-csrf' });
    if (path === '/auth/me')
      return authenticated ? response(user) : response(null, 401);
    if (path === '/auth/login') {
      if (loginError) return response(null, 401, 'INVALID_CREDENTIALS');
      authenticated = true;
      return response(user);
    }
    if (path === '/auth/register') return response(user, 201);
    if (path === '/auth/logout') {
      authenticated = false;
      return response(null, 204);
    }
    if (path === '/me/profile')
      return profileError
        ? response(null, 403, 'CSRF_INVALID')
        : response({ ...user, ...JSON.parse(options.body) });
    if (path === '/health') return response({ status: 'ready' });
    if (path.startsWith('/recipes')) return response([]);
    return response({}, 202);
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
beforeEach(() => {
  window.history.replaceState({}, '', '/');
  invalidateSecurity();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  invalidateSecurity();
});
it.each(['', 'short', ' '.repeat(12), 'x'.repeat(129)])(
  'ACC-U01 Backend new password bounds reject input',
  (value) => {
    expect(
      validate({ newPassword: value, confirmPassword: value }, 'reset')
        .newPassword,
    ).toBeTruthy();
  },
);
it('ACC-U02 preserves password whitespace and permits Backend-supported multiline bio', () => {
  expect(
    validate(
      { password: '  valid password  ', confirmPassword: '  valid password  ' },
      'register',
    ),
  ).toEqual({});
  expect(validate({ bio: 'Dòng1\nDòng2\t' }, 'editProfile')).toEqual({});
  expect(
    validate(
      {
        currentPassword: 'x',
        newPassword: 'x'.repeat(12),
        confirmPassword: 'wrong',
      },
      'password',
    ).confirmPassword,
  ).toBeTruthy();
});
it.each([
  { displayName: 'x' },
  { email: 'bad' },
  { bio: 'x'.repeat(501) },
  { timezone: 'invalid/zone' },
  { maxPrepMinutes: '1441' },
])('ACC-U03 field validation rejects unsupported value', (value) =>
  expect(Object.keys(validate(value, 'settings')).length).toBeGreaterThan(0),
);
it.each([
  '/account',
  '/account/profile',
  '/account/settings',
  '/account/change-password',
])(
  'ACC-U04 safe return supports implemented private destination %s',
  (path) => {
    expect(safeReturnPath(path)).toBe(path);
    expect(matchRoute(path).page).not.toBe('notfound');
  },
);
it.each([
  '/auth/login',
  '/auth/register',
  '/auth/verify-email#token=secret',
  '//evil.test',
  '/account?token=secret',
])('ACC-U05 return rejects auth loop/secret/external %s', (path) =>
  expect(safeReturnPath(path)).toBe('/'),
);
it('ACC-U06 guest protected route has no private data and gets safe login destination', async () => {
  transport();
  window.history.replaceState({}, '', '/account/profile');
  render(h(App));
  await screen.findByRole('heading', { name: 'Đăng nhập', level: 1 });
  expect(window.location.search).toBe('?returnTo=%2Faccount%2Fprofile');
  expect(screen.queryByText(user.email)).toBeNull();
});
it('ACC-U07 Login verifies identity, rejects external return and uses CSRF without storage', async () => {
  const fetch = transport();
  window.history.replaceState({}, '', '/auth/login?returnTo=https://evil.test');
  render(h(App));
  await screen.findByRole('button', { name: 'Đăng nhập', exact: true });
  fireEvent.change(screen.getByLabelText('Email *'), {
    target: { value: user.email },
  });
  fireEvent.change(screen.getByLabelText('Mật khẩu *', { exact: true }), {
    target: { value: ' valid password ' },
  });
  fireEvent.submit(screen.getByRole('form', { name: 'Đăng nhập' }));
  await screen.findByRole('heading', { name: 'Tài khoản của tôi', level: 1 });
  const call = fetch.mock.calls.find(([url]) => url.endsWith('/auth/login'));
  expect(call[1].headers['X-CSRF-Token']).toBe('unit-only-csrf');
  expect(JSON.parse(call[1].body).password === ' valid password ').toBe(true);
  expect(window.location.pathname).toBe('/account');
  expect(localStorage.length + sessionStorage.length).toBe(0);
});
it('ACC-U08 invalid credentials remain guest, confirmation and password toggle are accessible', async () => {
  const fetch = transport({ loginError: true });
  window.history.replaceState({}, '', '/auth/login');
  render(h(App));
  const input = await screen.findByLabelText('Mật khẩu *', { exact: true });
  fireEvent.click(
    screen.getByRole('button', { name: 'Hiện mật khẩu', exact: true }),
  );
  expect(input.type).toBe('text');
  fireEvent.click(
    screen.getByRole('button', { name: 'Ẩn mật khẩu', exact: true }),
  );
  expect(input.type).toBe('password');
  fireEvent.change(screen.getByLabelText('Email *'), {
    target: { value: user.email },
  });
  fireEvent.change(input, { target: { value: 'wrong' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Đăng nhập' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('alert').textContent).toContain('Thông tin xác thực');
  expect(
    fetch.mock.calls.filter(([url]) => url.endsWith('/auth/login')),
  ).toHaveLength(1);
  expect(screen.queryByText(user.email)).toBeNull();
});
it('ACC-U09 Register confirm is frontend only and never auto logs in', async () => {
  const fetch = transport();
  window.history.replaceState({}, '', '/auth/register');
  render(h(App));
  await screen.findByRole('button', { name: 'Tạo tài khoản' });
  for (const [label, value] of [
    ['Tên hiển thị *', 'Bếp đăng ký'],
    ['Email *', user.email],
    ['Mật khẩu *', 'Registration password'],
    ['Xác nhận mật khẩu *', 'Registration password'],
  ])
    fireEvent.change(screen.getByLabelText(label, { exact: true }), {
      target: { value },
    });
  fireEvent.submit(screen.getByRole('form', { name: 'Đăng ký' }));
  await screen.findByText(/Đã tạo tài khoản/);
  const body = JSON.parse(
    fetch.mock.calls.find(([url]) => url.endsWith('/auth/register'))[1].body,
  );
  expect(Object.keys(body).sort()).toEqual([
    'displayName',
    'email',
    'password',
  ]);
  expect(fetch.mock.calls.some(([url]) => url.endsWith('/auth/login'))).toBe(
    false,
  );
  expect(screen.queryByLabelText('Mật khẩu *', { exact: true })).toBeNull();
});
it('ACC-U10 fragment is scrubbed before rendering; verify never auto posts', async () => {
  const fetch = transport();
  window.history.replaceState(
    {},
    '',
    '/auth/verify-email#token=' + 'z'.repeat(43),
  );
  const { container } = render(h(App));
  await screen.findByRole('button', { name: 'Xác nhận xác minh email' });
  expect(window.location.hash).toBe('');
  expect(container.textContent).not.toContain('z'.repeat(43));
  expect(
    fetch.mock.calls.some(([url]) => url.endsWith('/auth/verify-email')),
  ).toBe(false);
});
it('ACC-U11 missing reset token creates no submit action', async () => {
  transport();
  window.history.replaceState({}, '', '/auth/reset-password');
  render(h(App));
  await screen.findByRole('alert');
  expect(
    screen.queryByRole('button', { name: 'Đặt lại mật khẩu', exact: true }),
  ).toBeNull();
});
it('ACC-U12 profile whitelist and CSRF invalid remain explicit, never automatically retried', async () => {
  const fetch = transport({ loggedIn: true, profileError: true });
  window.history.replaceState({}, '', '/account/profile');
  render(h(App));
  await screen.findByLabelText('Tên hiển thị *');
  fireEvent.change(screen.getByLabelText('Tên hiển thị *'), {
    target: { value: 'Tên cập nhật' },
  });
  expect(screen.getByText('Có thay đổi chưa lưu.')).toBeTruthy();
  fireEvent.submit(screen.getByRole('form', { name: 'Chỉnh sửa hồ sơ' }));
  await screen.findByRole('alert');
  const calls = fetch.mock.calls.filter(([url]) => url.endsWith('/me/profile'));
  expect(calls).toHaveLength(1);
  expect(Object.keys(JSON.parse(calls[0][1].body)).sort()).toEqual([
    'bio',
    'displayName',
  ]);
  expect(screen.getByRole('button', { name: 'Lưu thay đổi' }).disabled).toBe(
    true,
  );
});
it('ACC-U13 uncertain errors never use raw server messages', () => {
  expect(
    authError({ mutationOutcomeUncertain: true, message: 'raw-secret' }),
  ).not.toContain('raw-secret');
  expect(
    authError({ code: 'EMAIL_UNAVAILABLE', mutationOutcomeUncertain: true }),
  ).toContain('Dịch vụ email');
  expect(authError({ code: 'CSRF_INVALID' })).toContain('Phiên bảo vệ');
  expect(authError({ code: 'INVALID_TOKEN' })).toContain('hết hạn');
});
it('ACC-U14 Logout revokes backend session, clears private page and secret fields', async () => {
  const fetch = transport({ loggedIn: true });
  window.history.replaceState({}, '', '/account');
  render(h(App));
  await screen.findByRole('button', { name: 'Đăng xuất' });
  fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
  await waitFor(() => expect(window.location.pathname).toBe('/'));
  expect(screen.queryByText(user.email)).toBeNull();
  expect(
    fetch.mock.calls.filter(([url]) => url.endsWith('/auth/logout')),
  ).toHaveLength(1);
});

it('ACC-U15 never treats an unexpected 202 as a saved profile or completed logout', () => {
  expect(() =>
    confirmResponse({ http: { status: 202, accepted: true } }, 200),
  ).toThrow();
  expect(() =>
    confirmResponse({ http: { status: 202, accepted: true } }, 204),
  ).toThrow();
  expect(() =>
    confirmResponse({ http: { status: 202, accepted: true } }, 202),
  ).not.toThrow();
  expect(() => confirmResponse(null, 204)).not.toThrow();
});
