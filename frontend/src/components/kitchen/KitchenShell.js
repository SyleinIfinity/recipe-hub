import { createElement as h, useEffect, useRef, useState } from 'react';
import { navigationRoutes } from '../../app/registry.js';
import { Link } from '../../app/router.js';
import { KitchenScene } from './KitchenScene.js';
import { useRead } from '../../services/api.js';
import { Icon, IconButton } from '../ui/primitives.js';

function Brand({ compact = false }) {
  return h(
    Link,
    {
      href: '/',
      className: 'brand' + (compact ? ' compact' : ''),
      'aria-label': 'Recipe Hub — Trang chủ',
    },
    h('img', {
      src: '/assets/brand/chef-cap.svg',
      alt: '',
      width: 48,
      height: 48,
    }),
    h('span', null, 'Recipe Hub'),
  );
}
function Navigation({ pathname, onNavigate }) {
  return h(
    'nav',
    { 'aria-label': 'Chính', className: 'main-nav' },
    navigationRoutes.map(({ pattern: href, label, icon }) => {
      const active =
        href === '/' ? pathname === '/' : pathname.startsWith('/recipes');
      return h(
        Link,
        {
          key: href,
          href: href === '/recipes' ? '/recipes?view=posts' : href,
          onClick: onNavigate,
          'aria-current': active ? 'page' : undefined,
        },
        h(Icon, { name: icon }),
        label,
      );
    }),
  );
}
export function MobileDrawer({
  open,
  onClose,
  triggerRef,
  pathname,
  authenticated,
}) {
  const dialog = useRef(null);
  useEffect(() => {
    const node = dialog.current;
    if (!open) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (node.showModal) node.showModal();
    else node.setAttribute('open', '');
    node.querySelector('button')?.focus();
    const resized = () => {
      if (window.innerWidth > 1024) onClose();
    };
    window.addEventListener('resize', resized);
    return () => {
      if (node.close) node.close();
      else node.removeAttribute('open');
      document.body.style.overflow = old;
      window.removeEventListener('resize', resized);
      const trigger = triggerRef.current;
      if (window.innerWidth <= 1024) trigger?.focus();
      else document.getElementById('main')?.focus({ preventScroll: true });
    };
  }, [open, onClose, triggerRef]);
  return h(
    'dialog',
    {
      ref: dialog,
      id: 'mobile-navigation',
      className: 'mobile-drawer',
      'aria-label': 'Điều hướng',
      onCancel(event) {
        event.preventDefault();
        onClose();
      },
      onClick(event) {
        if (event.target === event.currentTarget) {
          const r = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom
          )
            onClose();
        }
      },
    },
    h(
      'div',
      { className: 'drawer-header' },
      h(Brand, { compact: true }),
      h(IconButton, { label: 'Đóng menu', icon: 'close', onClick: onClose }),
    ),
    h(Navigation, { pathname, onNavigate: onClose }),
    authenticated &&
      h(
        Link,
        { href: '/my/recipes', className: 'text-link', onClick: onClose },
        'Công thức của tôi',
      ),
  );
}
function AccountDisplay({ auth }) {
  const name = auth.status === 'ready' && auth.body?.data?.displayName;
  return h(
    Link,
    {
      href: name ? '/account' : '/auth/login',
      className: 'account-entry',
      'aria-label': name ? 'Tài khoản của tôi' : 'Đăng nhập',
    },
    h(Icon, { name: 'user', size: 18 }),
    h('span', null, name || 'Đăng nhập'),
  );
}
export function AuthShell({ children }) {
  return h(
    'div',
    { className: 'auth-shell' },
    h('a', { className: 'skip-link', href: '#main' }, 'Đến biểu mẫu'),
    h(
      'header',
      { className: 'auth-header' },
      h(Brand),
      h(
        Link,
        { href: '/', className: 'back-link' },
        h(Icon, { name: 'back', size: 17 }),
        'Về trang chủ',
      ),
    ),
    h(
      'main',
      { id: 'main', tabIndex: -1, className: 'auth-main' },
      h('div', { className: 'auth-art', 'aria-hidden': true }, h(KitchenScene)),
      h('div', { className: 'auth-column' }, children),
    ),
  );
}
export function KitchenShell({ children, pathname, auth }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  const close = useRef(() => setOpen(false)).current;
  const health = useRead(import.meta.env.DEV ? '/health' : null);
  return h(
    'div',
    { className: 'kitchen-shell' },
    h('a', { className: 'skip-link', href: '#main' }, 'Bỏ qua điều hướng'),
    h(
      'header',
      { className: 'site-header' },
      h(
        'div',
        { className: 'header-inner' },
        h(IconButton, {
          ref: trigger,
          label: 'Mở menu',
          icon: 'menu',
          'aria-expanded': open,
          'aria-controls': 'mobile-navigation',
          onClick: () => setOpen(true),
        }),
        h(Brand),
        h(Navigation, { pathname }),
        h(
          'div',
          { className: 'header-end' },
          auth.status === 'ready' &&
            h(
              Link,
              {
                href: '/my/recipes',
                className: 'draft-entry',
                'aria-current': pathname.startsWith('/my/recipes')
                  ? 'page'
                  : undefined,
              },
              h(Icon, { name: 'book', size: 18 }),
              'Công thức của tôi',
            ),
          h(AccountDisplay, { auth }),
        ),
        import.meta.env.DEV &&
          h(
            'p',
            { className: 'sr-only', role: 'status' },
            health.status === 'ready' && health.body?.data?.status === 'ready'
              ? 'Kết nối thành công'
              : health.status === 'loading'
                ? 'Đang kết nối…'
                : 'Chưa thể kết nối dịch vụ',
          ),
      ),
    ),
    h(MobileDrawer, {
      authenticated: auth.status === 'ready',
      open,
      onClose: close,
      triggerRef: trigger,
      pathname,
    }),
    h(
      'main',
      { id: 'main', tabIndex: -1, className: 'main-content' },
      children,
    ),
  );
}
