import { createElement as h, useEffect, useRef, useState } from 'react';
import { Link, navigate } from '../app/router.js';
import { useRead, searchQuery } from '../services/api.js';
import {
  SearchForm,
  ErrorState,
  Button,
  Icon,
} from '../components/ui/primitives.js';
import { useCategoryOptions } from './category-options.js';
import { InteractionScope } from './community/interactions.js';
import { RecipePost } from './community/post.js';
import { RecipeGrid, difficulties } from './recipes.js';

const filterKeys = [
  'q',
  'category',
  'tag',
  'difficulty',
  'maxMinutes',
  'ingredientIds',
  'ingredientMatch',
];
const readFilters = (params) =>
  Object.fromEntries(filterKeys.map((k) => [k, params.get(k) || '']));
const idsOf = (value) => (value ? value.split(',') : []);
function Field({ name, label, value, onChange, options, ...props }) {
  const attrs = {
    name,
    id: 'filter-' + name,
    value,
    onChange: (e) => onChange(e.target.value),
    ...props,
  };
  return h(
    'div',
    { className: 'filter-field' },
    h('label', { htmlFor: attrs.id }, label),
    options
      ? h(
          'select',
          attrs,
          options.map(([v, text]) => h('option', { key: v, value: v }, text)),
        )
      : h('input', attrs),
  );
}
// The public ingredient catalog supports prefix search; keep the labels selected in this tab across navigation.
function rememberedNames() {
  try {
    return new Map(
      JSON.parse(sessionStorage.getItem('rh.selectedIngredients') || '[]'),
    );
  } catch {
    return new Map();
  }
}
export function Explore({ search, session }) {
  const location = new URLSearchParams(search);
  const layouts = location.getAll('view');
  const posts = layouts.length === 1 && layouts[0] === 'posts';
  const invalidLayout =
    layouts.length > 1 ||
    (layouts.length === 1 && !posts && layouts[0] !== 'grid');
  location.delete('view');
  const parsed = searchQuery(location);
  const { params } = parsed;
  const error = invalidLayout || parsed.error;
  const path = !error && parsed.path;
  function viewHref(mode) {
    const next = new URLSearchParams(params);
    if (mode === 'posts') next.set('view', 'posts');
    return '/recipes' + (next.size ? '?' + next : '');
  }
  const [reload, setReload] = useState(0),
    result = useRead(path || null, reload);
  const categories = useCategoryOptions();
  const applied = readFilters(params);
  const signature = JSON.stringify(applied);
  const [draft, setDraft] = useState(applied);
  const previous = useRef(signature);
  useEffect(() => {
    const before = JSON.parse(previous.current),
      next = JSON.parse(signature);
    previous.current = signature;
    setDraft((old) => ({
      ...old,
      ...Object.fromEntries(
        filterKeys
          .filter((k) => before[k] !== next[k])
          .map((k) => [k, next[k]]),
      ),
    }));
  }, [signature]);
  const change = (key, value) => setDraft((old) => ({ ...old, [key]: value }));
  const [term, setTerm] = useState(''),
    [catalogTerm, setCatalogTerm] = useState(''),
    [limit, setLimit] = useState(20),
    [catalogReload, reloadCatalog] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      setCatalogTerm(term);
      setLimit(20);
    }, 250);
    return () => clearTimeout(timer);
  }, [term]);
  const catalog = useRead(
    '/ingredients?' +
      new URLSearchParams({ q: catalogTerm, limit: String(limit) }),
    catalogReload,
  );
  const options = Array.isArray(catalog.body?.data) ? catalog.body.data : [];
  const [names, setNames] = useState(rememberedNames);
  const labelFor = (id, index) =>
    options.find((o) => o.id === id)?.name ||
    names.get(id) ||
    'Nguyên liệu đã chọn ' + (index + 1);
  const selected = idsOf(draft.ingredientIds);
  function selectIngredient(id, checked, name) {
    const ids = checked ? [...selected, id] : selected.filter((v) => v !== id);
    if (checked && name) {
      const map = new Map([...names, [id, name]].slice(-100));
      setNames(map);
      try {
        sessionStorage.setItem(
          'rh.selectedIngredients',
          JSON.stringify([...map]),
        );
      } catch {
        /* Optional cache. */
      }
    }
    setDraft((old) => ({
      ...old,
      ingredientIds: ids.join(','),
      ingredientMatch: ids.length ? old.ingredientMatch || 'any' : '',
    }));
  }
  function update(patch, reset = false) {
    const next = reset ? new URLSearchParams() : new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === '') next.delete(key);
      else next.set(key, value);
    }
    if (!Object.hasOwn(patch, 'page')) next.delete('page');
    if (posts) next.set('view', 'posts');
    navigate('/recipes' + (next.size ? '?' + next : ''));
  }
  function apply(q = draft.q) {
    update({
      ...draft,
      q: q.trim(),
      tag: draft.tag.trim(),
      ingredientMatch: draft.ingredientIds
        ? draft.ingredientMatch || 'any'
        : '',
    });
  }
  function removeAppliedFilter(key, patch) {
    // A chip changes the URL immediately. Preserve other edits awaiting Apply.
    previous.current = JSON.stringify({ ...applied, ...patch });
    setDraft((current) => {
      if (!Object.hasOwn(patch, 'ingredientIds')) {
        return current[key] === applied[key]
          ? { ...current, [key]: '' }
          : current;
      }
      const ids = idsOf(current.ingredientIds).filter((id) => id !== key);
      return {
        ...current,
        ingredientIds: ids.join(','),
        ingredientMatch: ids.length ? current.ingredientMatch || 'any' : '',
      };
    });
    update(patch);
  }
  const chips = [];
  function chip(key, label, patch) {
    chips.push(
      h(
        Button,
        {
          key,
          className: 'applied-chip',
          'aria-label': 'Bỏ ' + label,
          onClick: () => removeAppliedFilter(key, patch),
        },
        label,
        h(Icon, { name: 'close', size: 13 }),
      ),
    );
  }
  if (applied.q) chip('q', applied.q, { q: '' });
  if (applied.category)
    chip(
      'category',
      categories.options.find((o) => o.id === applied.category)?.name ||
        'Danh mục đã chọn',
      { category: '' },
    );
  if (applied.tag) chip('tag', '#' + applied.tag, { tag: '' });
  if (applied.difficulty)
    chip('difficulty', difficulties[applied.difficulty] || 'Độ khó', {
      difficulty: '',
    });
  if (applied.maxMinutes)
    chip('maxMinutes', '≤ ' + applied.maxMinutes + ' phút', { maxMinutes: '' });
  const activeIds = idsOf(applied.ingredientIds);
  activeIds.forEach((id, i) => {
    const rest = activeIds.filter((v) => v !== id);
    chip(id, labelFor(id, i), {
      ingredientIds: rest.join(','),
      ingredientMatch: rest.length ? applied.ingredientMatch || 'any' : '',
    });
  });
  const [expanded, setExpanded] = useState(
    () =>
      typeof matchMedia === 'undefined' ||
      !matchMedia('(max-width: 800px)').matches,
  );
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const media = matchMedia('(max-width: 800px)');
    const resize = () => setExpanded(!media.matches);
    media.addEventListener('change', resize);
    return () => media.removeEventListener('change', resize);
  }, []);
  const field = (name, label, props = {}) =>
    h(Field, {
      name,
      label,
      value: draft[name],
      onChange: (v) => change(name, v),
      ...props,
    });
  const meta = result.body?.meta,
    page = Number(params.get('page') || 1);
  const view = {
    sort: params.get('sort') || '-publishedAt',
    limit: params.get('limit') || '20',
  };
  return h(
    'section',
    { className: 'explore' },
    h(
      'header',
      { className: 'explore-heading' },
      h(
        'div',
        { className: 'community-heading-actions' },
        h('h1', null, posts ? 'Cộng đồng công thức' : 'Khám phá công thức'),
        posts &&
          h(
            Link,
            { className: 'text-link', href: '/my/recipes/new' },
            h(Icon, { name: 'plus', size: 16 }),
            'Tạo công thức',
          ),
      ),
      h(SearchForm, {
        id: 'explore-search',
        value: draft.q,
        onQueryChange: (v) => change('q', v),
        onSearch: apply,
      }),
    ),
    h(
      'div',
      { className: 'explore-layout' },
      h(
        'aside',
        { className: 'filter-aside' },
        h(
          'details',
          {
            className: 'filter-panel',
            open: expanded,
            onToggle: (e) => setExpanded(e.currentTarget.open),
          },
          h('summary', null, h(Icon, { name: 'settings', size: 18 }), 'Bộ lọc'),
          h(
            'form',
            {
              onSubmit: (e) => {
                e.preventDefault();
                apply();
              },
            },
            field('category', 'Danh mục', {
              options: [
                ['', 'Tất cả'],
                ...(draft.category &&
                !categories.options.some((c) => c.id === draft.category)
                  ? [[draft.category, 'Danh mục đã chọn']]
                  : []),
                ...categories.options.map((c) => [c.id, c.name]),
              ],
            }),
            categories.controls,
            field('difficulty', 'Độ khó', {
              options: [['', 'Tất cả'], ...Object.entries(difficulties)],
            }),
            h(
              'div',
              { className: 'filter-pair' },
              field('maxMinutes', 'Tối đa (phút)', {
                type: 'number',
                min: 0,
                max: 2880,
              }),
              field('tag', 'Nhãn', { maxLength: 40 }),
            ),
            h(
              'fieldset',
              { className: 'ingredient-filter' },
              h('legend', null, 'Nguyên liệu'),
              h('input', {
                type: 'search',
                'aria-label': 'Tìm trong danh mục nguyên liệu',
                placeholder: 'Tìm nguyên liệu',
                value: term,
                maxLength: 100,
                onChange: (e) => setTerm(e.target.value),
              }),
              h(
                'div',
                {
                  className: 'ingredient-options',
                  'aria-busy': catalog.status === 'loading',
                },
                options.map((o) =>
                  h(
                    'label',
                    { key: o.id },
                    h('input', {
                      type: 'checkbox',
                      checked: selected.includes(o.id),
                      disabled:
                        !selected.includes(o.id) && selected.length >= 20,
                      onChange: (e) =>
                        selectIngredient(o.id, e.target.checked, o.name),
                    }),
                    o.name,
                  ),
                ),
              ),
              catalog.status === 'loading' &&
                h('small', { role: 'status' }, 'Đang tải nguyên liệu…'),
              catalog.status === 'error' &&
                h(
                  'div',
                  { role: 'alert' },
                  'Chưa tải được nguyên liệu.',
                  h(
                    Button,
                    {
                      className: 'quiet-button',
                      onClick: () => reloadCatalog((n) => n + 1),
                    },
                    'Thử lại nguyên liệu',
                  ),
                ),
              catalog.status === 'ready' &&
                !options.length &&
                term &&
                h('small', null, 'Không tìm thấy nguyên liệu.'),
              options.length === limit &&
                (limit < 100
                  ? h(
                      Button,
                      {
                        className: 'quiet-button',
                        onClick: () => setLimit((n) => Math.min(n + 20, 100)),
                      },
                      'Tải thêm nguyên liệu',
                    )
                  : h('small', null, 'Nhập tên cụ thể hơn để tìm tiếp.')),
              selected.length > 0 &&
                h(
                  'div',
                  { className: 'ingredient-selection' },
                  h(
                    'small',
                    null,
                    'Đã chọn ' + selected.map(labelFor).join(', '),
                  ),
                  h(Field, {
                    label: 'Cách khớp',
                    name: 'ingredientMatch',
                    value: draft.ingredientMatch || 'any',
                    options: [
                      ['any', 'Có ít nhất một'],
                      ['all', 'Có tất cả'],
                    ],
                    onChange: (v) => change('ingredientMatch', v),
                  }),
                  h(
                    Button,
                    {
                      className: 'quiet-button',
                      onClick: () =>
                        setDraft((old) => ({
                          ...old,
                          ingredientIds: '',
                          ingredientMatch: '',
                        })),
                    },
                    'Bỏ chọn nguyên liệu',
                  ),
                ),
            ),
            h(Button, { type: 'submit' }, 'Áp dụng bộ lọc'),
          ),
        ),
      ),
      h(
        'div',
        { className: 'explore-results' },
        h(
          'div',
          { className: 'results-tools' },
          h(
            'h2',
            null,
            Number.isFinite(meta?.total)
              ? meta.total + ' công thức'
              : 'Kết quả',
          ),
          h(
            'div',
            { className: 'view-tools' },
            h(
              'nav',
              { className: 'view-switch', 'aria-label': 'Cách xem công thức' },
              h(
                Link,
                {
                  href: viewHref('grid'),
                  'aria-current': !posts ? 'page' : undefined,
                },
                h(Icon, { name: 'grid', size: 15 }),
                'Lưới',
              ),
              h(
                Link,
                {
                  href: viewHref('posts'),
                  'aria-current': posts ? 'page' : undefined,
                },
                h(Icon, { name: 'book', size: 16 }),
                'Bài viết',
              ),
            ),
            h(Field, {
              name: 'sort',
              label: 'Sắp xếp',
              value: view.sort,
              onChange: (v) => update({ sort: v }),
              options: [
                ['-publishedAt', 'Mới nhất'],
                ['publishedAt', 'Cũ nhất'],
              ],
            }),
            h(Field, {
              name: 'limit',
              label: 'Số món mỗi trang',
              value: view.limit,
              onChange: (v) => update({ limit: v }),
              options: [...new Set([view.limit, '12', '20', '24', '100'])].map(
                (v) => [v, v],
              ),
            }),
          ),
        ),
        (chips.length > 0 || error) &&
          h(
            'div',
            { className: 'applied-filters' },
            chips,
            h(
              Button,
              {
                className: 'quiet-button',
                onClick: () => {
                  setDraft(readFilters(new URLSearchParams()));
                  update(view, true);
                },
              },
              'Xóa bộ lọc',
            ),
          ),
        error
          ? h(ErrorState, { error: { status: 400 } })
          : posts && result.status === 'ready' && result.body?.data?.length
            ? h(
                InteractionScope,
                {
                  session,
                  recipes: result.body.data,
                  onUnavailable: () => setReload((n) => n + 1),
                },
                h(
                  'div',
                  { className: 'community-feed' },
                  result.body.data.map((recipe) =>
                    h(RecipePost, {
                      key: recipe.recipeId,
                      recipe,
                      session,
                      categoryName: categories.options.find(
                        (c) => c.id === recipe.categoryId,
                      )?.name,
                    }),
                  ),
                ),
              )
            : h(RecipeGrid, {
                result,
                onRetry: () => setReload((n) => n + 1),
                emptyTitle: 'Không tìm thấy công thức phù hợp',
              }),
        meta &&
          (page > 1 || page * meta.limit < meta.total) &&
          h(
            'nav',
            { className: 'pagination', 'aria-label': 'Phân trang công thức' },
            page > 1 &&
              h(
                Button,
                {
                  className: 'button-secondary',
                  onClick: () => update({ page: String(page - 1) }),
                },
                'Trang trước',
              ),
            h('span', null, 'Trang ' + page),
            page * meta.limit < meta.total &&
              page < 1000 &&
              h(
                Button,
                {
                  className: 'button-secondary',
                  onClick: () => update({ page: String(page + 1) }),
                },
                'Trang sau',
              ),
          ),
      ),
    ),
  );
}
