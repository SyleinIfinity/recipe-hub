import { createElement as h, useEffect, useRef } from 'react';
import { useLocation, matchRoute, navigationScroll } from './app/router.js';
import { useSession } from './app/session.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { KitchenShell } from './components/kitchen/KitchenShell.js';
import { Home, ActualSuggestion, useHomeRecipes } from './features/home.js';
import { Explore } from './features/search.js';
import { RecipeDetail, PublicProfile, PageError } from './features/recipes.js';

export function App() {
  const { pathname, search, hash } = useLocation();
  const route = matchRoute(pathname);
  const previousPath = useRef(pathname);
  const session = useSession();
  const auth = session.auth;
  const home = useHomeRecipes();
  useEffect(() => {
    document.title = `${{ home: 'Góc bếp', explore: 'Khám phá', detail: 'Công thức', profile: 'Hồ sơ', forbidden: 'Không có quyền', notfound: 'Không tìm thấy' }[route.page]} · Recipe Hub`;
    if (previousPath.current !== pathname)
      document.getElementById('main')?.focus({ preventScroll: true });
    previousPath.current = pathname;
    if (hash) {
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
  }, [pathname, search, route.page, hash]);
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
  return h(
    KitchenShell,
    {
      pathname,
      auth,
      suggestion: h(ActualSuggestion, { result: home.result }),
    },
    h(ErrorBoundary, { key: pathname + search + session.revision }, content),
  );
}
