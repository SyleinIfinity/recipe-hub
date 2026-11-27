import { createElement as h, useEffect, useState } from 'react';
import { Link, navigate } from '../app/router.js';
import {
  libraryHref,
  libraryTabs,
  listLocation,
} from '../app/library-location.js';
import { recipeHref, useRead } from '../services/api.js';
import { ErrorState, Icon, RecipeImage } from '../components/ui/primitives.js';
import { RecipePagination } from '../components/ui/RecipePagination.js';
import { InteractionScope, RecipeActions } from './community/interactions.js';
import { RecipeCard } from './recipes.js';

const emptyMessage = {
  published: 'Bạn chưa đăng công thức nào.',
  draft: 'Bạn chưa có bản nháp.',
  saved: 'Bạn chưa lưu công thức nào.',
  favorites: 'Bạn chưa thích công thức nào.',
};
const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
});

function OwnerRecipeRow({ recipe }) {
  const hidden = recipe.moderationStatus === 'hidden';
  const published = recipe.status === 'published';
  const date = published ? recipe.publishedAt : recipe.updatedAt;
  const publicHref = published && !hidden ? recipeHref(recipe) : null;
  const title = recipe.title || 'Bản nháp chưa có tên';
  return h(
    'li',
    null,
    h(
      'div',
      { className: 'draft-thumb' },
      recipe.coverImageUrl && !hidden
        ? h(RecipeImage, { url: recipe.coverImageUrl })
        : h(Icon, { name: 'book', size: 24 }),
    ),
    h(
      'div',
      { className: 'draft-name' },
      h('h2', null, publicHref ? h(Link, { href: publicHref }, title) : title),
      h(
        'span',
        null,
        hidden
          ? 'Đang bị ẩn bởi kiểm duyệt'
          : published
            ? 'Đang công khai'
            : 'Bản nháp',
      ),
    ),
    date &&
      Number.isFinite(Date.parse(date)) &&
      h(
        'time',
        { dateTime: date },
        (published ? 'Đăng ngày ' : 'Cập nhật ') +
          dateFormat.format(new Date(date)),
      ),
    h(
      Link,
      {
        href: '/my/recipes/' + recipe.recipeId + '/edit',
        className: 'text-link',
        'aria-label': (hidden ? 'Quản lý ' : 'Chỉnh sửa ') + title,
      },
      h(Icon, { name: hidden ? 'book' : 'edit', size: 16 }),
      hidden ? 'Quản lý' : 'Chỉnh sửa',
    ),
  );
}

export function MyRecipes({ session, search }) {
  const location = listLocation(search, true);
  const { tab, page } = location ?? {};
  const owned = tab === 'published' || tab === 'draft';
  const [reload, setReload] = useState(0);
  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (owned) {
    params.set('status', tab);
    params.set('sort', '-updatedAt');
  }
  const source = owned
    ? 'recipes'
    : tab === 'saved'
      ? 'bookmarks'
      : 'favorites';
  const result = useRead(
    location ? '/me/' + source + '?' + params : null,
    reload,
    { privateRequest: true, revision: session.revision },
  );
  const rows = result.body?.data;
  const meta = result.body?.meta;
  const valid =
    Array.isArray(rows) &&
    meta?.page === page &&
    meta?.limit === 20 &&
    Number.isInteger(meta.total) &&
    meta.total >= 0;
  const lastPage = valid
    ? Math.max(1, Math.ceil(meta.total / meta.limit))
    : null;
  useEffect(() => {
    if (lastPage !== null && page > lastPage)
      navigate(libraryHref(tab, lastPage), { replace: true });
  }, [tab, page, lastPage]);
  const create = h(
    Link,
    { href: '/my/recipes/new', className: 'button' },
    h(Icon, { name: 'plus', size: 17 }),
    'Tạo công thức',
  );
  const retry = () => setReload((current) => current + 1);

  let content;
  if (!location) {
    content = h(
      'p',
      { role: 'alert' },
      'Địa chỉ thư viện không hợp lệ. ',
      h(Link, { href: '/my/recipes' }, 'Về bản nháp'),
    );
  } else if (
    result.status === 'loading' ||
    (lastPage !== null && page > lastPage)
  ) {
    content = h(
      'p',
      { role: 'status', className: 'library-status' },
      'Đang tải công thức…',
    );
  } else if (result.status === 'error' || !valid) {
    content = h(ErrorState, {
      error: result.error,
      onRetry: retry,
      title: 'Không tải được danh sách công thức',
    });
  } else if (!rows.length) {
    content = h(
      'div',
      { className: 'empty-state library-empty' },
      h(Icon, { name: 'book', size: 32 }),
      h('h2', null, emptyMessage[tab]),
      owned
        ? create
        : h(
            Link,
            { href: '/recipes?view=posts', className: 'text-link' },
            'Khám phá cộng đồng',
            h(Icon, { name: 'arrow', size: 16 }),
          ),
    );
  } else if (owned) {
    content = h(
      'ul',
      { className: 'owner-list' },
      rows.map((recipe) => h(OwnerRecipeRow, { key: recipe.recipeId, recipe })),
    );
  } else {
    content = h(
      InteractionScope,
      {
        session,
        recipes: rows,
        onUnavailable: retry,
        onChanged: ({ kind, active }) => {
          if (!active && kind === (tab === 'saved' ? 'saved' : 'favorited'))
            retry();
        },
      },
      h(
        'div',
        { className: 'library-grid' },
        rows.map((recipe) =>
          h(
            'div',
            { className: 'library-recipe', key: recipe.recipeId },
            h(RecipeCard, { recipe }),
            h(RecipeActions, { recipe }),
          ),
        ),
      ),
    );
  }
  return h(
    'section',
    { className: 'drafts-page library-page' },
    h(
      'header',
      { className: 'drafts-heading' },
      h('h1', null, 'Công thức của tôi'),
      !(owned && valid && !meta.total) && create,
    ),
    h(
      'nav',
      { className: 'library-tabs', 'aria-label': 'Thư viện công thức' },
      Object.entries(libraryTabs).map(([key, name]) =>
        h(
          Link,
          {
            key,
            href: libraryHref(key),
            'aria-current': key === tab ? 'page' : undefined,
          },
          name,
        ),
      ),
    ),
    valid &&
      meta.total > 0 &&
      h('p', { className: 'library-total' }, meta.total + ' công thức'),
    content,
    valid &&
      page <= lastPage &&
      h(RecipePagination, {
        meta,
        href: (n) => libraryHref(tab, n),
        label: 'Phân trang thư viện',
      }),
  );
}
