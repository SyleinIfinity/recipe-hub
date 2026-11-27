import { createElement as h } from 'react';
import { Link } from '../../app/router.js';

export function RecipePagination({ meta, href, label }) {
  const pages = Math.min(1000, Math.ceil(meta.total / meta.limit));
  if (pages < 2) return null;
  return h(
    'nav',
    { className: 'pagination', 'aria-label': label },
    meta.page > 1 &&
      h(
        Link,
        { href: href(meta.page - 1), className: 'button button-secondary' },
        'Trang trước',
      ),
    h('span', null, 'Trang ' + meta.page + ' / ' + pages),
    meta.page < pages &&
      h(
        Link,
        { href: href(meta.page + 1), className: 'button button-secondary' },
        'Trang sau',
      ),
  );
}
