import {
  createElement as h,
  Fragment,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useLocation, matchRoute, navigationScroll } from './app/router.js';
import { EditorScreen, MyRecipes } from './features/editor/screens.js';
import { accountRoutes, editorRoutes } from './app/registry.js';
import { useTokenLink } from './app/token-link.js';
import { confirmResponse } from './features/account/forms.js';
import { AuthScreen, AccountScreen } from './features/account/screens.js';
import { requestApi } from './services/api.js';
import { navigate, safeReturnPath } from './app/router.js';
import { ErrorState, Button } from './components/ui/primitives.js';
import { useSession } from './app/session.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { KitchenShell, AuthShell } from './components/kitchen/KitchenShell.js';
import { Home, useHomeRecipes } from './features/home.js';
import { Explore } from './features/search.js';
import { RecipeDetail, PublicProfile, PageError } from './features/recipes.js';

export function App() {
  const { pathname, search, hash } = useLocation();
  const route = matchRoute(pathname);
  const accountRoute = [...accountRoutes, ...editorRoutes].find(
    (r) => r.id === route.page,
  );
  const tokenLink = useTokenLink(pathname, hash);
  const previousPath = useRef(pathname);
  const session = useSession();
  const auth = session.auth;
  const [notice, announce] = useState('');
  const [logoutPending, setLogoutPending] = useState(false);
  const logoutLock = useRef(false);
  async function logout() {
    if (logoutLock.current) return;
    logoutLock.current = true;
    setLogoutPending(true);
    try {
      const result = await requestApi('/auth/logout', { method: 'POST' });
      confirmResponse(result, 204);
      await session.transition();
      announce('Đã đăng xuất.');
      navigate('/', { replace: true });
    } catch (error) {
      session.conceal();
      const next = await session.transition();
      announce(
        error.status === 401
          ? 'Phiên đăng nhập đã hết hạn.'
          : 'Chưa xác nhận đăng xuất. Phiên đã được kiểm tra lại; bạn có thể thử lại khi kết nối ổn định.',
      );
      if (next.status !== 'authenticated')
        navigate('/auth/login', { replace: true });
    } finally {
      logoutLock.current = false;
      setLogoutPending(false);
    }
  }
  useEffect(() => {
    if (!accountRoute) return;
    if (
      accountRoute.access === 'authenticated' &&
      ['guest', 'expired'].includes(session.status)
    )
      navigate(
        '/auth/login?' +
          new URLSearchParams({
            returnTo: safeReturnPath(pathname, '/account'),
          }),
        { replace: true },
      );
    if (accountRoute.access === 'guest' && session.status === 'authenticated')
      navigate(
        safeReturnPath(new URLSearchParams(search).get('returnTo'), '/account'),
        { replace: true },
      );
  }, [pathname, search, accountRoute, session.status]);
  const home = useHomeRecipes(route.page === 'home');
  useEffect(() => {
    document.title = `${accountRoute?.title || { home: 'Góc bếp', explore: 'Khám phá', detail: 'Công thức', profile: 'Hồ sơ', forbidden: 'Không có quyền', notfound: 'Không tìm thấy' }[route.page]} · Recipe Hub`;
    if (previousPath.current !== pathname)
      document.getElementById('main')?.focus({ preventScroll: true });
    previousPath.current = pathname;
    if (hash && !['reset', 'verify'].includes(route.page)) {
      try {
        const target = document.getElementById(
          decodeURIComponent(hash.slice(1)),
        );
        target?.scrollIntoView?.();
        target?.focus?.({ preventScroll: true });
      } catch {
        /* Ignore malformed fragments. */
      }
    } else
      window.scrollTo?.({
        top: navigationScroll(pathname + search),
        behavior: 'instant',
      });
  }, [pathname, search, route.page, hash, accountRoute?.title]);
  let content;
  switch (route.page) {
    case 'home':
      content = h(Home, { auth, ...home });
      break;
    case 'explore':
      content = h(Explore, { search });
      break;
    case 'detail':
      content = h(RecipeDetail, { key: route.value, slug: route.value });
      break;
    case 'profile':
      content = h(PublicProfile, { key: route.value, userId: route.value });
      break;
    default:
      content = h(PageError, { forbidden: route.page === 'forbidden' });
  }
  if (accountRoute) {
    const privateRoute = accountRoute.access === 'authenticated';
    if (
      session.status === 'error' &&
      (privateRoute || accountRoute.access === 'guest')
    )
      content = h(
        'section',
        { className: 'page-panel' },
        h(ErrorState, {
          title: 'Chưa xác minh được phiên đăng nhập',
          onRetry: session.refresh,
        }),
      );
    else if (
      (privateRoute && session.status !== 'authenticated') ||
      (accountRoute.access === 'guest' &&
        ['unknown', 'authenticated'].includes(session.status))
    )
      content = h(
        'section',
        { className: 'page-panel', role: 'status' },
        'Đang xác minh phiên…',
      );
    else
      content =
        accountRoute.feature === 'editor'
          ? h(route.page === 'myRecipes' ? MyRecipes : EditorScreen, {
              key: pathname + session.revision,
              recipeId: route.value,
              session,
              search,
            })
          : privateRoute
            ? h(AccountScreen, {
                key: session.revision,
                kind: route.page,
                session,
                logout,
                logoutPending,
                announce,
              })
            : h(AuthScreen, {
                kind: route.page,
                session,
                tokenLink,
                search,
                announce,
              });
  }
  return h(
    pathname.startsWith('/auth/') ? AuthShell : KitchenShell,
    {
      pathname,
      auth,
    },
    h(
      Fragment,
      null,
      notice &&
        h(
          'p',
          { className: 'account-notice', role: 'status' },
          notice,
          h(
            Button,
            { className: 'button-secondary', onClick: () => announce('') },
            'Đóng thông báo',
          ),
        ),
      h(
        ErrorBoundary,
        {
          key:
            pathname +
            (route.page === 'explore' ? '' : search) +
            (accountRoute?.access === 'authenticated' ? session.revision : ''),
        },
        content,
      ),
    ),
  );
}
