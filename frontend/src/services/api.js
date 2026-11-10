import { useEffect, useState } from 'react';

export class ApiError extends Error {
  constructor(status, code, context = {}) {
    super(code);
    this.status = status;
    this.code = code;
    Object.assign(this, context);
  }
}
const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
let csrfToken, csrfPending;
let csrfExpiresAt = 0;
let securityEpoch = 0;
const sessionListeners = new Set();
export function onSessionInvalid(callback) {
  sessionListeners.add(callback);
  return () => sessionListeners.delete(callback);
}
export function invalidateSecurity() {
  securityEpoch++;
  csrfToken = undefined;
  csrfPending = undefined;
}
export async function getCsrfToken() {
  if (csrfToken && Date.now() < csrfExpiresAt) return csrfToken;
  if (csrfPending) return csrfPending;
  const epoch = securityEpoch;
  const pending = requestApi('/auth/csrf')
    .then((body) => {
      if (epoch !== securityEpoch) throw new ApiError(0, 'CONTEXT_CHANGED');
      const token = body?.data?.csrfToken;
      if (typeof token !== 'string' || !token)
        throw new ApiError(200, 'INVALID_RESPONSE');
      csrfToken = token;
      csrfExpiresAt = Date.now() + 55 * 60 * 1000;
      return token;
    })
    .finally(() => {
      if (csrfPending === pending) csrfPending = undefined;
    });
  csrfPending = pending;
  return pending;
}
export async function requestApi(
  path,
  {
    method = 'GET',
    signal,
    body,
    timeoutMs = 8000,
    contextSensitive = false,
  } = {},
) {
  method = method.toUpperCase();
  if (
    !/^\/(?!\/)/.test(path) ||
    /[\\#]/.test(path) ||
    Array.from(path).some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    )
  )
    throw new ApiError(0, 'INVALID_PATH');
  const base = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  const baseUrl = new URL(base, window.location.origin);
  if (
    baseUrl.origin !== window.location.origin ||
    baseUrl.search ||
    baseUrl.hash
  )
    throw new ApiError(0, 'INVALID_API_BASE');
  const mutation = !safeMethods.has(method);
  const epoch = securityEpoch;
  const headers = { Accept: 'application/json' };
  if (mutation) headers['X-CSRF-Token'] = await getCsrfToken();
  if (epoch !== securityEpoch) throw new ApiError(0, 'CONTEXT_CHANGED');
  if (body !== undefined && !(body instanceof FormData))
    headers['Content-Type'] = 'application/json';
  const controller = new AbortController();
  let timedOut = false,
    dispatched = false;
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const context = {
    method,
    path: path.split('?')[0],
    mutationOutcomeUncertain: false,
  };
  try {
    if (controller.signal.aborted) throw new ApiError(0, 'ABORTED', context);
    dispatched = true;
    const response = await fetch(baseUrl.pathname.replace(/\/$/, '') + path, {
      method,
      credentials: 'include',
      signal: controller.signal,
      headers,
      ...(body === undefined
        ? {}
        : { body: body instanceof FormData ? body : JSON.stringify(body) }),
    });
    context.responseStatus = response.status;
    context.accepted = response.status === 202;
    if ((mutation || contextSensitive) && epoch !== securityEpoch)
      throw new ApiError(response.status, 'CONTEXT_CHANGED', {
        ...context,
        mutationOutcomeUncertain: mutation,
      });
    const retry = response.headers?.get('Retry-After');
    if (retry && /^\d+$/.test(retry)) context.retryAfterSeconds = Number(retry);
    else if (retry && Number.isFinite(Date.parse(retry)))
      context.retryAfterSeconds = Math.max(
        0,
        Math.ceil((Date.parse(retry) - Date.now()) / 1000),
      );
    let result;
    const media = response.headers?.get('Content-Type');
    if (response.status !== 204 && response.status !== 205) {
      if (media && !/application\/(?:[\w.-]+\+)?json/i.test(media)) {
        throw new ApiError(
          response.status,
          response.ok ? 'INVALID_RESPONSE' : 'UNAVAILABLE',
          {
            ...context,
            mutationOutcomeUncertain:
              mutation && (response.ok || response.status >= 500),
          },
        );
      }
      try {
        result = await response.json();
      } catch (error) {
        if (controller.signal.aborted) throw error;
        throw new ApiError(response.status, 'INVALID_RESPONSE', {
          ...context,
          mutationOutcomeUncertain:
            mutation && (response.ok || response.status >= 500),
        });
      }
    }
    if (
      !response.ok ||
      (response.status !== 204 &&
        response.status !== 205 &&
        result?.success !== true)
    ) {
      const code = /^[A-Z][A-Z0-9_]{0,79}$/.test(result?.error?.code || '')
        ? result.error.code
        : 'UNAVAILABLE';
      const details = Array.isArray(result?.error?.details)
        ? result.error.details
            .filter(
              (d) =>
                d &&
                typeof d.field === 'string' &&
                /^[a-zA-Z][\w.]{0,100}$/.test(d.field) &&
                !/passwordHash|token|secret|authorization/i.test(d.field),
            )
            .map((d) => ({
              field: d.field,
              code: /^[a-zA-Z_]{1,60}$/.test(d.code || '') ? d.code : 'invalid',
            }))
        : [];
      if (
        response.status === 401 &&
        code !== 'INVALID_CREDENTIALS' &&
        epoch === securityEpoch
      ) {
        invalidateSecurity();
        sessionListeners.forEach((cb) => cb());
      }
      if (code === 'CSRF_INVALID') invalidateSecurity();
      throw new ApiError(response.status, code, {
        ...context,
        details,
        mutationOutcomeUncertain: mutation && response.status >= 500,
      });
    }
    if (
      result === undefined &&
      response.status !== 204 &&
      response.status !== 205
    )
      throw new ApiError(response.status, 'INVALID_RESPONSE', context);
    if ((mutation || contextSensitive) && epoch !== securityEpoch)
      throw new ApiError(response.status, 'CONTEXT_CHANGED', {
        ...context,
        mutationOutcomeUncertain: mutation,
      });
    return result
      ? {
          ...result,
          http: { status: response.status, accepted: response.status === 202 },
        }
      : null;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      0,
      timedOut
        ? 'TIMEOUT'
        : controller.signal.aborted
          ? 'ABORTED'
          : 'NETWORK_ERROR',
      { ...context, mutationOutcomeUncertain: mutation && dispatched },
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
export const readApi = (path, options) => requestApi(path, options);
export function asyncPhase(result) {
  if (result.status === 'idle') return 'initial';
  if (result.status !== 'error')
    return result.status === 'ready' &&
      Array.isArray(result.body?.data) &&
      !result.body.data.length
      ? 'empty'
      : result.status;
  if (result.error?.status === 401) return 'unauthorized';
  if (result.error?.status === 403) return 'forbidden';
  if (result.error?.code === 'CONTEXT_CHANGED') return 'stale';
  return !result.error?.status || result.error.status >= 500
    ? 'unavailable'
    : 'error';
}
export function useRead(
  path,
  reload = 0,
  { privateRequest = false, revision = 0 } = {},
) {
  const [result, setResult] = useState({
    path: null,
    reload: -1,
    status: 'loading',
  });
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    let active = true;
    readApi(path, {
      signal: controller.signal,
      contextSensitive: privateRequest,
    })
      .then((body) => {
        if (active)
          setResult({ path, reload, revision, status: 'ready', body });
      })
      .catch((error) => {
        if (active)
          setResult({ path, reload, revision, status: 'error', error });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [path, reload, revision, privateRequest]);
  if (!path) return { status: 'idle' };
  // A location change must never flash the previous recipe/profile while its request loads.
  return result.path === path &&
    result.reload === reload &&
    result.revision === revision
    ? { ...result, phase: asyncPhase(result) }
    : { status: 'loading', phase: 'loading' };
}
const fields = new Set([
  'q',
  'category',
  'tag',
  'difficulty',
  'maxMinutes',
  'ingredientIds',
  'ingredientMatch',
  'page',
  'limit',
  'sort',
]);
export function searchQuery(search) {
  const params = new URLSearchParams(search);
  for (const [key] of params)
    if (!fields.has(key) || params.getAll(key).length !== 1)
      return { error: 'Bộ lọc không hợp lệ.' };
  if (
    params.has('q') &&
    (!params.get('q').trim() || params.get('q').length > 120)
  )
    return { error: 'Từ khóa cần từ 1 đến 120 ký tự.' };
  return {
    params,
    path: '/recipes' + (params.size ? '?' + params.toString() : ''),
  };
}
export function recipeHref(recipe) {
  return typeof recipe?.slug === 'string' &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(recipe.slug) &&
    recipe.slug.length <= 200
    ? '/recipes/' + recipe.slug
    : null;
}
export function profileHref(user) {
  return /^[a-fA-F0-9]{24}$/.test(user?.id || '') ? '/users/' + user.id : null;
}
