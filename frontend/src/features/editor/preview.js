import { createElement as h, useEffect, useRef, useState } from 'react';
import { RecipeContent } from '../recipes.js';
import { RecipePostContent } from '../community/post.js';
import { RecipeImage, Button } from '../../components/ui/primitives.js';

function previewImage(url) {
  return url?.startsWith('blob:')
    ? h('img', { className: 'recipe-image', src: url, alt: 'Ảnh đang chọn' })
    : h(RecipeImage, { url });
}

export function RecipePreview({
  recipe,
  categoryName,
  full,
  close,
  dirty,
  published,
}) {
  const [mode, setMode] = useState('detail');
  const dialog = useRef(null);
  useEffect(() => {
    if (!full) return;
    const node = dialog.current;
    const trigger = document.activeElement;
    node.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      node.close();
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, [full]);
  const controls = h(
    'div',
    {
      className: 'preview-switch',
      role: 'group',
      'aria-label': 'Kiểu xem trước',
    },
    [
      ['detail', 'Trang chi tiết'],
      ['post', 'Bài viết'],
    ].map(([key, label]) =>
      h(
        'button',
        {
          type: 'button',
          key,
          'aria-pressed': key === mode,
          onClick: () => setMode(key),
        },
        label,
      ),
    ),
  );
  const content =
    mode === 'post'
      ? h(
          'article',
          { className: 'recipe-post' },
          h(RecipePostContent, {
            recipe,
            categoryName,
            preview: true,
            renderImage: previewImage,
          }),
        )
      : h(RecipeContent, {
          recipe,
          categoryName,
          preview: true,
          renderImage: previewImage,
        });
  const header = h(
    'header',
    { className: 'preview-heading' },
    h('h2', null, 'Xem trước'),
    h(
      'p',
      null,
      'Chỉ mình bạn thấy',
      dirty
        ? ' · Thay đổi chưa lưu'
        : published
          ? ' · Phiên bản đã xuất bản'
          : '',
    ),
    controls,
  );
  if (full)
    return h(
      'dialog',
      {
        ref: dialog,
        className: 'full-preview',
        'aria-label': 'Xem trước toàn màn hình',
        onCancel: close,
      },
      h(
        'div',
        { className: 'preview-dialog-bar' },
        header,
        h(
          Button,
          { onClick: close, className: 'button-secondary', autoFocus: true },
          'Đóng xem trước',
        ),
      ),
      content,
    );
  return h(
    'aside',
    { className: 'live-preview', 'aria-label': 'Xem trước công thức' },
    header,
    content,
  );
}
