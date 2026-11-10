import { createElement as h, useEffect, useRef, useState } from 'react';
import { navigationRoutes } from '../../app/registry.js';
import { Link } from '../../app/router.js';
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
    h('h2', null, 'Recipe Hub'),
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
          href,
          onClick: onNavigate,
          'aria-current': active ? 'page' : undefined,
        },
        h(Icon, { name: icon }),
        label,
      );
    }),
  );
}
export function MobileDrawer({ open, onClose, triggerRef, pathname }) {
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
  );
}
export function AccountDisplay({ auth }) {
  const user =
    auth.status === 'ready' && typeof auth.body?.data?.displayName === 'string'
      ? auth.body.data
      : null;
  const guest = auth.status === 'error' && auth.error?.status === 401;
  return h(
    'div',
    { className: 'account-display' },
    h(
      'span',
      { className: 'avatar', 'aria-hidden': true },
      user
        ? Array.from(user.displayName.trim())[0] || '•'
        : h(Icon, { name: 'user' }),
    ),
    h(
      'div',
      null,
      h('small', null, user ? 'Góc bếp của' : 'Recipe Hub'),
      h(
        'strong',
        null,
        user
          ? user.displayName
          : guest
            ? 'Khách ghé bếp'
            : auth.status === 'loading'
              ? 'Đang tải…'
              : 'Góc bếp cộng đồng',
      ),
    ),
  );
}
export function KitchenShell({ children, pathname, auth, suggestion }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  const close = useRef(() => setOpen(false)).current;
  const health = useRead(import.meta.env.DEV ? '/health' : null);
  const healthText =
    health.status === 'loading'
      ? 'Đang kết nối…'
      : health.status === 'ready' && health.body?.data?.status === 'ready'
        ? 'Kết nối thành công'
        : 'Chưa thể kết nối dịch vụ';
  return h(
    'div',
    { className: 'kitchen-shell' },
    h('a', { className: 'skip-link', href: '#main' }, 'Bỏ qua điều hướng'),
    h(
      'aside',
      { className: 'wood-sidebar' },
      h(Brand),
      h(Navigation, { pathname }),
      h(
        'div',
        { className: 'sidebar-decoration', 'aria-hidden': true },
        h('img', {
          src: '/assets/kitchen/sidebar-plant.svg',
          alt: '',
          width: 200,
          height: 250,
        }),
      ),
      import.meta.env.DEV &&
        h('p', { role: 'status', className: 'sr-only' }, healthText),
    ),
    h(
      'header',
      { className: 'mobile-header' },
      h(
        'button',
        {
          ref: trigger,
          className: 'icon-button button',
          type: 'button',
          'aria-label': 'Mở menu',
          'aria-expanded': open,
          'aria-controls': 'mobile-navigation',
          onClick: () => setOpen(true),
        },
        h(Icon, { name: 'menu' }),
      ),
      h(Brand, { compact: true }),
      h(
        'span',
        {
          className: 'mobile-account',
          title: auth.body?.data?.displayName || 'Khách',
        },
        h(Icon, { name: 'user' }),
      ),
    ),
    h(MobileDrawer, { open, onClose: close, triggerRef: trigger, pathname }),
    h(
      'main',
      { id: 'main', tabIndex: -1, className: 'main-content' },
      children,
    ),
    h(
      'aside',
      { className: 'right-rail', 'aria-label': 'Góc bếp' },
      h(AccountDisplay, { auth }),
      suggestion,
    ),
  );
}
