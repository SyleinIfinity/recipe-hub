import { createElement as h, useEffect, useState } from 'react';
import { useRead } from '../services/api.js';
import { Button } from '../components/ui/primitives.js';

// Page only on explicit demand; the public catalog has no total/cursor response.
export function useCategoryOptions() {
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [pages, setPages] = useState({});
  const result = useRead(
    '/categories?limit=100' + (page > 1 ? '&page=' + page : ''),
    reload,
  );
  useEffect(() => {
    if (result.status === 'ready' && Array.isArray(result.body?.data))
      setPages((previous) => ({ ...previous, [page]: result.body.data }));
  }, [result.status, result.body, page]);
  const options = [
    ...new Map(
      Object.values(pages)
        .flat()
        .map((item) => [item.id, item]),
    ).values(),
  ];
  const more =
    result.status === 'ready' &&
    result.body?.data?.length === 100 &&
    page < 1000;
  const controls = h(
    'div',
    { className: 'catalog-controls' },
    result.status === 'loading' &&
      h('p', { role: 'status' }, 'Đang tải danh mục…'),
    result.status === 'error' &&
      h(
        'div',
        { role: 'alert' },
        h('p', null, 'Chưa tải được danh mục.'),
        h(
          Button,
          { onClick: () => setReload((n) => n + 1) },
          'Thử lại danh mục',
        ),
      ),
    more &&
      h(Button, { onClick: () => setPage((n) => n + 1) }, 'Tải thêm danh mục'),
  );
  return { options, controls };
}
