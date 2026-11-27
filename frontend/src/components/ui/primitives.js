import { createElement as h, useEffect, useState } from 'react';
import { Link } from '../../app/router.js';

const icons = {
  heart:
    'M20.8 4.7a5.4 5.4 0 0 0-7.6 0L12 5.9l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l8.8 8.4 8.8-8.4a5.4 5.4 0 0 0 0-7.6Z',
  comment: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H9l-6 2 1.7-5A8.5 8.5 0 1 1 21 11.5Z',
  bookmark: 'M6 3h12v18l-6-4-6 4V3Z',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  eyeOff:
    'm3 3 18 18M10 5.2A12 12 0 0 1 12 5c6.4 0 10 7 10 7a20 20 0 0 1-3.2 4M6.3 6.7A22 22 0 0 0 2 12s3.6 7 10 7c2 0 3.8-.7 5.2-1.5',
  back: 'M20 12H4m7-7-7 7 7 7',
  forward: 'M4 12h16m-7-7 7 7-7 7',
  plus: 'M12 4v16M4 12h16',
  edit: 'm15 5 4 4M3 21l4.5-1 13-13-3.5-3.5-13 13L3 21Z',
  settings:
    'M4 8h9m4 0h3M4 16h3m4 0h9M17 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0M11 16a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  lock: 'M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3',
  logout: 'M10 4H4v16h6m-1-8h12m-5-5 5 5-5 5',
  image: 'M3 4h18v16H3zM3 17l5-5 4 4 3-3 6 6M16 8h.01',
  home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  book: 'M12 5v16M12 5C8 2 4 3 2 4v15c4-2 7-1 10 2 3-3 6-4 10-2V4c-4-2-7-1-10 1',
  arrow: 'm9 5 7 7-7 7',
  menu: 'M3 6h18M3 12h18M3 18h18',
  close: 'm5 5 14 14M19 5 5 19',
  clock: 'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  leaf: 'M19 3C3 1 0 14 8 19 16 25 24 13 19 3M5 21 16 9',
  user: 'M4 22v-2c0-5 16-5 16 0v2M17 7A5 5 0 1 1 7 7a5 5 0 0 1 10 0',
  pot: 'M5 10h14v7c0 6-14 6-14 0v-7M3 10h18M10 6h4M2 12v4h3M22 12v4h-3',
};
export function Icon({ name, size = 24 }) {
  return h(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.8,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': true,
      focusable: false,
    },
    h('path', { d: icons[name] || icons.book }),
  );
}
export function Button({ children, className = '', ...props }) {
  return h(
    'button',
    { type: 'button', ...props, className: `button ${className}` },
    children,
  );
}
export function IconButton({ label, icon, ...props }) {
  return h(
    Button,
    { ...props, className: 'icon-button', 'aria-label': label },
    h(Icon, { name: icon }),
  );
}
export function CardSurface({ children, className = '', ...props }) {
  return h(
    'section',
    { ...props, className: 'card-surface ' + className },
    children,
  );
}
export function SearchForm({
  initialQuery = '',
  value,
  onQueryChange,
  onSearch,
  id = 'search',
}) {
  const [localQuery, setLocalQuery] = useState(initialQuery);
  const query = value ?? localQuery;
  const setQuery = onQueryChange || setLocalQuery;
  const [error, setError] = useState('');
  return h(
    'form',
    {
      className: 'search-form',
      role: 'search',
      'aria-label': 'Tìm công thức',
      onSubmit(event) {
        event.preventDefault();
        if (query.trim().length > 120) {
          setError('Từ khóa tối đa 120 ký tự.');
          return;
        }
        setError('');
        onSearch(query.trim());
      },
    },
    h(
      'div',
      { className: 'search-pill' },
      h(Icon, { name: 'search' }),
      h('label', { className: 'sr-only', htmlFor: id }, 'Tìm công thức'),
      h('input', {
        id,
        name: 'q',
        type: 'search',
        value: query,
        placeholder: 'Tìm công thức',
        maxLength: 121,
        onChange: (e) => setQuery(e.target.value),
        'aria-invalid': !!error,
        'aria-describedby': error ? id + '-error' : undefined,
      }),
      h(Button, { type: 'submit' }, 'Tìm kiếm'),
    ),
    error &&
      h(
        'p',
        { id: id + '-error', className: 'form-error', role: 'alert' },
        error,
      ),
  );
}
export function FilterChip({ href, children, selected = false }) {
  return h(
    Link,
    {
      href,
      className: 'filter-chip' + (selected ? ' selected' : ''),
      'aria-current': selected ? 'page' : undefined,
    },
    children,
  );
}
export function Skeleton({ count = 4 }) {
  return h(
    'div',
    {
      className: 'recipe-grid skeleton-grid',
      'aria-label': 'Đang tải công thức',
      'aria-busy': true,
      'aria-live': 'polite',
    },
    h('span', { className: 'sr-only' }, 'Đang tải công thức'),
    Array.from({ length: count }, (_, i) =>
      h('div', { key: i, className: 'skeleton', 'aria-hidden': true }),
    ),
  );
}
export function EmptyState({ title = 'Chưa có công thức nào' }) {
  return h(
    'div',
    { className: 'empty-state' },
    h(Icon, { name: 'pot', size: 48 }),
    h('p', null, title),
  );
}
export function ErrorState({
  error,
  onRetry,
  title = 'Không tải được nội dung',
}) {
  const seconds = Number.isFinite(error?.retryAfterSeconds)
    ? Math.max(0, Math.ceil(error.retryAfterSeconds))
    : 0;
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    setRemaining(seconds);
    if (!seconds) return;
    const deadline = Date.now() + seconds * 1000;
    const timer = setInterval(
      () =>
        setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))),
      1000,
    );
    return () => clearInterval(timer);
  }, [error, seconds]);
  const message =
    error?.status === 400
      ? 'Bộ lọc không hợp lệ. Vui lòng kiểm tra lại.'
      : error?.code === 'CSRF_INVALID'
        ? 'Phiên bảo vệ đã thay đổi. Vui lòng tải lại trang trước khi gửi lại.'
        : error?.status === 401
          ? 'Phiên đăng nhập không còn hợp lệ.'
          : error?.status === 403
            ? 'Bạn không có quyền thực hiện thao tác này.'
            : error?.status === 409
              ? 'Dữ liệu đã thay đổi. Vui lòng tải lại để đối chiếu.'
              : error?.status === 429
                ? 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.'
                : error?.mutationOutcomeUncertain
                  ? 'Chưa xác định được kết quả. Vui lòng kiểm tra lại dữ liệu trước khi gửi tiếp.'
                  : title;
  return h(
    'div',
    { className: 'error-state', role: 'alert' },
    h('p', null, message),
    onRetry &&
      remaining > 0 &&
      h('p', { role: 'status' }, `Có thể thử lại sau ${remaining} giây.`),
    onRetry &&
      h(Button, { onClick: onRetry, disabled: remaining > 0 }, 'Thử lại'),
  );
}
export function ImageFallback({ className = '', failed = false }) {
  return h(
    'div',
    {
      className:
        (failed ? 'image-fallback failed ' : 'image-fallback absent ') +
        className,
    },
    failed
      ? h('img', {
          src: '/assets/kitchen/recipe-fallback-vr.svg',
          alt: '',
          width: 320,
          height: 200,
          loading: 'lazy',
        })
      : h(Icon, { name: 'pot', size: 26 }),
    h('span', null, failed ? 'Không tải được ảnh' : 'Chưa có ảnh'),
  );
}
export function RecipeImage({ url }) {
  const [failedUrl, setFailedUrl] = useState(null);
  let safe = false;
  if (url) {
    try {
      const parsed = new URL(url, window.location.origin);
      safe =
        parsed.origin === window.location.origin &&
        parsed.pathname.startsWith('/api/');
    } catch {
      /* Untrusted media URL is unavailable. */
    }
  }
  return safe && failedUrl !== url
    ? h('img', {
        className: 'recipe-image',
        src: url,
        alt: '',
        loading: 'lazy',
        width: 480,
        height: 300,
        onError: () => setFailedUrl(url),
      })
    : h(
        'div',
        { className: 'recipe-image-state' },
        h(ImageFallback, { failed: Boolean(url) }),
        safe &&
          h(
            Button,
            {
              className: 'image-retry button-secondary',
              onClick: () => setFailedUrl(null),
            },
            'Thử tải lại ảnh',
          ),
      );
}
