import { createElement as h, useEffect, useState } from 'react';

export function App() {
  const [status, setStatus] = useState('Đang kết nối…');
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    fetch(`${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/health`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (
          !response.ok ||
          body.success !== true ||
          body.data?.status !== 'ready'
        )
          throw new Error('Unavailable');
        setStatus('Kết nối thành công');
      })
      .catch(() => setStatus('Chưa thể kết nối dịch vụ'))
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);
  return h(
    'main',
    null,
    h('h1', null, 'Recipe Hub'),
    h('p', { role: 'status' }, status),
  );
}
