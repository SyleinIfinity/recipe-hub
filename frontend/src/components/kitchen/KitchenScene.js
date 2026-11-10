import { createElement as h } from 'react';

function PaintedProp({ name, className }) {
  return h(
    'picture',
    { className },
    h('source', {
      media: '(max-width: 560px)',
      srcSet: `/assets/kitchen/${name}-vr-mobile.webp`,
    }),
    h('img', {
      // Attach the fallback after its picture sources; detached React images otherwise fetch it eagerly.
      ref(node) {
        if (node && !node.hasAttribute('src'))
          node.src = `/assets/kitchen/${name}-vr-desktop.webp`;
      },
      alt: '',
      width: name === 'countertop' ? 1280 : 576,
      height: name === 'countertop' ? 427 : 768,
      decoding: 'async',
    }),
  );
}
export function KitchenScene() {
  return h(
    'div',
    { className: 'kitchen-scene', 'aria-hidden': true },
    h('div', { className: 'kitchen-wall' }),
    h('div', { className: 'sunlight' }),
    h(PaintedProp, { name: 'window', className: 'kitchen-window' }),
    h('img', {
      className: 'kitchen-lamp lamp-left',
      src: '/assets/kitchen/lamp-vr.svg',
      alt: '',
      width: 180,
      height: 180,
    }),
    h('img', {
      className: 'kitchen-lamp lamp-right',
      src: '/assets/kitchen/lamp-vr.svg',
      alt: '',
      width: 180,
      height: 180,
    }),
    h(PaintedProp, { name: 'stove', className: 'kitchen-stove' }),
    h(PaintedProp, { name: 'countertop', className: 'kitchen-counter' }),
  );
}
