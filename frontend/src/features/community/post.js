import { createElement as h, Fragment, useState } from 'react';
import { Icon, RecipeImage } from '../../components/ui/primitives.js';
import { Link } from '../../app/router.js';
import { profileHref, recipeHref } from '../../services/api.js';
import { difficulties } from '../recipes.js';
import { RecipeActions, useInteractionRefresh } from './interactions.js';
import { AuthorAvatar, CommentSection } from './comments.js';

const date = new Intl.DateTimeFormat('vi-VN', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function RecipePostContent({
  recipe,
  categoryName,
  preview = false,
  renderImage,
  authorAction,
}) {
  const author = recipe.author,
    authorLink = !preview && profileHref(author),
    href = !preview && recipeHref(recipe);
  const published =
    recipe.publishedAt && Number.isFinite(Date.parse(recipe.publishedAt));
  const cover = renderImage
    ? renderImage(recipe.coverImageUrl)
    : h(RecipeImage, { url: recipe.coverImageUrl });
  return h(
    Fragment,
    null,
    h(
      'header',
      { className: 'post-byline' },
      h(AuthorAvatar, { author, className: 'post-avatar' }),
      h(
        'div',
        { className: 'post-attribution' },
        authorLink
          ? h(Link, { href: authorLink }, author.displayName)
          : h('strong', null, author?.displayName),
        published &&
          h(
            'time',
            { dateTime: recipe.publishedAt },
            date.format(new Date(recipe.publishedAt)),
          ),
      ),
      authorAction,
    ),
    h(
      'div',
      { className: 'post-recipe' },
      h(
        'div',
        { className: 'post-photo' + (recipe.coverImageUrl ? '' : ' no-cover') },
        cover,
      ),
      h(
        'div',
        { className: 'post-copy' },
        h('h3', null, href ? h(Link, { href }, recipe.title) : recipe.title),
        (recipe.summary || recipe.description) &&
          h('p', null, recipe.summary || recipe.description),
        h(
          'div',
          { className: 'recipe-meta' },
          categoryName && h('span', null, categoryName),
          Number.isFinite(recipe.totalMinutes) &&
            h(
              'span',
              null,
              h(Icon, { name: 'clock', size: 16 }),
              recipe.totalMinutes + ' phút',
            ),
          difficulties[recipe.difficulty] &&
            h(
              'span',
              null,
              h(Icon, { name: 'leaf', size: 16 }),
              difficulties[recipe.difficulty],
            ),
        ),
        href &&
          h(
            Link,
            { className: 'text-link post-read', href },
            'Xem công thức',
            h(Icon, { name: 'forward', size: 16 }),
          ),
      ),
    ),
  );
}

export function RecipePost({ recipe, categoryName, session }) {
  const [open, setOpen] = useState(false);
  const refresh = useInteractionRefresh();
  const own =
    session?.status === 'authenticated' &&
    session.body?.data?.id === recipe.author?.id;
  return h(
    'article',
    { className: 'recipe-post' },
    h(RecipePostContent, {
      recipe,
      categoryName,
      authorAction:
        own &&
        h(
          Link,
          {
            className: 'text-link post-edit',
            href: '/my/recipes/' + recipe.recipeId + '/edit',
          },
          h(Icon, { name: 'edit', size: 16 }),
          'Chỉnh sửa',
        ),
    }),
    h(RecipeActions, {
      recipe,
      onComments: () => setOpen(!open),
      expanded: open,
    }),
    open && h(CommentSection, { recipe, session, onChanged: refresh }),
  );
}
