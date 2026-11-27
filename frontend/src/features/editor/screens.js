import { RecipePreview } from './preview.js';
import { MediaPicker } from '../media/MediaPicker.js';
import { createElement as h, useEffect, useRef, useState } from 'react';
import { Link, navigate, guardNavigation } from '../../app/router.js';
import {
  requestApi,
  getCsrfToken,
  useRead,
  recipeHref,
  ApiError,
} from '../../services/api.js';
import { Button, ErrorState, Icon } from '../../components/ui/primitives.js';
import { useCategoryOptions } from '../category-options.js';
import {
  emptyRecipe,
  editValues,
  rowKey,
  moveRow,
  serializeRecipe,
  validateRecipe,
  toPreviewModel,
  confirmedRecipe,
  recipeError,
} from './model.js';
const editHref = (id) => `/my/recipes/${id}/edit`;
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
function RecipeEditor({ initial, session }) {
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
  const [images, setImages] = useState({});
  const [fullPreview, setFullPreview] = useState(false);
  function localImage(key, url) {
    setImages((old) => {
      if (old[key] === url || (!url && !old[key])) return old;
      const next = { ...old };
      if (url) next[key] = url;
      else delete next[key];
      return next;
    });
  }
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
  const [checkingSession, setCheckingSession] = useState(false);
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
    server?.version,
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
  const published = server?.status === 'published';
  const editable = !published || server.moderationStatus === 'normal';
  const sending = ['saving', 'publishing', 'unpublishing', 'updating'].includes(
    state,
  );
  const blocked =
    mediaPending > 0 ||
    sending ||
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
      let disclosure = first?.closest('details');
      while (disclosure) {
        disclosure.open = true;
        disclosure = disclosure.parentElement?.closest('details');
      }
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
      if (!editable || (published && !dirty.current)) return;
      const next = validateRecipe(values, published);
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
    setState(
      action === 'publish'
        ? 'publishing'
        : action === 'unpublish'
          ? 'unpublishing'
          : published
            ? 'updating'
            : 'saving',
    );
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
            (action === 'save'
              ? published
                ? '/published-content'
                : ''
              : '/' + action),
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
        (action === 'save' &&
          published &&
          (recipe.status !== 'published' ||
            recipe.recipeId !== server.recipeId ||
            recipe.version !== server.version + 1)) ||
        (action === 'publish' && recipe.status !== 'published') ||
        (action === 'unpublish' && recipe.status !== 'draft')
      )
        throw new ApiError(0, 'INVALID_RESPONSE', {
          mutationOutcomeUncertain: true,
        });
      if (action === 'unpublish' && dirty.current) {
        setServer(recipe);
        setState('dirty');
        announce('Đã ngừng xuất bản. Phần đang sửa vẫn ở trong trình soạn.');
        return;
      }
      accept(
        recipe,
        action === 'publish'
          ? 'Máy chủ xác nhận đã xuất bản.'
          : action === 'unpublish'
            ? 'Đã ngừng xuất bản.'
            : published
              ? 'Đã cập nhật công thức công khai.'
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
          'Giá trị chưa hợp lệ. Hãy kiểm tra trường này.',
        ]),
      );
      if (Object.keys(details).length && error.status === 422)
        focusErrors(details);
      if (
        action === 'save' &&
        published &&
        (error.status === 409 || error.mutationOutcomeUncertain)
      ) {
        await readServer(error.mutationOutcomeUncertain);
      }
    } finally {
      lock.current = false;
      if (alive.current) setConfirmation(null);
    }
  }
  async function readServer(uncertainUpdate = false) {
    controller.current = new AbortController();
    try {
      const result = await requestApi('/me/recipes/' + server.recipeId, {
        signal: controller.current.signal,
        contextSensitive: true,
      });
      const current = confirmedRecipe(result);
      if (!alive.current) return;
      if (
        uncertainUpdate &&
        current.status === 'published' &&
        current.moderationStatus === 'normal' &&
        current.version === server.version + 1
      ) {
        const actual = serializeRecipe(editValues(current));
        const expected = serializeRecipe(values);
        // A successful save assigns IDs to newly added, image-free steps.
        expected.steps.forEach((step, i) => {
          if (!step.stepId && actual.steps[i]) delete actual.steps[i].stepId;
          if (step.imageAssetId === undefined) step.imageAssetId = null;
        });
        if (JSON.stringify(expected) === JSON.stringify(actual)) {
          accept(
            current,
            'Đã đối chiếu. Nội dung đang soạn đã có trên máy chủ.',
          );
          return;
        }
      }
      setReview(current);
    } catch (e) {
      if (alive.current) setFailure(e);
    }
  }
  async function renewSessionProtection() {
    if (lock.current) return;
    lock.current = true;
    setCheckingSession(true);
    controller.current = new AbortController();
    try {
      const identity = await requestApi('/auth/me', {
        signal: controller.current.signal,
        contextSensitive: true,
      });
      if (!alive.current) return;
      if (!identity.data?.id || identity.data.id !== session.body?.data?.id) {
        await session.refresh();
        return;
      }
      await getCsrfToken();
      if (!alive.current) return;
      setFailure(null);
      setState(dirty.current ? 'dirty' : 'ready');
      announce(
        'Đã xác nhận lại phiên. Bạn có thể tiếp tục với phần đang soạn.',
      );
    } catch {
      if (alive.current)
        announce('Chưa xác nhận được phiên. Hãy kiểm tra kết nối và thử lại.');
    } finally {
      lock.current = false;
      if (alive.current) setCheckingSession(false);
    }
  }
  async function reconcile() {
    if (lock.current || !server) return;
    lock.current = true;
    try {
      await readServer(published && state === 'uncertain');
    } finally {
      lock.current = false;
    }
  }
  function publishedPhoto(label, url) {
    return h(
      'section',
      { className: 'published-photo', 'aria-label': label },
      h('h3', null, label),
      url && h('img', { src: url, alt: label, loading: 'lazy' }),
      h('p', null, 'Để thay hoặc gỡ ảnh, hãy chuyển công thức về bản nháp.'),
      editable &&
        h(
          Button,
          {
            className: 'button-secondary',
            disabled: blocked,
            onClick: () => setConfirmation('unpublish'),
          },
          'Chuyển về nháp để sửa ảnh',
        ),
    );
  }
  function input(
    field,
    label,
    { type = 'text', maxLength, options, id, help, multiline, ...props } = {},
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
      h(
        'label',
        { htmlFor: control.id },
        row && parts.length === 3 ? label.replace(/\s+\d+$/, '') : label,
        row &&
          parts.length === 3 &&
          h('span', { className: 'sr-only' }, ' ' + (index + 1)),
      ),
      options
        ? h(
            'select',
            control,
            options.map(([value, text]) =>
              h('option', { key: value, value }, text),
            ),
          )
        : multiline
          ? h('textarea', { ...control, rows: 3, maxLength })
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
      { className: 'row-actions' },
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
          disabled: published && kind === 'steps' && Boolean(r.imageAssetId),
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
      {
        href: published ? '/my/recipes?tab=published' : '/my/recipes',
        className: 'text-link',
      },
      h(Icon, { name: 'back', size: 17 }),
      'Công thức của tôi',
    ),
    h(
      'header',
      { className: 'editor-heading' },
      h(
        'h1',
        null,
        published
          ? 'Chỉnh sửa công thức'
          : server
            ? 'Quản lý công thức'
            : 'Tạo công thức',
      ),
      server &&
        h(
          'p',
          null,
          (server.status === 'draft' ? 'Bản nháp' : 'Đã xuất bản') +
            ' · Phiên bản ' +
            server.version +
            (server.moderationStatus === 'hidden' ? ' · Đang bị ẩn' : ''),
        ),
    ),
    h(
      'div',
      { className: 'editor-bar' },
      h(
        'nav',
        { 'aria-label': 'Các phần công thức' },
        [
          ['info', 'Thông tin'],
          ['cover', 'Ảnh bìa'],
          ['ingredients', 'Nguyên liệu'],
          ['steps', 'Cách làm'],
        ].map(([id, label]) =>
          h(
            'a',
            {
              key: id,
              href: '#section-' + id,
              onClick: (e) => {
                if (
                  e.button === 0 &&
                  !e.ctrlKey &&
                  !e.metaKey &&
                  !e.shiftKey &&
                  !e.altKey
                ) {
                  e.preventDefault();
                  document.getElementById('section-' + id)?.focus();
                  document
                    .getElementById('section-' + id)
                    ?.scrollIntoView({ block: 'start' });
                }
              },
            },
            label,
          ),
        ),
      ),
      h(
        'div',
        { className: 'editor-save' },
        h(
          'span',
          { role: 'status', 'aria-live': 'polite' },
          sending
            ? {
                publishing: 'Đang xuất bản…',
                unpublishing: 'Đang ngừng xuất bản…',
                updating: 'Đang cập nhật…',
                saving: 'Đang lưu…',
              }[state]
            : dirty.current
              ? 'Có thay đổi chưa lưu.'
              : announcement,
        ),
        state === 'dirty' &&
          announcement &&
          h('span', { className: 'sr-only', role: 'status' }, announcement),
        h(
          Button,
          {
            className: 'button-secondary',
            onClick: () => setFullPreview(true),
          },
          'Xem trước toàn màn hình',
        ),
        editable &&
          h(
            Button,
            {
              type: 'submit',
              form: 'recipe-editor',
              disabled:
                blocked || unresolvedMedia || (published && !dirty.current),
            },
            state === 'saving'
              ? 'Đang lưu…'
              : published
                ? 'Cập nhật công thức'
                : server
                  ? 'Lưu bản nháp'
                  : 'Tạo bản nháp',
          ),
      ),
    ),
    failure &&
      h(
        'p',
        { role: 'alert' },
        recipeError(failure),
        cooldown ? ` Chờ ${cooldown} giây.` : '',
        failure.code === 'CSRF_INVALID' &&
          h(
            Button,
            {
              className: 'button-secondary',
              disabled: checkingSession,
              onClick: renewSessionProtection,
            },
            checkingSession ? 'Đang xác nhận phiên…' : 'Xác nhận lại phiên',
          ),
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
            h(
              'li',
              { key: f },
              (form.current?.elements.namedItem(f)?.labels?.[0]?.textContent ||
                { ingredients: 'Nguyên liệu', steps: 'Cách làm', tags: 'Nhãn' }[
                  f
                ] ||
                'Công thức') +
                ' — ' +
                m,
            ),
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
                'Chưa rõ bản nháp đã được tạo chưa. Kiểm tra lại lần tạo này để tránh tạo trùng.',
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
          `${review.title || 'Chưa có tên'} · ${review.status === 'draft' ? 'Bản nháp' : 'Đã xuất bản'} · Phiên bản ${review.version}`,
        ),
        h(
          'p',
          null,
          'Phần bạn đang viết vẫn ở bên dưới. Nếu dùng bản đã lưu, các thay đổi đó sẽ được thay thế.',
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
        published &&
          review.status === 'published' &&
          review.moderationStatus === 'normal' &&
          review.version === server.version &&
          h(
            Button,
            {
              onClick: () => {
                setState('dirty');
                setFailure(null);
                setReview(null);
                announce(
                  'Đã đối chiếu phiên bản. Bạn có thể kiểm tra và cập nhật lại.',
                );
              },
            },
            'Tiếp tục với phần đang soạn',
          ),
      ),
    h(
      'div',
      { className: 'editor-workbench' },
      h(
        'form',
        {
          ref: form,
          id: 'recipe-editor',
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
          h('legend', { className: 'sr-only' }, 'Biên tập công thức'),
          h(
            'section',
            { className: 'editor-section', id: 'section-info', tabIndex: -1 },
            h('h2', null, 'Thông tin công thức'),
            h(
              'p',
              null,
              published
                ? 'Người đọc sẽ thấy nội dung mới sau khi bạn cập nhật công thức.'
                : 'Bạn có thể lưu bản nháp và bổ sung thông tin sau.',
            ),
            input('title', 'Tên công thức', { maxLength: 151 }),
            input('description', 'Mô tả', {
              maxLength: 2001,
              multiline: true,
              help: 'Viết một đoạn, tối đa 2.000 ký tự.',
            }),
            h(
              'div',
              { className: 'editor-grid two-fields' },
              input('categoryId', 'Danh mục', {
                options: [
                  ['', 'Chưa chọn'],
                  ...(values.categoryId &&
                  !categories.options.some((c) => c.id === values.categoryId)
                    ? [
                        [
                          values.categoryId,
                          'Danh mục hiện tại (chưa tra được tên)',
                        ],
                      ]
                    : []),
                  ...categories.options.map((c) => [c.id, c.name]),
                ],
              }),
              input('difficulty', 'Độ khó', {
                options: [
                  ['', 'Chưa chọn'],
                  ['easy', 'Dễ'],
                  ['medium', 'Vừa'],
                  ['hard', 'Khó'],
                ],
              }),
            ),
            categories.controls,
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
              input('servings', 'Khẩu phần', {
                type: 'number',
                min: 1,
                max: 100,
              }),
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
          ),
          h(
            'section',
            {
              id: 'section-cover',
              className: 'editor-section cover-section',
              tabIndex: -1,
            },
            published
              ? publishedPhoto('Ảnh bìa', values.coverImageUrl)
              : h(MediaPicker, {
                  label: 'Ảnh bìa',
                  purpose: 'recipe_cover',
                  assetId: values.coverImageAssetId,
                  url: values.coverImageUrl,
                  disabled: blocked || !editable,
                  onBusy: mediaBusy,
                  onPreview: (url) => localImage('cover', url),
                  onUnresolved: (value) => selectMedia('cover', value),
                  onChange: (id) => change('coverImageAssetId', id),
                }),
          ),
          h(
            'section',
            {
              id: 'section-ingredients',
              className: 'editor-section',
              tabIndex: -1,
            },
            h('h2', null, 'Nguyên liệu'),
            h('p', null, 'Nhập tên nguyên liệu hoặc tìm trong danh mục.'),
            h(
              'label',
              { htmlFor: 'ingredient-search' },
              'Tìm nguyên liệu chuẩn',
            ),
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
                h(
                  'div',
                  { className: 'ingredient-main' },
                  input(`ingredients.${i}.name`, 'Tên nguyên liệu ' + (i + 1), {
                    id: `ingredients-${r.key}`,
                    maxLength: 101,
                  }),
                  h(
                    'div',
                    { className: 'editor-grid' },
                    input(
                      `ingredients.${i}.quantity`,
                      'Định lượng ' + (i + 1),
                      {
                        type: 'number',
                        min: 0,
                        max: 1e9,
                        step: 'any',
                      },
                    ),
                    input(`ingredients.${i}.unit`, 'Đơn vị ' + (i + 1), {
                      maxLength: 33,
                    }),
                  ),
                ),
                h(
                  'details',
                  {
                    className: 'row-details',
                    open: term ? true : undefined,
                  },
                  h(
                    'summary',
                    null,
                    'Nguyên liệu chuẩn, mô tả lượng và ghi chú',
                  ),
                  input(
                    `ingredients.${i}.ingredientId`,
                    'Nguyên liệu chuẩn ' + (i + 1),
                    {
                      options: [
                        ['', 'Nhập tên tự do'],
                        ...(r.ingredientId &&
                        !catalog.body?.data?.some(
                          (c) => c.id === r.ingredientId,
                        )
                          ? [[r.ingredientId, 'Nguyên liệu hiện tại']]
                          : []),
                        ...(catalog.body?.data || []).map((c) => [
                          c.id,
                          c.name,
                        ]),
                      ],
                    },
                  ),
                  input(
                    `ingredients.${i}.quantityText`,
                    'Mô tả lượng ' + (i + 1),
                    {
                      maxLength: 101,
                    },
                  ),
                  input(
                    `ingredients.${i}.note`,
                    'Ghi chú nguyên liệu ' + (i + 1),
                    {
                      maxLength: 501,
                    },
                  ),
                ),
                rowControls('ingredients', r, i),
              ),
            ),
            editable &&
              h(
                Button,
                {
                  id: 'add-ingredients',
                  className: 'button-secondary',
                  disabled: values.ingredients.length >= 40,
                  onClick: () => add('ingredients'),
                },
                'Thêm nguyên liệu',
              ),
          ),
          h(
            'section',
            { id: 'section-steps', className: 'editor-section', tabIndex: -1 },
            h('h2', null, 'Cách làm'),
            values.steps.map((r, i) =>
              h(
                'fieldset',
                { key: r.key, className: 'editor-row' },
                h('legend', null, `Bước ${i + 1}`),
                input(`steps.${i}.instruction`, 'Hướng dẫn bước ' + (i + 1), {
                  id: `steps-${r.key}`,
                  maxLength: 2001,
                  multiline: true,
                  help: 'Viết một đoạn cho mỗi bước. Tách hướng dẫn mới bằng nút Thêm bước nấu.',
                }),
                h(
                  'details',
                  {
                    className: 'row-details',
                    open:
                      r.imageAssetId || r.durationMinutes ? true : undefined,
                  },
                  h('summary', null, 'Thời gian và ảnh bước ' + (i + 1)),
                  input(
                    `steps.${i}.durationMinutes`,
                    'Thời gian bước ' + (i + 1),
                    {
                      type: 'number',
                      min: 0,
                      max: 1440,
                    },
                  ),
                  published
                    ? publishedPhoto('Ảnh bước ' + (i + 1), r.imageUrl)
                    : h(MediaPicker, {
                        label: 'Ảnh bước ' + (i + 1),
                        purpose: 'recipe_step',
                        assetId: r.imageAssetId,
                        url: r.imageUrl,
                        disabled: blocked || !editable,
                        onBusy: mediaBusy,
                        onPreview: (url) => localImage(r.key, url),
                        onUnresolved: (value) => selectMedia(r.key, value),
                        onChange: (id) =>
                          changeRow('steps', r.key, 'imageAssetId', id),
                      }),
                ),
                rowControls('steps', r, i),
              ),
            ),
            editable &&
              h(
                Button,
                {
                  id: 'add-steps',
                  className: 'button-secondary',
                  disabled: values.steps.length >= 30,
                  onClick: () => add('steps'),
                },
                'Thêm bước nấu',
              ),
          ),
        ),
      ),
      h(RecipePreview, {
        recipe: toPreviewModel(values, session?.body?.data, images),
        categoryName: categories.options.find((c) => c.id === values.categoryId)
          ?.name,
        full: fullPreview,
        close: () => setFullPreview(false),
        dirty: dirty.current,
        published: server?.status === 'published',
      }),
    ),
    !editable &&
      h(
        'p',
        null,
        'Công thức đang bị ẩn. Bạn có thể xem lại nội dung trong thư viện.',
      ),
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
        published &&
          dirty.current &&
          !blocked &&
          h(
            Button,
            {
              className: 'button-secondary',
              onClick: () => {
                if (window.confirm('Bỏ thay đổi đang soạn?'))
                  accept(server, 'Đã bỏ thay đổi cục bộ.');
              },
            },
            'Hủy thay đổi',
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
            ? 'Bản nháp sẽ rời danh sách của bạn. Các thay đổi chưa lưu sẽ bị bỏ.'
            : confirmation === 'publish'
              ? 'Máy chủ sẽ kiểm tra dữ liệu trước khi công khai.'
              : 'Công thức sẽ tạm ẩn khỏi cộng đồng, hồ sơ và các thư viện của người đọc. Bạn có thể sửa ảnh rồi xuất bản lại. Phần đang soạn được giữ trong trình chỉnh sửa.',
        ),
        h(Button, { onClick: () => perform(confirmation) }, 'Xác nhận'),
        h(Button, { onClick: () => setConfirmation(null) }, 'Hủy'),
      ),
  );
}
