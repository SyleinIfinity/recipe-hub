import { createElement as h, useState } from 'react';
import { Link, navigate } from '../app/router.js';
import { useRead } from '../services/api.js';
import { Icon, SearchForm, FilterChip } from '../components/ui/primitives.js';
import { KitchenScene } from '../components/kitchen/KitchenScene.js';
import { RecipeGrid } from './recipes.js';

export function Home({ auth, result, onRetry }) {
  const name =
    auth.status === 'ready' && typeof auth.body?.data?.displayName === 'string'
      ? auth.body.data.displayName
      : null;
  return h(
    'div',
    { className: 'home-page' },
    h(
      'section',
      { className: 'kitchen-hero', 'aria-labelledby': 'home-heading' },
      h(KitchenScene),
      h(
        'div',
        { className: 'hero-content' },
        h(
          'h1',
          { id: 'home-heading' },
          name ? `Chào mừng trở lại, ${name}!` : 'Hôm nay nấu món gì?',
        ),
        h(SearchForm, {
          id: 'home-search',
          onSearch: (q) =>
            navigate('/recipes' + (q ? '?' + new URLSearchParams({ q }) : '')),
        }),
        h(
          'div',
          { className: 'hero-chips' },
          h(FilterChip, { href: '/recipes?maxMinutes=30' }, '≤ 30 phút'),
        ),
      ),
    ),
    h(
      'section',
      { className: 'recipe-section', 'aria-labelledby': 'new-recipes' },
      h(
        'div',
        { className: 'section-heading' },
        h('h2', { id: 'new-recipes' }, 'Công thức mới'),
        h(
          Link,
          { href: '/recipes', className: 'text-link' },
          'Xem tất cả ',
          h(Icon, { name: 'arrow', size: 18 }),
        ),
      ),
      h(RecipeGrid, { result, onRetry }),
    ),
  );
}
export function useHomeRecipes(enabled = true) {
  const [reload, setReload] = useState(0);
  return {
    result: useRead(
      enabled ? '/recipes?limit=4&sort=-publishedAt' : null,
      reload,
    ),
    onRetry: () => setReload((n) => n + 1),
  };
}
