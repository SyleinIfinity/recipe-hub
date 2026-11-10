import { createElement as h, useEffect, useState } from 'react';
import { Link, navigate } from '../app/router.js';
import { useRead, searchQuery } from '../services/api.js';
import { SearchForm, ErrorState, Button } from '../components/ui/primitives.js';
import { RecipeGrid } from './recipes.js';

function Field({ label, name, value, children, type = 'text', min, max }) {
  const [selection, setSelection] = useState(value || '');
  return h(
    'div',
    { className: 'filter-field' },
    h('label', { htmlFor: 'filter-' + name }, label),
    children
      ? h(
          'select',
          {
            id: 'filter-' + name,
            name,
            value: selection,
            onChange: (e) => setSelection(e.target.value),
          },
          children,
        )
      : h('input', {
          id: 'filter-' + name,
          name,
          type,
          defaultValue: value || '',
          min,
          max,
          maxLength: name === 'tag' ? 40 : undefined,
        }),
  );
}
export function Explore({ search }) {
  const parsed = searchQuery(search);
  const [reload, setReload] = useState(0);
  const result = useRead(parsed.path || null, reload);
  const categories = useRead('/categories?limit=100');
  const params = parsed.params || new URLSearchParams();
  const [ingredientTerm, setIngredientTerm] = useState('');
  const [catalogTerm, setCatalogTerm] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setCatalogTerm(ingredientTerm), 250);
    return () => clearTimeout(timer);
  }, [ingredientTerm]);
  const catalog = useRead(
    '/ingredients?' + new URLSearchParams({ q: catalogTerm, limit: '20' }),
  );
  const updateQuery = (patch) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === '') next.delete(key);
      else next.set(key, value);
    }
    if (!Object.hasOwn(patch, 'page')) next.delete('page');
    navigate('/recipes' + (next.size ? '?' + next.toString() : ''));
  };
  const selectedIds = params.get('ingredientIds')?.split(',') || [];
  const options =
    catalog.status === 'ready' && Array.isArray(catalog.body?.data)
      ? catalog.body.data
      : [];
  const filterForm = h(
    'form',
    {
      key: search,
      onSubmit(e) {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        updateQuery(
          Object.fromEntries(
            [
              'category',
              'tag',
              'difficulty',
              'maxMinutes',
              'sort',
              'limit',
            ].map((key) => [key, form.get(key)]),
          ),
        );
      },
    },
    h(
      'div',
      { className: 'filter-grid' },
      h(
        Field,
        { label: 'Danh mục', name: 'category', value: params.get('category') },
        h('option', { value: '' }, 'Tất cả'),
        categories.status === 'ready' &&
          Array.isArray(categories.body?.data) &&
          categories.body.data.map((c) =>
            h('option', { key: c.id, value: c.id }, c.name),
          ),
      ),
      h(Field, { label: 'Nhãn', name: 'tag', value: params.get('tag') }),
      h(
        Field,
        {
          label: 'Độ khó',
          name: 'difficulty',
          value: params.get('difficulty'),
        },
        ['', 'easy', 'medium', 'hard'].map((v, i) =>
          h('option', { key: v, value: v }, ['Tất cả', 'Dễ', 'Vừa', 'Khó'][i]),
        ),
      ),
      h(Field, {
        label: 'Tối đa (phút)',
        name: 'maxMinutes',
        type: 'number',
        min: 0,
        max: 2880,
        value: params.get('maxMinutes'),
      }),
      h(
        Field,
        {
          label: 'Sắp xếp',
          name: 'sort',
          value: params.get('sort') || '-publishedAt',
        },
        h('option', { value: '-publishedAt' }, 'Mới nhất'),
        h('option', { value: 'publishedAt' }, 'Cũ nhất'),
      ),
      h(
        Field,
        {
          label: 'Số món mỗi trang',
          name: 'limit',
          value: params.get('limit') || '20',
        },
        [
          ...new Set([params.get('limit') || '20', '12', '20', '24', '100']),
        ].map((v) => h('option', { key: v, value: v }, v)),
      ),
    ),
    h(Button, { type: 'submit' }, 'Áp dụng bộ lọc'),
  );
  const ingredientPicker = h(
    'fieldset',
    { className: 'ingredient-filter' },
    h('legend', null, 'Nguyên liệu'),
    h(
      'label',
      null,
      h('span', { className: 'sr-only' }, 'Tìm trong danh mục nguyên liệu'),
      h('input', {
        type: 'search',
        placeholder: 'Tìm nguyên liệu',
        value: ingredientTerm,
        maxLength: 100,
        onChange: (e) => setIngredientTerm(e.target.value),
      }),
    ),
    catalog.status === 'error' &&
      h(
        'p',
        { className: 'form-error' },
        'Chưa tải được danh mục nguyên liệu.',
      ),
    h(
      'div',
      {
        className: 'ingredient-options',
        'aria-busy': catalog.status === 'loading',
      },
      options.map((v) =>
        h(
          'label',
          { key: v.id },
          h('input', {
            type: 'checkbox',
            checked: selectedIds.includes(v.id),
            disabled: !selectedIds.includes(v.id) && selectedIds.length >= 20,
            onChange: (e) => {
              const ids = e.target.checked
                ? [...selectedIds, v.id]
                : selectedIds.filter((id) => id !== v.id);
              updateQuery({
                ingredientIds: ids.join(','),
                ingredientMatch: ids.length
                  ? params.get('ingredientMatch') || 'any'
                  : null,
              });
            },
          }),
          v.name,
        ),
      ),
    ),
    selectedIds.length > 0 &&
      h(
        'div',
        { className: 'ingredient-selection' },
        h('p', null, `Đã chọn ${selectedIds.length} nguyên liệu`),
        h(
          Button,
          {
            className: 'button-secondary',
            onClick: () =>
              updateQuery({ ingredientIds: null, ingredientMatch: null }),
          },
          'Bỏ chọn nguyên liệu',
        ),
        h(
          'label',
          null,
          'Cách khớp ',
          h(
            'select',
            {
              'aria-label': 'Cách khớp',
              value: params.get('ingredientMatch') || 'any',
              onChange: (e) => updateQuery({ ingredientMatch: e.target.value }),
            },
            h('option', { value: 'any' }, 'Có ít nhất một'),
            h('option', { value: 'all' }, 'Có tất cả'),
          ),
        ),
      ),
  );
  const meta = result.body?.meta,
    page = Number(params.get('page') || 1);
  const pagination =
    result.status === 'ready' &&
    Number.isFinite(meta?.total) &&
    meta.total > 0 &&
    h(
      'nav',
      { className: 'pagination', 'aria-label': 'Phân trang công thức' },
      page > 1 &&
        h(
          Button,
          {
            className: 'button-secondary',
            onClick: () => updateQuery({ page: String(page - 1) }),
          },
          'Trang trước',
        ),
      h('span', null, `Trang ${page}`),
      page * meta.limit < meta.total &&
        page < 1000 &&
        h(
          Button,
          {
            className: 'button-secondary',
            onClick: () => updateQuery({ page: String(page + 1) }),
          },
          'Trang sau',
        ),
    );
  return h(
    'section',
    { className: 'page-panel explore' },
    h(
      'header',
      { className: 'page-heading' },
      h('h1', null, 'Khám phá công thức'),
    ),
    h(SearchForm, {
      key: search,
      id: 'explore-search',
      initialQuery: params.get('q') || '',
      onSearch: (q) => updateQuery({ q }),
    }),
    h(
      'details',
      { className: 'filter-panel', open: true },
      h('summary', null, 'Bộ lọc'),
      filterForm,
      categories.status === 'error' &&
        h('p', { className: 'form-error' }, 'Chưa tải được danh mục.'),
      ingredientPicker,
    ),
    params.size > 0 &&
      h(
        Link,
        {
          className: 'text-link clear-filters',
          href:
            '/recipes?' +
            new URLSearchParams({
              sort: params.get('sort') || '-publishedAt',
              limit: params.get('limit') || '20',
            }),
        },
        'Xóa bộ lọc',
      ),
    parsed.error
      ? h(ErrorState, { error: { status: 400 } })
      : h(RecipeGrid, {
          result,
          onRetry: () => setReload(reload + 1),
          emptyTitle: 'Không tìm thấy công thức phù hợp',
        }),
    pagination,
  );
}
