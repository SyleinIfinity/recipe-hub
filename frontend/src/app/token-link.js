import { useLayoutEffect, useState } from 'react';
const tokenPaths = new Set(['/auth/reset-password', '/auth/verify-email']);
export function useTokenLink(pathname, hash) {
  const [capture, setCapture] = useState({ path: null, token: null });
  useLayoutEffect(() => {
    if (!tokenPaths.has(pathname)) {
      setCapture((previous) =>
        previous.path ? { path: null, token: null } : previous,
      );
      return;
    }
    const url = new URL(window.location.href);
    if (url.hash || url.search) {
      const values = new URLSearchParams(url.hash.slice(1));
      const token =
        values.size === 1 &&
        values.getAll('token').length === 1 &&
        /^[A-Za-z0-9_-]{43}$/.test(values.get('token') || '')
          ? values.get('token')
          : null;
      window.history.replaceState(window.history.state, '', pathname);
      setCapture({ path: pathname, token });
    } else
      setCapture((previous) =>
        previous.path === pathname ? previous : { path: pathname, token: null },
      );
  }, [pathname, hash]);
  return {
    token: capture.path === pathname ? capture.token : null,
    clear: () => setCapture({ path: pathname, token: null }),
  };
}
