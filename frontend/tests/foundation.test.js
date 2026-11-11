import { createElement as h } from 'react';
import { it, expect, vi, afterEach } from 'vitest';
import {
  render,
  screen,
  cleanup,
  act,
  fireEvent,
} from '@testing-library/react';
import {
  requestApi,
  invalidateSecurity,
  getCsrfToken,
  asyncPhase,
} from '../src/services/api.js';
import {
  safeReturnPath,
  Link,
  useLocation,
  navigate,
  navigationScroll,
} from '../src/app/router.js';
import { useSession } from '../src/app/session.js';
import {
  routeAccess,
  featureAvailable,
  navigationRoutes,
} from '../src/app/registry.js';
import { ErrorBoundary } from '../src/components/ErrorBoundary.js';
const response = (
  status,
  data = {},
  code,
  media = 'application/json',
  retry = null,
) => ({
  status,
  ok: status < 400,
  headers: new Headers({
    'Content-Type': media,
    ...(retry ? { 'Retry-After': retry } : {}),
  }),
  json: vi.fn(async () =>
    code
      ? {
          success: false,
          error: {
            code,
            message: 'secret',
            details: [
              {
                field: 'displayName',
                code: 'invalid_type',
                message: 'private',
              },
              { field: 'passwordHash', code: 'secret' },
            ],
          },
        }
      : { success: true, data },
  ),
});
afterEach(() => {
  cleanup();
  invalidateSecurity();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  window.history.replaceState({}, '', '/');
});
it.each([
  '/recipes?q=canh+rau',
  '/recipes?q=canh%20rau',
  '/recipes/canh-rau',
  '/users/aaaaaaaaaaaaaaaaaaaaaaaa',
  '/',
])('accepts safe implemented return %s', (value) =>
  expect(safeReturnPath(value)).toBe(value),
);
it.each([
  'https://evil.test',
  '//evil.test',
  '/\\evil',
  '/%2f%2fevil',
  '/%252f%252fevil',
  '/%0aevil',
  '/login',
  '/auth/login',
  '/recipes?token=secret',
  '/recipes#token',
  '/recipes?q=x&q=y',
  '/recipes/%ZZ',
  '/recipes?returnTo=/login',
])('rejects hostile return %s', (value) =>
  expect(safeReturnPath(value)).toBe('/'),
);
it.each([200, 201, 202])('adopts successful envelope %i', async (status) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(response(status, { id: 'server-id' })),
  );
  expect((await requestApi('/recipes')).data.id).toBe('server-id');
});
it.each([401, 403, 409, 413, 415, 422, 429, 500, 503])(
  'normalizes %i without raw secrets',
  async (status) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          response(
            status,
            {},
            status === 403 ? 'CSRF_INVALID' : 'ERROR_CODE',
            'application/json',
            '12',
          ),
        ),
    );
    const error = await requestApi('/recipes').catch((e) => e);
    expect(error.status).toBe(status);
    expect(error.retryAfterSeconds).toBe(12);
    expect(error.details).toEqual([
      { field: 'displayName', code: 'invalid_type' },
    ]);
    expect(JSON.stringify(error)).not.toContain('private');
    expect(JSON.stringify(error)).not.toContain('passwordHash');
  },
);
it('does not parse 204 and rejects HTML success', async () => {
  const noBody = response(204);
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(noBody)
      .mockResolvedValueOnce(response(200, {}, null, 'text/html')),
  );
  expect(await requestApi('/recipes')).toBeNull();
  expect(noBody.json).not.toHaveBeenCalled();
  await expect(requestApi('/recipes')).rejects.toMatchObject({
    code: 'INVALID_RESPONSE',
  });
});
it('shares in-memory CSRF retrieval, injects only mutations, invalidates without replay', async () => {
  const fetch = vi.fn(async (url) =>
    response(
      200,
      url.endsWith('/auth/csrf') ? { csrfToken: 'test-only-token' } : {},
    ),
  );
  vi.stubGlobal('fetch', fetch);
  await Promise.all([getCsrfToken(), getCsrfToken()]);
  expect(fetch).toHaveBeenCalledTimes(1);
  await requestApi('/recipes');
  expect(fetch.mock.calls.at(-1)[1].headers['X-CSRF-Token']).toBeUndefined();
  await requestApi('/recipes', { method: 'PATCH', body: { title: 'new' } });
  expect(fetch.mock.calls.at(-1)[1].headers['X-CSRF-Token']).toBe(
    'test-only-token',
  );
  expect(fetch.mock.calls.at(-1)[1].credentials).toBe('include');
  invalidateSecurity();
  await getCsrfToken();
  expect(
    fetch.mock.calls.filter(([url]) => url.endsWith('/auth/csrf')),
  ).toHaveLength(2);
  expect(localStorage.length).toBe(0);
});
it('discards a CSRF retrieval completing after a session transition', async () => {
  let resolve;
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise((r) => (resolve = r))),
  );
  const token = getCsrfToken();
  invalidateSecurity();
  resolve(response(200, { csrfToken: 'old-context' }));
  await expect(token).rejects.toMatchObject({ code: 'CONTEXT_CHANGED' });
});
it('never automatically retries failed mutations', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(response(200, { csrfToken: 'test' }))
    .mockResolvedValueOnce(response(403, {}, 'CSRF_INVALID'));
  vi.stubGlobal('fetch', fetch);
  await expect(
    requestApi('/recipes', { method: 'DELETE' }),
  ).rejects.toMatchObject({
    code: 'CSRF_INVALID',
    mutationOutcomeUncertain: false,
  });
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('times out and marks dispatched mutation outcome uncertain', async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(response(200, { csrfToken: 'test' }))
      .mockImplementationOnce(
        (_url, options) =>
          new Promise((_r, reject) =>
            options.signal.addEventListener('abort', () =>
              reject(new Error('abort')),
            ),
          ),
      ),
  );
  const request = requestApi('/recipes', {
    method: 'POST',
    body: {},
    timeoutMs: 10,
  });
  const assertion = expect(request).rejects.toMatchObject({
    code: 'TIMEOUT',
    mutationOutcomeUncertain: true,
  });
  await vi.advanceTimersByTimeAsync(20);
  await assertion;
});
it('honors pre-aborted requests before dispatch', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const controller = new AbortController();
  controller.abort();
  await expect(
    requestApi('/recipes', { signal: controller.signal }),
  ).rejects.toMatchObject({ code: 'ABORTED', mutationOutcomeUncertain: false });
  expect(fetch).not.toHaveBeenCalled();
});
it('session clears confirmed identity before refresh and on unauthorized', async () => {
  let session;
  let next;
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      response(200, { id: 'owner', displayName: 'Bếp thật', role: 'user' }),
    )
    .mockImplementationOnce(() => new Promise((r) => (next = r)))
    .mockResolvedValue(response(401, {}, 'UNAUTHORIZED'));
  vi.stubGlobal('fetch', fetch);
  function Probe() {
    session = useSession();
    return h(
      'p',
      null,
      session.status + ':' + (session.body?.data?.displayName || ''),
    );
  }
  render(h(Probe));
  await screen.findByText('authenticated:Bếp thật');
  let pending;
  act(() => {
    pending = session.refresh();
  });
  expect(screen.getByText('unknown:')).toBeTruthy();
  await act(async () => {
    next(response(200, { displayName: 'Bếp mới' }));
    await pending;
  });
  await screen.findByText('authenticated:Bếp mới');
  await act(async () => {
    await requestApi('/me').catch(() => {});
  });
  expect(screen.getByText('expired:')).toBeTruthy();
});
it('keeps error distinct from guest', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  function Probe() {
    return h('p', null, useSession().status);
  }
  render(h(Probe));
  await screen.findByText('error');
});
it('guards and availability fail closed', () => {
  expect(featureAvailable('authentication')).toBe(true);
  expect(navigationRoutes.map((r) => r.pattern)).toEqual(['/', '/recipes']);
  for (const f of ['editor', 'admin', 'social', 'p2'])
    expect(featureAvailable(f)).toBe(false);
  expect(routeAccess('admin', { status: 'unknown' })).toBe('pending');
  expect(routeAccess('authenticated', { status: 'guest' })).toBe(
    'unauthorized',
  );
  const session = {
    status: 'authenticated',
    body: { data: { id: 'one', role: 'user' } },
  };
  expect(routeAccess('admin', session)).toBe('forbidden');
  expect(routeAccess('owner', session, 'two')).toBe('forbidden');
  expect(routeAccess('owner', session, 'one')).toBe('allowed');
  expect(
    routeAccess('admin', { ...session, body: { data: { role: 'admin' } } }),
  ).toBe('allowed');
});
it('boundary contains render failures and offers native recovery', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  function Broken() {
    throw new Error('private stack');
  }
  render(h(ErrorBoundary, null, h(Broken)));
  expect(screen.getByRole('alert').textContent).not.toContain('private stack');
  expect(screen.getByRole('button', { name: 'Tải lại trang' })).toBeTruthy();
  expect(screen.getByRole('link').getAttribute('href')).toBe('/');
});
it('links preserve modifier clicks and location tracks fragments', () => {
  function Probe() {
    return h(
      'div',
      null,
      h(Link, { href: '/recipes#main' }, 'Go'),
      h('p', null, useLocation().hash || 'none'),
    );
  }
  render(h(Probe));
  const push = vi.spyOn(window.history, 'pushState');
  fireEvent.click(screen.getByRole('link'), { ctrlKey: true });
  expect(push).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('link'));
  expect(push).toHaveBeenCalledOnce();
  expect(screen.getByText('#main')).toBeTruthy();
});
it('async phases distinguish empty, forbidden, unauthorized and unavailable', () => {
  expect(asyncPhase({ status: 'ready', body: { data: [] } })).toBe('empty');
  for (const [status, phase] of [
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [503, 'unavailable'],
    [422, 'error'],
  ])
    expect(asyncPhase({ status: 'error', error: { status } })).toBe(phase);
});

it('202 remains accepted and 201 retains server resource', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(response(202, { message: 'accepted' }))
      .mockResolvedValueOnce(response(201, { id: 'server-generated' })),
  );
  expect((await requestApi('/recipes')).http).toEqual({
    status: 202,
    accepted: true,
  });
  expect((await requestApi('/recipes')).data.id).toBe('server-generated');
});
it('invalid credentials do not expire an existing confirmed session', async () => {
  let session;
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(response(200, { displayName: 'Confirmed' }))
      .mockResolvedValueOnce(response(401, {}, 'INVALID_CREDENTIALS')),
  );
  function Probe() {
    session = useSession();
    return h('p', null, session.status);
  }
  render(h(Probe));
  await screen.findByText('authenticated');
  await act(async () => {
    await requestApi('/auth/login').catch(() => {});
  });
  expect(session.status).toBe('authenticated');
});

it('rejects private data from a former security context', async () => {
  let resolve;
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise((r) => (resolve = r))),
  );
  const request = requestApi('/me', { contextSensitive: true });
  invalidateSecurity();
  resolve(response(200, { email: 'former-user@example.test' }));
  await expect(request).rejects.toMatchObject({
    code: 'CONTEXT_CHANGED',
    mutationOutcomeUncertain: false,
  });
});

it('scroll positions are retained for Back/Forward, new navigation starts at top', () => {
  function Probe() {
    useLocation();
    return null;
  }
  render(h(Probe));
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(123);
  act(() => navigate('/recipes'));
  expect(navigationScroll('/')).toBe(0);
  act(() => window.dispatchEvent(new PopStateEvent('popstate')));
  expect(navigationScroll('/')).toBe(123);
});

it('timeout includes slow response body and retains uncertain mutation outcome', async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(response(200, { csrfToken: 'test' }))
      .mockImplementationOnce(async (_url, options) => ({
        ...response(200),
        json: () =>
          new Promise((_resolve, reject) =>
            options.signal.addEventListener('abort', () =>
              reject(new Error('aborted body')),
            ),
          ),
      })),
  );
  const request = requestApi('/recipes', {
    method: 'POST',
    body: {},
    timeoutMs: 10,
  });
  const assertion = expect(request).rejects.toMatchObject({
    status: 0,
    responseStatus: 200,
    code: 'TIMEOUT',
    mutationOutcomeUncertain: true,
  });
  await vi.advanceTimersByTimeAsync(20);
  await assertion;
});

it('preserves empty download attributes and resolves local fragments against current route', () => {
  window.history.replaceState({}, '', '/recipes?q=canh');
  const push = vi.spyOn(window.history, 'pushState');
  const { rerender } = render(
    h(Link, { href: '/assets/example', download: '' }, 'Download'),
  );
  fireEvent.click(screen.getByRole('link'));
  expect(push).not.toHaveBeenCalled();
  rerender(h(Link, { href: '#main' }, 'Fragment'));
  fireEvent.click(screen.getByRole('link'));
  expect(
    window.location.pathname + window.location.search + window.location.hash,
  ).toBe('/recipes?q=canh#main');
});
