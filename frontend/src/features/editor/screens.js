import { MediaPicker } from '../media/MediaPicker.js';
import { createElement as h, useEffect, useRef, useState } from 'react';
import { Link, navigate, guardNavigation } from '../../app/router.js';
import {
  requestApi,
  useRead,
  recipeHref,
  ApiError,
} from '../../services/api.js';
import { Button, ErrorState } from '../../components/ui/primitives.js';
import { useCategoryOptions } from '../category-options.js';
import {
  emptyRecipe,
  editValues,
  rowKey,
  moveRow,
  serializeRecipe,
  validateRecipe,
  confirmedRecipe,
  recipeError,
} from './model.js';
const editHref = (id) => `/my/recipes/${id}/edit`;
export function MyRecipes({ session, search }) {
  const params = new URLSearchParams(search),
    raw = params.get('page') || '1';
  const valid =
    /^[1-9]\d{0,3}$/.test(raw) &&
    Number(raw) <= 1000 &&
    [...params.keys()].every((k) => k === 'page') &&
    params.getAll('page').length <= 1;
  const page = Number(raw),
    [reload, setReload] = useState(0);
  const result = useRead(
    valid ? `/me/recipes?page=${page}&limit=20&sort=-updatedAt` : null,
    reload,
    { privateRequest: true, revision: session.revision },
  );
  const rows = result.body?.data,
    meta = result.body?.meta;
  return h(
    'section',
    { className: 'page-panel editor-page' },
    h('h1', null, 'Bản nháp của tôi'),
    h(
      'p',
      null,
      'Danh sách này chỉ gồm bản nháp. Công thức đã xuất bản được quản lý qua đường dẫn đã nhận khi xuất bản.',
    ),
    h(Link, { href: '/my/recipes/new', className: 'button' }, 'Tạo công thức'),
    h(Link, { href: '/account', className: 'text-link' }, 'Tài khoản'),
    !valid
      ? h('p', { role: 'alert' }, 'Trang không hợp lệ.')
      : result.status === 'loading'
        ? h('p', { role: 'status' }, 'Đang tải bản nháp…')
        : result.status === 'error'
          ? h(ErrorState, {
              error: result.error,
              onRetry: () => setReload((n) => n + 1),
            })
          : Array.isArray(rows) && meta
            ? h(
                'div',
                null,
                !rows.length
                  ? h('p', null, 'Chưa có bản nháp ở trang này.')
                  : h(
                      'ul',
                      { className: 'owner-list' },
                      rows.map((r) =>
                        h(
                          'li',
                          { key: r.recipeId },
                          h(
                            'h2',
                            null,
                            h(
                              Link,
                              { href: editHref(r.recipeId) },
                              r.title || 'Bản nháp chưa có tên',
                            ),
                          ),
                          h(
                            'p',
                            null,
                            'Bản nháp · ',
                            r.moderationStatus === 'hidden'
                              ? 'Đang bị ẩn · '
                              : '',
                            new Date(r.updatedAt).toLocaleDateString('vi-VN'),
                          ),
                          h(
                            Link,
                            {
                              href: editHref(r.recipeId),
                              className: 'text-link',
                            },
                            'Mở bản nháp',
                          ),
                        ),
                      ),
                    ),
                h(
                  'nav',
                  {
                    'aria-label': 'Phân trang bản nháp',
                    className: 'editor-actions',
                  },
                  page > 1 &&
                    h(
                      Link,
                      {
                        href: '/my/recipes?page=' + (page - 1),
                        className: 'button',
                      },
                      'Trang trước',
                    ),
                  h('span', null, `Trang ${page} · ${meta.total} bản nháp`),
                  page * 20 < meta.total &&
                    page < 1000 &&
                    h(
                      Link,
                      {
                        href: '/my/recipes?page=' + (page + 1),
                        className: 'button',
                      },
                      'Trang sau',
                    ),
                ),
              )
            : h(ErrorState, {
                title: 'Phản hồi danh sách không hợp lệ',
                onRetry: () => setReload((n) => n + 1),
              }),
  );
}
export function EditorScreen({ recipeId, session }) {
  const [reload, setReload] = useState(0);
  const result = useRead(recipeId ? '/me/recipes/' + recipeId : null, reload, {
    privateRequest: true,
    revision: session.revision,
  });
  if (!recipeId) return h(RecipeEditor, { session });
  if (result.status === 'loading')
    return h(
      'section',
      { className: 'page-panel', role: 'status' },
      'Đang tải công thức của bạn…',
    );
  if (result.status === 'error')
    return h(
      'section',
      { className: 'page-panel' },
      h('h1', null, 'Quản lý công thức'),
      h('p', { role: 'alert' }, recipeError(result.error)),
      h(ErrorState, {
        error: result.error,
        onRetry: () => setReload((n) => n + 1),
      }),
      h(Link, { href: '/my/recipes' }, 'Về bản nháp'),
    );
  let recipe;
  try {
    recipe = confirmedRecipe(result.body);
  } catch {
    return h(ErrorState, {
      title: 'Phản hồi công thức không hợp lệ',
      onRetry: () => setReload((n) => n + 1),
    });
  }
  return h(RecipeEditor, { key: recipeId, initial: recipe, session });
}
function useLeaveWarning(dirtyRef) {
  useEffect(() => {
    const check = () =>
      !dirtyRef.current ||
      window.confirm(
        'Có thay đổi chưa lưu hoặc kết quả chưa xác định. Rời trang và bỏ dữ liệu cục bộ?',
      );
    const unregister = guardNavigation(check);
    const before = (e) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const external = (e) => {
      const a = e.target.closest?.('a');
      if (
        a &&
        (a.target ||
          new URL(a.href, location.href).origin !== location.origin) &&
        !check()
      )
        e.preventDefault();
    };
    window.addEventListener('beforeunload', before);
    document.addEventListener('click', external, true);
    return () => {
      unregister();
      window.removeEventListener('beforeunload', before);
      document.removeEventListener('click', external, true);
    };
  }, [dirtyRef]);
}
function RecipeEditor({ initial }) {
  const [server, setServer] = useState(initial || null),
    [values, setValues] = useState(() =>
      initial ? editValues(initial) : emptyRecipe(),
    );
  const [state, setState] = useState('ready'),
    [errors, setErrors] = useState({}),
    [failure, setFailure] = useState(null),
    [announcement, announce] = useState(''),
    [confirmation, setConfirmation] = useState(null),
    [review, setReview] = useState(null);
  const [mediaSelections, setMediaSelections] = useState({});
  const unresolvedMedia = Object.values(mediaSelections).some(Boolean);
  const selectMedia = (key, value) => {
    setMediaSelections((old) => {
      if (value) return old[key] ? old : { ...old, [key]: true };
      if (!Object.hasOwn(old, key)) return old;
      const next = { ...old };
      delete next[key];
      return next;
    });
    if (value) {
      dirty.current = true;
      setState('dirty');
    }
  };
  const [mediaPending, setMediaPending] = useState(0);
  const mediaBusy = (delta) => setMediaPending((n) => Math.max(0, n + delta));
  const [cooldown, setCooldown] = useState(0);
  const lock = useRef(false),
    alive = useRef(true),
    controller = useRef(),
    form = useRef(),
    dirty = useRef(false),
    intent = useRef(null),
    focusKey = useRef(null);
  const publicResult = useRead(
    server?.status === 'published' && recipeHref(server)
      ? '/recipes/' + server.slug
      : null,
  );
  const publicLink =
    publicResult.status === 'ready' &&
    publicResult.body?.data?.recipeId === server?.recipeId
      ? recipeHref(server)
      : null;
  const categories = useCategoryOptions();
  const [term, setTerm] = useState(''),
    [query, setQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQuery(term), 250);
    return () => clearTimeout(timer);
  }, [term]);
  const catalog = useRead(
    query && query.length <= 100 && !/[<>\p{Cc}\p{Cf}]/u.test(query)
      ? '/ingredients?' + new URLSearchParams({ q: query, limit: '20' })
      : null,
  );
  useLeaveWarning(dirty);
  useEffect(
    () => () => {
      alive.current = false;
      controller.current?.abort();
      intent.current = null;
    },
    [],
  );
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(
      () => setCooldown((n) => Math.max(0, n - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => {
    if (focusKey.current) {
      document.getElementById(focusKey.current)?.focus();
      focusKey.current = null;
    }
  }, [values.ingredients, values.steps, announcement]);
  const editable = !server || server.status === 'draft';
  const blocked =
    mediaPending > 0 ||
    state === 'saving' ||
    state === 'uncertain' ||
    state === 'conflict' ||
    failure?.code === 'CSRF_INVALID' ||
    cooldown > 0;
  function change(field, value) {
    setValues((v) => ({ ...v, [field]: value }));
    dirty.current = true;
    setState('dirty');
    announce('');
    setErrors({});
  }
  function changeRow(kind, key, field, value) {
    change(
      kind,
      values[kind].map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );
  }
  function add(kind) {
    const key = rowKey();
    focusKey.current = `${kind}-${key}`;
    change(kind, [
      ...values[kind],
      kind === 'ingredients'
        ? {
            key,
            name: '',
            ingredientId: '',
            quantity: '',
            unit: '',
            quantityText: '',
            note: '',
          }
        : { key, instruction: '', durationMinutes: '' },
    ]);
    announce(
      kind === 'ingredients' ? 'Đã thêm nguyên liệu.' : 'Đã thêm bước nấu.',
    );
  }
  function rowAction(kind, key, action) {
    const rows = values[kind],
      i = rows.findIndex((r) => r.key === key);
    if (action === 'remove') {
      const next = rows.filter((r) => r.key !== key);
      focusKey.current = next.length
        ? `${kind}-${next[Math.min(i, next.length - 1)].key}`
        : 'add-' + kind;
      change(kind, next);
      announce('Đã xóa dòng.');
    } else {
      change(kind, moveRow(rows, key, action));
      focusKey.current = `${kind}-${key}`;
      announce('Đã đổi thứ tự.');
    }
  }
  function focusErrors(next) {
    setErrors(next);
    setState('error');
    queueMicrotask(() => {
      const first = form.current?.querySelector('[aria-invalid="true"]');
      (first || document.getElementById('editor-errors'))?.focus();
    });
  }
  function accept(recipe, message) {
    setServer(recipe);
    setValues(editValues(recipe));
    setState('saved');
    setErrors({});
    setFailure(null);
    setReview(null);
    dirty.current = false;
    intent.current = null;
    announce(message);
  }
  async function perform(action, retryIntent = false) {
    if (lock.current || (!retryIntent && blocked)) return;
    if (action === 'save' && unresolvedMedia) {
      announce('Tải ảnh lên hoặc bỏ lựa chọn trước khi lưu.');
      return;
    }
    if (action === 'save') {
      const next = validateRecipe(values);
      if (Object.keys(next).length) {
        focusErrors(next);
        return;
      }
    }
    if (action === 'publish') {
      const next = validateRecipe(values, true);
      if (Object.keys(next).length) {
        focusErrors(next);
        return;
      }
      if (dirty.current) {
        announce('Lưu bản nháp trước khi xuất bản.');
        return;
      }
    }
    lock.current = true;
    setState('saving');
    setFailure(null);
    setConfirmation(null);
    controller.current = new AbortController();
    const options = { signal: controller.current.signal };
    let creating = !server && action === 'save';
    try {
      let response;
      if (creating) {
        if (!intent.current)
          intent.current = {
            key: crypto.randomUUID(),
            body: serializeRecipe(values),
          };
        response = await requestApi('/recipes', {
          ...options,
          method: 'POST',
          body: intent.current.body,
          idempotencyKey: intent.current.key,
        });
      } else if (action === 'delete') {
        response = await requestApi('/recipes/' + server.recipeId, {
          ...options,
          method: 'DELETE',
        });
        if (response !== null)
          throw new ApiError(0, 'INVALID_RESPONSE', {
            mutationOutcomeUncertain: true,
          });
        if (!alive.current) return;
        dirty.current = false;
        navigate('/my/recipes', { replace: true });
        return;
      } else
        response = await requestApi(
          '/recipes/' +
            server.recipeId +
            (action === 'save' ? '' : '/' + action),
          {
            ...options,
            method: 'PATCH',
            body:
              action === 'save'
                ? serializeRecipe(values, server.version)
                : { version: server.version },
          },
        );
      if (!alive.current) return;
      const recipe = confirmedRecipe(response, creating ? 201 : 200);
      if (
        (action === 'publish' && recipe.status !== 'published') ||
        (action === 'unpublish' && recipe.status !== 'draft')
      )
        throw new ApiError(0, 'INVALID_RESPONSE', {
          mutationOutcomeUncertain: true,
        });
      accept(
        recipe,
        action === 'publish'
          ? 'Máy chủ xác nhận đã xuất bản.'
          : action === 'unpublish'
            ? 'Đã ngừng xuất bản.'
            : 'Đã lưu bản nháp.',
      );
      if (creating) {
        navigate(editHref(recipe.recipeId), { replace: true });
        return;
      }
    } catch (error) {
      if (!alive.current) return;
      setFailure(error);
      setCooldown(Math.min(3600, error.retryAfterSeconds || 0));
      if (error.mutationOutcomeUncertain) {
        setState('uncertain');
        dirty.current = true;
      } else if (error.status === 409) {
        setState('conflict');
      } else {
        setState('error');
        if (creating) intent.current = null;
      }
      const details = Object.fromEntries(
        (error.details || []).map((d) => [
          d.field,
          'Máy chủ từ chối giá trị này (' + d.code + ').',
        ]),
      );
      if (Object.keys(details).length) focusErrors(details);
    } finally {
      lock.current = false;
      if (alive.current) setConfirmation(null);
    }
  }
  async function reconcile() {
    if (lock.current || !server) return;
    lock.current = true;
    controller.current = new AbortController();
    try {
      const result = await requestApi('/me/recipes/' + server.recipeId, {
        signal: controller.current.signal,
        contextSensitive: true,
      });
      const current = confirmedRecipe(result);
      if (alive.current) setReview(current);
    } catch (e) {
      if (alive.current) setFailure(e);
    } finally {
      lock.current = false;
    }
  }
  function input(
    field,
    label,
    { type = 'text', maxLength, options, id, help, ...props } = {},
  ) {
    const value = field.split('.').reduce((v, k) => v?.[k], values) ?? '';
    const parts = field.split('.'),
      kind = parts[0],
      index = Number(parts[1]),
      row = values[kind]?.[index];
    const control = {
      id: id || 'editor-' + field,
      name: field,
      value,
      onChange: (e) =>
        parts.length === 3
          ? changeRow(kind, row.key, parts[2], e.target.value)
          : change(field, e.target.value),
      'aria-invalid': Boolean(errors[field]),
      'aria-describedby': errors[field]
        ? 'error-' + field
        : help
          ? 'help-' + field
          : undefined,
      ...props,
    };
    return h(
      'div',
      { className: 'editor-field', key: field },
      h('label', { htmlFor: control.id }, label),
      options
        ? h(
            'select',
            control,
            options.map(([value, text]) =>
              h('option', { key: value, value }, text),
            ),
          )
        : h('input', { ...control, type, maxLength }),
      help && h('small', { id: 'help-' + field }, help),
      errors[field] &&
        h(
          'p',
          { id: 'error-' + field, className: 'form-error' },
          errors[field],
        ),
    );
  }
  function rowControls(kind, r, i) {
    if (!editable) return null;
    return h(
      'div',
      { className: 'editor-actions' },
      h(
        Button,
        {
          disabled: i === 0,
          onClick: () => rowAction(kind, r.key, -1),
          'aria-label': `Đưa ${kind === 'steps' ? 'bước' : 'nguyên liệu'} ${i + 1} lên`,
        },
        'Lên',
      ),
      h(
        Button,
        {
          disabled: i === values[kind].length - 1,
          onClick: () => rowAction(kind, r.key, 1),
          'aria-label': `Đưa ${kind === 'steps' ? 'bước' : 'nguyên liệu'} ${i + 1} xuống`,
        },
        'Xuống',
      ),
      h(
        Button,
        {
          onClick: () => rowAction(kind, r.key, 'remove'),
          'aria-label': `Xóa ${kind === 'steps' ? 'bước' : 'nguyên liệu'} ${i + 1}`,
        },
        'Xóa dòng',
      ),
    );
  }
  return h(
    'section',
    { className: 'page-panel editor-page' },
    h(
      Link,
      { href: '/my/recipes', className: 'text-link' },
      '← Bản nháp của tôi',
    ),
    h('h1', null, server ? 'Quản lý công thức' : 'Tạo công thức'),
    server &&
      h(
        'p',
        null,
        `${server.status === 'draft' ? 'Bản nháp' : 'Đã xuất bản'} · Phiên bản ${server.version}${server.moderationStatus === 'hidden' ? ' · Đang bị ẩn' : ''}`,
      ),
    h(
      'p',
      { role: 'status', 'aria-live': 'polite' },
      state === 'saving'
        ? 'Đang gửi yêu cầu…'
        : state === 'dirty'
          ? 'Có thay đổi chưa lưu.'
          : announcement,
    ),
    failure &&
      h(
        'p',
        { role: 'alert' },
        recipeError(failure),
        cooldown ? ` Chờ ${cooldown} giây.` : '',
      ),
    Object.keys(errors).length > 0 &&
      h(
        'div',
        { id: 'editor-errors', tabIndex: -1, role: 'alert' },
        h('p', null, 'Vui lòng kiểm tra dữ liệu:'),
        h(
          'ul',
          null,
          Object.entries(errors).map(([f, m]) =>
            h('li', { key: f }, f + ': ' + m),
          ),
        ),
      ),
    ['uncertain', 'conflict'].includes(state) &&
      h(
        'div',
        { className: 'editor-review' },
        server
          ? h(Button, { onClick: reconcile }, 'Đọc bản máy chủ để đối chiếu')
          : h(
              'div',
              null,
              h(
                'p',
                null,
                'Ý định tạo và khóa chống trùng được giữ trong bộ nhớ. Có thể xem danh sách hoặc chủ động kiểm tra lại cùng yêu cầu; không tự tạo ý định mới.',
              ),
              h(
                Button,
                { onClick: () => perform('save', true) },
                'Kiểm tra lại cùng yêu cầu tạo',
              ),
            ),
      ),
    review &&
      h(
        'section',
        { className: 'editor-review' },
        h('h2', null, 'Bản trên máy chủ'),
        h(
          'p',
          null,
          `${review.title || 'Chưa có tên'} · ${review.status} · Phiên bản ${review.version}`,
        ),
        h(
          'p',
          null,
          'Thay đổi cục bộ vẫn được giữ bên dưới; chọn nạp lại sẽ bỏ chúng.',
        ),
        h(
          'details',
          null,
          h('summary', null, 'Xem dữ liệu máy chủ'),
          h(
            'pre',
            null,
            JSON.stringify(serializeRecipe(editValues(review)), null, 2),
          ),
        ),
        h(
          Button,
          {
            onClick: () => {
              if (window.confirm('Bỏ thay đổi cục bộ và dùng bản máy chủ?'))
                accept(review, 'Đã nạp bản máy chủ.');
            },
          },
          'Dùng bản máy chủ',
        ),
      ),
    h(
      'form',
      {
        ref: form,
        noValidate: true,
        'aria-label': 'Biên tập công thức',
        onSubmit: (e) => {
          e.preventDefault();
          perform('save');
        },
      },
      h(
        'fieldset',
        { disabled: !editable || blocked },
        h('legend', null, 'Thông tin công thức'),
        h(
          'p',
          null,
          'Nháp được phép thiếu dữ liệu. Các trường văn bản chỉ nhận một dòng; không tự xóa ký tự bạn nhập.',
        ),
        input('title', 'Tên công thức', { maxLength: 151 }),
        input('description', 'Mô tả', { maxLength: 2001 }),
        input('categoryId', 'Danh mục', {
          options: [
            ['', 'Chưa chọn'],
            ...(values.categoryId &&
            !categories.options.some((c) => c.id === values.categoryId)
              ? [[values.categoryId, 'Danh mục hiện tại (chưa tra được tên)']]
              : []),
            ...categories.options.map((c) => [c.id, c.name]),
          ],
        }),
        categories.controls,
        input('difficulty', 'Độ khó', {
          options: [
            ['', 'Chưa chọn'],
            ['easy', 'Dễ'],
            ['medium', 'Vừa'],
            ['hard', 'Khó'],
          ],
        }),
        h(
          'div',
          { className: 'editor-grid' },
          input('prepMinutes', 'Chuẩn bị (phút)', {
            type: 'number',
            min: 0,
            max: 1440,
          }),
          input('cookMinutes', 'Nấu (phút)', {
            type: 'number',
            min: 0,
            max: 1440,
          }),
          input('servings', 'Khẩu phần', { type: 'number', min: 1, max: 100 }),
        ),
        h(
          'div',
          { className: 'editor-field' },
          h(
            'label',
            { htmlFor: 'recipe-tags' },
            'Nhãn (mỗi nhãn cách bằng dấu phẩy)',
          ),
          h('input', {
            id: 'recipe-tags',
            value: values.tags.join(','),
            onChange: (e) =>
              change(
                'tags',
                e.target.value === '' ? [] : e.target.value.split(','),
              ),
            'aria-invalid': !!errors.tags,
            'aria-describedby': errors.tags ? 'tags-error' : undefined,
          }),
          errors.tags && h('p', { id: 'tags-error' }, errors.tags),
        ),
        h('h2', null, 'Nguyên liệu'),
        h(
          'p',
          null,
          'Có thể nhập tên tự do hoặc chọn nguyên liệu chuẩn còn hoạt động. Tối đa 40 dòng.',
        ),
        h('label', { htmlFor: 'ingredient-search' }, 'Tìm nguyên liệu chuẩn'),
        h('input', {
          id: 'ingredient-search',
          value: term,
          maxLength: 101,
          onChange: (e) => setTerm(e.target.value),
        }),
        catalog.status === 'loading' &&
          h('p', { role: 'status' }, 'Đang tìm nguyên liệu…'),
        catalog.status === 'error' &&
          h(
            'p',
            { role: 'alert' },
            'Chưa tìm được nguyên liệu chuẩn. Bạn vẫn có thể nhập tên tự do.',
          ),
        values.ingredients.map((r, i) =>
          h(
            'fieldset',
            { key: r.key, className: 'editor-row' },
            h('legend', null, `Nguyên liệu ${i + 1}`),
            input(`ingredients.${i}.name`, 'Tên nguyên liệu ' + (i + 1), {
              id: `ingredients-${r.key}`,
              maxLength: 101,
            }),
            input(
              `ingredients.${i}.ingredientId`,
              'Nguyên liệu chuẩn ' + (i + 1),
              {
                options: [
                  ['', 'Nhập tên tự do'],
                  ...(r.ingredientId &&
                  !catalog.body?.data?.some((c) => c.id === r.ingredientId)
                    ? [[r.ingredientId, 'Nguyên liệu hiện tại']]
                    : []),
                  ...(catalog.body?.data || []).map((c) => [c.id, c.name]),
                ],
              },
            ),
            h(
              'div',
              { className: 'editor-grid' },
              input(`ingredients.${i}.quantity`, 'Định lượng ' + (i + 1), {
                type: 'number',
                min: 0,
                max: 1e9,
                step: 'any',
              }),
              input(`ingredients.${i}.unit`, 'Đơn vị ' + (i + 1), {
                maxLength: 33,
              }),
            ),
            input(`ingredients.${i}.quantityText`, 'Mô tả lượng ' + (i + 1), {
              maxLength: 101,
            }),
            input(`ingredients.${i}.note`, 'Ghi chú nguyên liệu ' + (i + 1), {
              maxLength: 501,
            }),
            rowControls('ingredients', r, i),
          ),
        ),
        editable &&
          h(
            Button,
            {
              id: 'add-ingredients',
              disabled: values.ingredients.length >= 40,
              onClick: () => add('ingredients'),
            },
            'Thêm nguyên liệu',
          ),
        h('h2', null, 'Các bước nấu'),
        values.steps.map((r, i) =>
          h(
            'fieldset',
            { key: r.key, className: 'editor-row' },
            h('legend', null, `Bước ${i + 1}`),
            input(`steps.${i}.instruction`, 'Hướng dẫn bước ' + (i + 1), {
              id: `steps-${r.key}`,
              maxLength: 2001,
              help: 'Tối đa 2000 ký tự trên một dòng; xuất bản cần ít nhất 5 ký tự.',
            }),
            input(`steps.${i}.durationMinutes`, 'Thời gian bước ' + (i + 1), {
              type: 'number',
              min: 0,
              max: 1440,
            }),
            h(MediaPicker, {
              label: 'Ảnh bước ' + (i + 1),
              purpose: 'recipe_step',
              assetId: r.imageAssetId,
              url: r.imageUrl,
              disabled: blocked || !editable,
              onBusy: mediaBusy,
              onUnresolved: (value) => selectMedia(r.key, value),
              onChange: (id) => changeRow('steps', r.key, 'imageAssetId', id),
            }),
            rowControls('steps', r, i),
          ),
        ),
        editable &&
          h(
            Button,
            {
              id: 'add-steps',
              disabled: values.steps.length >= 30,
              onClick: () => add('steps'),
            },
            'Thêm bước nấu',
          ),
        editable &&
          h(
            'div',
            { className: 'editor-actions' },
            h(
              Button,
              { type: 'submit', disabled: unresolvedMedia },
              server ? 'Lưu bản nháp' : 'Tạo bản nháp',
            ),
          ),
      ),
    ),
    !editable &&
      h(
        'p',
        null,
        'Công thức đã xuất bản: ngừng xuất bản trước khi chỉnh sửa hoặc xóa.',
      ),
    h(MediaPicker, {
      label: 'Ảnh bìa',
      purpose: 'recipe_cover',
      assetId: values.coverImageAssetId,
      url: values.coverImageUrl,
      disabled: blocked || !editable,
      onBusy: mediaBusy,
      onUnresolved: (value) => selectMedia('cover', value),
      onChange: (id) => change('coverImageAssetId', id),
    }),
    server &&
      h(
        'div',
        { className: 'editor-actions' },
        server.status === 'draft' &&
          server.moderationStatus === 'normal' &&
          h(
            Button,
            {
              disabled: blocked || dirty.current,
              onClick: () => setConfirmation('publish'),
            },
            'Xuất bản',
          ),
        server.status === 'published' &&
          h(
            Button,
            { disabled: blocked, onClick: () => setConfirmation('unpublish') },
            'Ngừng xuất bản',
          ),
        server.status === 'draft' &&
          h(
            Button,
            { disabled: blocked, onClick: () => setConfirmation('delete') },
            'Xóa bản nháp',
          ),
        publicLink &&
          h(
            Link,
            { href: publicLink, className: 'button' },
            'Xem công thức công khai',
          ),
      ),
    confirmation &&
      h(
        'section',
        { className: 'editor-confirm', 'aria-label': 'Xác nhận thao tác' },
        h(
          'h2',
          { tabIndex: -1, ref: (el) => el?.focus() },
          confirmation === 'delete'
            ? 'Xác nhận xóa bản nháp?'
            : confirmation === 'publish'
              ? 'Xác nhận xuất bản?'
              : 'Xác nhận ngừng xuất bản?',
        ),
        h(
          'p',
          null,
          confirmation === 'delete'
            ? 'Công thức sẽ bị xóa mềm trên máy chủ. Thay đổi chưa lưu sẽ bị bỏ.'
            : confirmation === 'publish'
              ? 'Máy chủ sẽ kiểm tra dữ liệu trước khi công khai.'
              : 'Công thức sẽ rời trang công khai và trở lại bản nháp.',
        ),
        h(Button, { onClick: () => perform(confirmation) }, 'Xác nhận'),
        h(Button, { onClick: () => setConfirmation(null) }, 'Hủy'),
      ),
  );
}
