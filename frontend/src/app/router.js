import { createElement as h, useSyncExternalStore } from 'react';

let navigationAction = 'direct';
const scrollPositions = new Map();
export function rememberScroll() {
  scrollPositions.set(
    window.location.pathname + window.location.search,
    window.scrollY,
  );
  if (scrollPositions.size > 100)
    scrollPositions.delete(scrollPositions.keys().next().value);
}
export function navigationScroll(path) {
  return navigationAction === 'pop' ? scrollPositions.get(path) || 0 : 0;
}
const changed = () => window.dispatchEvent(new Event('popstate'));
export function navigate(href, { replace = false } = {}) {
  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin) return;
  rememberScroll();
  navigationAction = 'push';
  window.history[replace ? 'replaceState' : 'pushState'](
    null,
    '',
    url.pathname + url.search + url.hash,
  );
  changed();
}
export function Link({ href, children, onClick, ...props }) {
  return h(
    'a',
    {
      ...props,
      href,
      onClick(event) {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          props.target ||
          (props.download !== undefined && props.download !== false)
        )
          return;
        if (
          new URL(href, window.location.href).origin !== window.location.origin
        )
          return;
        event.preventDefault();
        navigate(href);
      },
    },
    children,
  );
}
const subscribe = (callback) => {
  const pop = (event) => {
    if (event instanceof PopStateEvent) navigationAction = 'pop';
    callback();
  };
  window.addEventListener('popstate', pop);
  window.addEventListener('scroll', rememberScroll, { passive: true });
  window.addEventListener('hashchange', callback);
  return () => {
    window.removeEventListener('popstate', pop);
    window.removeEventListener('scroll', rememberScroll);
    window.removeEventListener('hashchange', callback);
  };
};
const snapshot = () =>
  window.location.pathname + window.location.search + window.location.hash;
export function useLocation() {
  const location = useSyncExternalStore(subscribe, snapshot);
  const url = new URL(location, window.location.origin);
  return { pathname: url.pathname, search: url.search, hash: url.hash };
}
export function matchRoute(pathname) {
  if (pathname === '/') return { page: 'home' };
  if (pathname === '/recipes') return { page: 'explore' };
  if (pathname === '/forbidden') return { page: 'forbidden' };
  const recipe = /^\/recipes\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(pathname);
  if (recipe && recipe[1].length <= 200)
    return { page: 'detail', value: recipe[1] };
  const profile = /^\/users\/([a-fA-F0-9]{24})$/.exec(pathname);
  if (profile) return { page: 'profile', value: profile[1] };
  return { page: 'notfound' };
}

export function safeReturnPath(value, fallback = '/') {
  if (
    typeof value !== 'string' ||
    value.length > 2048 ||
    !value.startsWith('/') ||
    value.startsWith('//')
  )
    return fallback;
  let decoded;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  if (
    /\\/.test(decoded) ||
    Array.from(decoded).some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    ) ||
    /[\p{Cc}\p{Cf}]/u.test(decoded) ||
    decoded.startsWith('//') ||
    /%[0-9a-f]{2}/i.test(decoded)
  )
    return fallback;
  const url = new URL(value, window.location.origin);
  if (
    url.origin !== window.location.origin ||
    url.hash ||
    matchRoute(url.pathname).page === 'notfound'
  )
    return fallback;
  // Only public, implemented destinations; no credentials or token-bearing queries.
  const allowed = new Set([
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
  for (const [key] of url.searchParams)
    if (
      !allowed.has(key) ||
      url.pathname !== '/recipes' ||
      url.searchParams.getAll(key).length !== 1
    )
      return fallback;
  return url.pathname + url.search;
}
