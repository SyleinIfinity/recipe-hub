import { createElement as h, useState } from 'react';
import { Link, navigate } from '../app/router.js';
import { useRead, recipeHref } from '../services/api.js';
import {
  Icon,
  SearchForm,
  FilterChip,
  RecipeImage,
} from '../components/ui/primitives.js';
import { KitchenScene } from '../components/kitchen/KitchenScene.js';
import { RecipeGrid, difficulties } from './recipes.js';

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
      'div',
      { className: 'quick-actions' },
      h(
        Link,
        { href: '/recipes', className: 'quick-action' },
        h(
          'span',
          { className: 'quick-icon' },
          h(Icon, { name: 'book', size: 36 }),
        ),
        h('span', null, 'Khám phá công thức'),
        h(Icon, { name: 'arrow' }),
      ),
    ),
    h(
      'section',
      { className: 'recipe-section', 'aria-labelledby': 'new-recipes' },
      h(
        'div',
        { className: 'section-heading' },
        h(
          'h2',
          { id: 'new-recipes' },
          h(Icon, { name: 'pot', size: 30 }),
          'Công thức mới',
        ),
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
export function ActualSuggestion({ result }) {
  const recipe =
    result.status === 'ready' && Array.isArray(result.body?.data)
      ? result.body.data.find((r) => recipeHref(r))
      : null;
  if (!recipe) return null;
  return h(
    'section',
    { className: 'card-surface suggestion' },
    h('h2', null, h(Icon, { name: 'leaf' }), 'Gợi ý hôm nay'),
    h(RecipeImage, { url: recipe.coverImageUrl }),
    h('h3', null, h(Link, { href: recipeHref(recipe) }, recipe.title)),
    h(
      'p',
      { className: 'muted' },
      [
        difficulties[recipe.difficulty],
        Number.isFinite(recipe.totalMinutes)
          ? recipe.totalMinutes + ' phút'
          : null,
      ]
        .filter(Boolean)
        .join(' · '),
    ),
  );
}
export function useHomeRecipes() {
  const [reload, setReload] = useState(0);
  return {
    result: useRead('/recipes?limit=4&sort=-publishedAt', reload),
    onRetry: () => setReload((n) => n + 1),
  };
}
