import { RecipePagination } from '../components/ui/RecipePagination.js';
import { listLocation } from '../app/library-location.js';
import { CommentSection } from './community/comments.js';
import {
  InteractionScope,
  RecipeActions,
  useInteractionRefresh,
} from './community/interactions.js';
import { createElement as h, useState } from 'react';
import { Link } from '../app/router.js';
import { useRead, recipeHref, profileHref } from '../services/api.js';
import {
  Icon,
  RecipeImage,
  Skeleton,
  EmptyState,
  ErrorState,
} from '../components/ui/primitives.js';

export const difficulties = { easy: 'Dễ', medium: 'Vừa', hard: 'Khó' };
export function RecipeCard({ recipe }) {
  const href = recipeHref(recipe);
  return h(
    'article',
    { className: 'recipe-card' },
    h(RecipeImage, { url: recipe.coverImageUrl }),
    h(
      'div',
      { className: 'recipe-card-body' },
      h('h3', null, href ? h(Link, { href }, recipe.title) : recipe.title),
      h(
        'div',
        { className: 'recipe-meta' },
        Number.isFinite(recipe.totalMinutes) &&
          h(
            'span',
            null,
            h(Icon, { name: 'clock', size: 17 }),
            `${recipe.totalMinutes} phút`,
          ),
        difficulties[recipe.difficulty] &&
          h(
            'span',
            { className: 'difficulty' },
            h(Icon, { name: 'leaf', size: 16 }),
            difficulties[recipe.difficulty],
          ),
      ),
      recipe.author?.displayName &&
        h(
          'p',
          { className: 'recipe-author' },
          h(Icon, { name: 'user', size: 18 }),
          profileHref(recipe.author)
            ? h(
                Link,
                { href: profileHref(recipe.author) },
                recipe.author.displayName,
              )
            : recipe.author.displayName,
        ),
    ),
  );
}
export function RecipeGrid({ result, onRetry, emptyTitle }) {
  if (result.status === 'loading') return h(Skeleton);
  if (result.status === 'error')
    return h(ErrorState, {
      error: result.error,
      onRetry,
      title: 'Không tải được công thức',
    });
  if (!Array.isArray(result.body?.data))
    return h(ErrorState, { onRetry, title: 'Không tải được công thức' });
  return result.body.data.length
    ? h(
        'div',
        { className: 'recipe-grid' },
        result.body.data.map((recipe) =>
          h(RecipeCard, { key: recipe.recipeId, recipe }),
        ),
      )
    : h(EmptyState, { title: emptyTitle });
}
export function PageError({ forbidden = false }) {
  return h(
    'section',
    { className: 'page-panel error-page' },
    h(Icon, { name: forbidden ? 'user' : 'pot', size: 64 }),
    h(
      'h1',
      null,
      forbidden ? 'Bạn không có quyền truy cập' : 'Không tìm thấy nội dung',
    ),
    h(
      Link,
      { className: 'button', href: forbidden ? '/' : '/recipes' },
      forbidden ? 'Trang chủ' : 'Khám phá công thức',
    ),
  );
}
export function RecipeDetail({ slug, session }) {
  const [reload, setReload] = useState(0);
  const result = useRead('/recipes/' + encodeURIComponent(slug), reload);
  const categoryId = result.body?.data?.categoryId;
  const categories = useRead(
    result.status === 'ready' && /^[a-f0-9]{24}$/i.test(categoryId || '')
      ? '/categories?limit=100'
      : null,
  );
  const category = Array.isArray(categories.body?.data)
    ? categories.body.data.find((c) => c.id === categoryId)
    : null;
  if (result.status === 'loading')
    return h('section', { className: 'page-panel' }, h(Skeleton, { count: 1 }));
  if (result.status === 'error')
    return result.error?.status === 404
      ? h(PageError)
      : h(
          'section',
          { className: 'page-panel' },
          h(ErrorState, {
            error: result.error,
            onRetry: () => setReload(reload + 1),
            title: 'Không tải được công thức',
          }),
        );
  const r = result.body?.data;
  if (
    !r ||
    typeof r.title !== 'string' ||
    !Array.isArray(r.ingredients) ||
    !Array.isArray(r.steps)
  )
    return h(
      'section',
      { className: 'page-panel' },
      h(ErrorState, { onRetry: () => setReload(reload + 1) }),
    );
  return h(
    InteractionScope,
    { session, recipes: [r], onUnavailable: () => setReload((n) => n + 1) },
    h(DetailReader, { recipe: r, category, session }),
  );
}

function DetailReader({ recipe, category, session }) {
  const refresh = useInteractionRefresh();
  const [commentsOpen, setCommentsOpen] = useState(true);
  const owner =
    session?.status === 'authenticated' &&
    session.body?.data?.id === recipe.author?.id;
  return h(
    'div',
    { className: 'recipe-reader' },
    h(RecipeContent, {
      recipe,
      categoryName: category?.name,
      navigation: h(
        'div',
        { className: 'reader-navigation' },
        h(
          Link,
          { href: '/recipes?view=posts', className: 'back-link' },
          h(Icon, { name: 'back', size: 17 }),
          'Cộng đồng',
        ),
        owner &&
          h(
            Link,
            {
              href: `/my/recipes/${recipe.recipeId}/edit`,
              className: 'text-link',
            },
            'Chỉnh sửa công thức',
          ),
      ),
    }),
    h(
      'div',
      { className: 'recipe-discussion' },
      h(RecipeActions, {
        recipe,
        expanded: commentsOpen,
        onComments: () => setCommentsOpen((v) => !v),
      }),
      commentsOpen &&
        h(CommentSection, {
          recipe,
          session,
          onChanged: () => refresh(recipe),
        }),
    ),
  );
}

export function RecipeContent({
  recipe: r,
  categoryName,
  navigation,
  preview = false,
  renderImage,
}) {
  const authorHref = !preview && profileHref(r.author);
  const picture = renderImage || ((url) => h(RecipeImage, { url }));
  return h(
    'article',
    {
      className:
        'page-panel recipe-detail' + (r.coverImageUrl ? ' has-cover' : ''),
    },
    navigation,
    h(
      'div',
      { className: 'detail-heading' },
      h(preview ? 'h3' : 'h1', null, r.title),
      h(
        'div',
        { className: 'detail-author' },
        r.author?.avatarUrl &&
          h(
            'span',
            { className: 'author-avatar' },
            h(RecipeImage, { url: r.author.avatarUrl }),
          ),
        authorHref
          ? h(Link, { href: authorHref }, r.author.displayName)
          : r.author?.displayName,
      ),
      r.description &&
        h('p', { className: 'recipe-description' }, r.description),
    ),
    r.coverImageUrl &&
      h('div', { className: 'detail-cover' }, picture(r.coverImageUrl)),
    h(
      'dl',
      { className: 'detail-facts' },
      [
        [
          'Danh mục',
          preview
            ? categoryName
            : /^[a-f0-9]{24}$/i.test(r.categoryId || '')
              ? h(
                  Link,
                  {
                    className: 'text-link',
                    href:
                      '/recipes?' +
                      new URLSearchParams({ category: r.categoryId }),
                  },
                  categoryName || 'Xem công thức cùng danh mục',
                )
              : null,
        ],
        ['Khẩu phần', r.servings],
        ['Chuẩn bị', r.prepMinutes == null ? null : r.prepMinutes + ' phút'],
        ['Nấu', r.cookMinutes == null ? null : r.cookMinutes + ' phút'],
        ['Độ khó', difficulties[r.difficulty]],
      ]
        .filter(([, v]) => v != null)
        .map(([k, v]) =>
          h('div', { key: k }, h('dt', null, k), h('dd', null, v)),
        ),
    ),
    h(
      'section',
      { className: 'ingredients' },
      h(preview ? 'h4' : 'h2', null, 'Nguyên liệu'),
      preview && !r.ingredients.length && h('p', null, 'Chưa có nguyên liệu.'),
      h(
        'ul',
        null,
        r.ingredients
          .toSorted((a, b) => a.order - b.order)
          .map((v, i) =>
            h(
              'li',
              { key: v.order || i },
              h('span', null, v.name),
              h(
                'strong',
                null,
                v.quantity != null
                  ? [v.quantity, v.unit].filter((x) => x != null).join(' ')
                  : v.quantityText || '',
              ),
              v.note && h('small', null, v.note),
            ),
          ),
      ),
    ),
    h(
      'section',
      { className: 'cooking-steps' },
      h(preview ? 'h4' : 'h2', null, 'Cách làm'),
      preview && !r.steps.length && h('p', null, 'Chưa có bước nấu.'),
      h(
        'ol',
        null,
        r.steps
          .toSorted((a, b) => a.order - b.order)
          .map((s) =>
            h(
              'li',
              { key: s.stepId },
              h('p', null, s.instruction),
              s.durationMinutes != null &&
                h('small', null, s.durationMinutes + ' phút'),
              s.imageUrl &&
                h('div', { className: 'step-image' }, picture(s.imageUrl)),
            ),
          ),
      ),
    ),
  );
}
export function PublicProfile({ userId, search }) {
  const [reload, setReload] = useState(0);
  const result = useRead('/users/' + userId, reload);
  if (result.status === 'loading')
    return h('section', { className: 'page-panel' }, h(Skeleton, { count: 1 }));
  if (result.status === 'error')
    return result.error?.status === 404
      ? h(PageError)
      : h(
          'section',
          { className: 'page-panel' },
          h(ErrorState, {
            error: result.error,
            onRetry: () => setReload(reload + 1),
          }),
        );
  const user = result.body?.data;
  if (typeof user?.displayName !== 'string')
    return h(
      'section',
      { className: 'page-panel' },
      h(ErrorState, { onRetry: () => setReload(reload + 1) }),
    );
  return h(
    'section',
    { className: 'page-panel public-profile' },
    h(
      'div',
      { className: 'public-identity' },
      user.avatarUrl
        ? h(
            'div',
            { className: 'user-avatar' },
            h(RecipeImage, { url: user.avatarUrl }),
          )
        : h(
            'span',
            { className: 'profile-avatar', 'aria-hidden': true },
            Array.from(user.displayName.trim())[0],
          ),
      h(
        'div',
        null,
        h('h1', null, user.displayName),
        user.createdAt &&
          Number.isFinite(Date.parse(user.createdAt)) &&
          h(
            'p',
            { className: 'muted' },
            'Tham gia từ ' +
              new Intl.DateTimeFormat('vi-VN', {
                month: 'long',
                year: 'numeric',
              }).format(new Date(user.createdAt)),
          ),
      ),
    ),
    user.bio &&
      h(
        'section',
        { className: 'profile-bio' },
        h('h2', null, 'Giới thiệu'),
        h('p', null, user.bio),
      ),
    h(AuthorRecipes, { userId, search }),
  );
}

function AuthorRecipes({ userId, search }) {
  const [reload, setReload] = useState(0);
  const location = listLocation(search);
  const result = useRead(
    location
      ? '/users/' + userId + '/recipes?page=' + location.page + '&limit=12'
      : null,
    reload,
  );
  const meta = result.body?.meta;
  const href = (n) => '/users/' + userId + (n > 1 ? '?page=' + n : '');
  return h(
    'section',
    { className: 'author-recipes' },
    h(
      'h2',
      null,
      'Công thức đã đăng',
      Number.isInteger(meta?.total) &&
        h('span', { className: 'library-total' }, ' · ' + meta.total),
    ),
    location
      ? h(RecipeGrid, {
          result,
          onRetry: () => setReload((n) => n + 1),
          emptyTitle: 'Chưa có công thức ở trang này.',
        })
      : h(Link, { href: href(1) }, 'Về trang đầu'),
    meta &&
      h(RecipePagination, {
        meta,
        href,
        label: 'Phân trang công thức của tác giả',
      }),
  );
}
