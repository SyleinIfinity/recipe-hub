import { createElement as h, useEffect, useId, useRef, useState } from 'react';
import { Link } from '../../app/router.js';
import {
  ApiError,
  profileHref,
  recipeHref,
  requestApi,
  useRead,
} from '../../services/api.js';
import { Button, ErrorState } from '../../components/ui/primitives.js';
import { confirmResponse } from '../account/forms.js';
import '../../styles/comments.css';

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const pageSize = 8;
const objectId = /^[a-f0-9]{24}$/i;

export function AuthorAvatar({ author, className = 'comment-avatar' }) {
  const [failed, setFailed] = useState(null);
  const src = author?.avatarUrl;
  const initials = (author?.displayName || '')
    .trim()
    .split(/\s+/u)
    .slice(-2)
    .map((word) => Array.from(word)[0])
    .join('')
    .toLocaleUpperCase('vi');
  const eligible =
    objectId.test(author?.id) &&
    typeof src === 'string' &&
    src.startsWith('/api/v1/users/' + author.id + '/avatar/') &&
    objectId.test(src.split('/').at(-1)) &&
    src === '/api/v1/users/' + author.id + '/avatar/' + src.split('/').at(-1);
  return h(
    'span',
    { className, 'aria-hidden': true },
    eligible && failed !== src
      ? h('img', {
          src,
          alt: '',
          loading: 'lazy',
          onError: () => setFailed(src),
        })
      : initials,
  );
}

function pagePath(recipeId, parentId, page) {
  const params = new URLSearchParams({
    scope: parentId ? 'replies' : 'roots',
    sort: '-createdAt',
    page,
    limit: pageSize,
  });
  if (parentId) params.set('parentId', parentId);
  return '/recipes/' + recipeId + '/comments?' + params;
}
function textError(text) {
  if (!text.trim()) return 'Nhập nội dung trước khi gửi.';
  if (text.length > 1500) return 'Nội dung tối đa 1.500 ký tự.';
  if (/[<>\p{Cc}\p{Cf}]/u.test(text))
    return 'Viết nội dung trên một dòng, bỏ dấu <, > và ký tự điều khiển.';
  return '';
}

function Composer({ recipeId, parentId, comment, page, onDone, onCancel }) {
  const id = useId();
  const [text, setText] = useState(comment?.content || '');
  const [version, setVersion] = useState(comment?.version);
  const [state, setState] = useState({ status: 'idle' });
  const [errorText, setErrorText] = useState('');
  const [snapshot, setSnapshot] = useState(null);
  const input = useRef(null),
    intent = useRef(null),
    active = useRef(null);
  useEffect(() => {
    if (parentId || comment) input.current?.focus();
    return () => active.current?.abort();
  }, [parentId, comment?.commentId]);

  const editing = Boolean(comment);
  const label = editing
    ? 'Nội dung chỉnh sửa'
    : parentId
      ? 'Nội dung phản hồi'
      : 'Nội dung bình luận';
  const submitLabel = editing
    ? 'Lưu thay đổi'
    : parentId
      ? 'Gửi phản hồi'
      : 'Gửi bình luận';
  const pending = state.status === 'pending';
  const uncertain = state.error?.mutationOutcomeUncertain === true;

  async function checkVersion(signal) {
    try {
      const latest = await requestApi(
        pagePath(recipeId, comment.parentId, page),
        { signal, contextSensitive: true },
      );
      if (signal.aborted) return;
      const row = latest?.data?.find(
        (item) => item.commentId === comment.commentId,
      );
      setSnapshot(row ? { row } : { missing: true });
    } catch {
      if (!signal.aborted) setSnapshot({ error: true });
    }
  }
  async function submit(e) {
    e.preventDefault();
    if (active.current || state.status === 'conflict') return;
    const invalid = textError(text);
    setErrorText(invalid);
    if (invalid) {
      input.current?.focus();
      return;
    }
    const content = text.normalize('NFC').trim();
    const controller = new AbortController();
    active.current = controller;
    setState({ status: 'pending' });
    try {
      if (!editing && intent.current?.content !== content)
        intent.current = { key: crypto.randomUUID(), content };
      const result = await requestApi(
        editing
          ? '/comments/' + comment.commentId
          : '/recipes/' + recipeId + '/comments',
        {
          method: editing ? 'PATCH' : 'POST',
          body: editing
            ? { content, version }
            : { content, parentId: parentId || null },
          idempotencyKey: editing ? undefined : intent.current.key,
          signal: controller.signal,
        },
      );
      if (controller.signal.aborted) return;
      confirmResponse(result, editing ? 200 : 201);
      if (
        result?.data?.recipeId !== recipeId ||
        !objectId.test(result?.data?.commentId) ||
        result.data.parentId !==
          (editing ? comment.parentId : parentId || null) ||
        (editing && result.data.commentId !== comment.commentId)
      ) {
        throw new ApiError(0, 'INVALID_RESPONSE', {
          mutationOutcomeUncertain: true,
        });
      }
      intent.current = null;
      setText('');
      setState({ status: 'idle' });
      onDone();
    } catch (error) {
      if (controller.signal.aborted) return;
      if (editing && (error.status === 409 || error.mutationOutcomeUncertain)) {
        setState({ status: 'conflict', error });
        await checkVersion(controller.signal);
      } else {
        setState({ status: 'error', error });
      }
    } finally {
      active.current = null;
    }
  }
  function retryVersion() {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setSnapshot(null);
    checkVersion(controller.signal).finally(() => {
      active.current = null;
    });
  }
  return h(
    'form',
    { className: 'comment-composer', onSubmit: submit, noValidate: true },
    h('label', { htmlFor: id }, label),
    h('textarea', {
      id,
      ref: input,
      value: text,
      rows: 2,
      maxLength: 1500,
      readOnly: pending || (uncertain && !editing),
      required: true,
      'aria-invalid': Boolean(errorText),
      'aria-describedby': errorText ? id + '-error' : undefined,
      onChange: (e) => {
        setText(e.target.value);
        setErrorText('');
      },
    }),
    errorText &&
      h(
        'p',
        { id: id + '-error', role: 'alert', className: 'form-error' },
        errorText,
      ),
    state.status === 'error' &&
      (uncertain
        ? h(
            'p',
            { role: 'alert' },
            'Chưa xác nhận được lần gửi. Gửi lại cùng nội dung để kiểm tra kết quả.',
          )
        : h(ErrorState, {
            error: state.error,
            title: 'Không gửi được bình luận. Kiểm tra nội dung rồi thử lại.',
          })),
    state.status === 'conflict' &&
      h(
        'div',
        { className: 'comment-conflict', role: 'alert' },
        h(
          'p',
          null,
          uncertain
            ? 'Chưa xác nhận được lần sửa. Đối chiếu nội dung hiện tại trước khi lưu tiếp.'
            : 'Bình luận đã thay đổi. Bản bạn đang sửa vẫn được giữ.',
        ),
        snapshot?.row
          ? h(
              'div',
              null,
              h('strong', null, 'Nội dung hiện tại'),
              h('p', null, snapshot.row.content),
              h(
                Button,
                {
                  className: 'button-secondary',
                  onClick: () => {
                    setVersion(snapshot.row.version);
                    setSnapshot(null);
                    setState({ status: 'idle' });
                    input.current?.focus();
                  },
                },
                'Tiếp tục sửa từ phiên bản này',
              ),
            )
          : snapshot?.missing
            ? h('p', null, 'Bình luận hiện không xuất hiện trên trang này.')
            : snapshot?.error
              ? h(
                  Button,
                  { className: 'button-secondary', onClick: retryVersion },
                  'Đọc lại phiên bản hiện tại',
                )
              : h('p', null, 'Đang đọc phiên bản hiện tại…'),
      ),
    h(
      'div',
      { className: 'comment-form-actions' },
      onCancel &&
        h(
          Button,
          {
            className: 'button-secondary',
            disabled: pending,
            onClick: onCancel,
          },
          'Hủy',
        ),
      h(
        Button,
        { type: 'submit', disabled: pending || state.status === 'conflict' },
        pending ? 'Đang gửi…' : submitLabel,
      ),
    ),
  );
}

function CommentRow({
  row,
  recipe,
  session,
  page,
  revision,
  changed,
  openThreads,
  toggleThread,
}) {
  const [mode, setMode] = useState(null),
    [error, setError] = useState(null);
  const controller = useRef(null),
    trigger = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);
  const own =
    session?.status === 'authenticated' &&
    session.body?.data?.id === row.author.id;
  const canReply = session?.status === 'authenticated' && row.parentId === null;
  const opened = openThreads.has(row.commentId);
  const link = profileHref(row.author);
  async function remove() {
    if (
      controller.current ||
      !window.confirm(
        'Xóa bình luận này? Các phản hồi bên dưới cũng sẽ ẩn khỏi cuộc thảo luận.',
      )
    )
      return;
    const abort = new AbortController();
    controller.current = abort;
    setMode('removing');
    setError(null);
    try {
      const response = await requestApi('/comments/' + row.commentId, {
        method: 'DELETE',
        signal: abort.signal,
      });
      if (abort.signal.aborted) return;
      confirmResponse(response, 204);
      changed('Đã xóa bình luận.');
    } catch (err) {
      if (!abort.signal.aborted) {
        setError(err);
        setMode(null);
      }
    } finally {
      controller.current = null;
    }
  }
  function start(next, e) {
    trigger.current = e.currentTarget;
    setMode(next);
    setError(null);
  }
  function cancel() {
    setMode(null);
    requestAnimationFrame(() => trigger.current?.focus());
  }
  return h(
    'li',
    { className: 'comment-row' },
    h(AuthorAvatar, { author: row.author }),
    h(
      'div',
      { className: 'comment-copy' },
      h(
        'div',
        { className: 'comment-byline' },
        link
          ? h(Link, { href: link }, row.author.displayName)
          : h('strong', null, row.author.displayName),
        Number.isFinite(Date.parse(row.createdAt)) &&
          h(
            'time',
            { dateTime: row.createdAt },
            dateFormat.format(new Date(row.createdAt)),
          ),
      ),
      h('p', { className: 'comment-text' }, row.content),
      h(
        'div',
        { className: 'comment-links' },
        canReply &&
          h(
            'button',
            {
              type: 'button',
              disabled: mode !== null,
              onClick: (e) => start('reply', e),
            },
            'Trả lời',
          ),
        own &&
          h(
            'button',
            {
              type: 'button',
              disabled: mode !== null,
              onClick: (e) => start('edit', e),
            },
            'Sửa',
          ),
        own &&
          h(
            'button',
            { type: 'button', disabled: mode !== null, onClick: remove },
            mode === 'removing' ? 'Đang xóa…' : 'Xóa',
          ),
        row.replyCount > 0 &&
          h(
            'button',
            {
              type: 'button',
              'aria-expanded': opened,
              onClick: () => toggleThread(row.commentId, !opened),
            },
            opened ? 'Thu gọn phản hồi' : `Xem ${row.replyCount} phản hồi`,
          ),
      ),
      error &&
        h(ErrorState, {
          error,
          title: 'Chưa xóa được bình luận. Hãy thử lại.',
        }),
      (mode === 'edit' || mode === 'reply') &&
        h(Composer, {
          recipeId: recipe.recipeId,
          comment: mode === 'edit' ? row : null,
          parentId: mode === 'reply' ? row.commentId : row.parentId,
          page,
          onCancel: cancel,
          onDone: () => {
            if (mode === 'reply') toggleThread(row.commentId, true);
            setMode(null);
            changed(
              mode === 'reply' ? 'Đã gửi phản hồi.' : 'Đã lưu bình luận.',
            );
          },
        }),
      opened &&
        row.parentId === null &&
        h(CommentPages, {
          parentId: row.commentId,
          recipe,
          session,
          revision,
          changed,
          openThreads,
          toggleThread,
        }),
    ),
  );
}

function CommentPages({
  parentId,
  recipe,
  session,
  revision,
  changed,
  openThreads,
  toggleThread,
  page = 1,
}) {
  const [more, setMore] = useState(false),
    [retry, setRetry] = useState(0);
  const result = useRead(
    pagePath(recipe.recipeId, parentId, page),
    revision + '-' + retry,
  );
  if (result.status === 'loading')
    return h(
      'p',
      { role: 'status', className: 'comment-status' },
      parentId ? 'Đang tải phản hồi…' : 'Đang tải bình luận…',
    );
  if (
    result.status === 'error' ||
    !Array.isArray(result.body?.data) ||
    !Number.isSafeInteger(result.body?.meta?.total)
  )
    return h(ErrorState, {
      error: result.error,
      onRetry: () => setRetry((v) => v + 1),
      title: parentId
        ? 'Không tải được phản hồi.'
        : 'Không tải được bình luận.',
    });
  const { data, meta } = result.body;
  if (data.length === 0)
    return page === 1 && !parentId
      ? h('p', { className: 'comment-status' }, 'Chưa có bình luận nào.')
      : null;
  const props = {
    recipe,
    session,
    page,
    revision,
    changed,
    openThreads,
    toggleThread,
  };
  return h(
    'div',
    { className: parentId ? 'comment-replies' : 'comment-roots' },
    h(
      'ul',
      { className: 'comment-list' },
      data.map((row) => h(CommentRow, { ...props, key: row.commentId, row })),
    ),
    page * pageSize < meta.total &&
      (more
        ? h(CommentPages, { ...props, parentId, page: page + 1 })
        : h(
            Button,
            { className: 'button-secondary', onClick: () => setMore(true) },
            parentId ? 'Tải thêm phản hồi' : 'Tải thêm bình luận',
          )),
  );
}

function Discussion({ recipe, session, onChanged }) {
  const [revision, setRevision] = useState(0),
    [notice, setNotice] = useState('');
  const [openThreads, setOpenThreads] = useState(() => new Set());
  const heading = useId();
  const guest = session?.status === 'guest' || session?.status === 'expired';
  function toggleThread(id, open) {
    setOpenThreads((previous) => {
      const next = new Set(previous);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }
  function changed(message) {
    setNotice(message);
    setRevision((v) => v + 1);
    onChanged?.(recipe);
  }
  return h(
    'section',
    { className: 'comment-section', 'aria-labelledby': heading },
    h('h2', { id: heading }, 'Bình luận'),
    session?.status === 'authenticated' &&
      h(Composer, {
        recipeId: recipe.recipeId,
        onDone: () => changed('Đã gửi bình luận.'),
      }),
    guest &&
      h(
        'p',
        { className: 'comment-signin' },
        h(
          Link,
          {
            href:
              '/auth/login?' +
              new URLSearchParams({
                returnTo: recipeHref(recipe) || '/recipes',
              }),
          },
          'Đăng nhập',
        ),
        ' để tham gia bình luận.',
      ),
    h('p', { role: 'status', className: 'comment-notice' }, notice),
    h(CommentPages, {
      parentId: null,
      recipe,
      session,
      revision,
      changed,
      openThreads,
      toggleThread,
    }),
  );
}

export function CommentSection({ recipe, session, onChanged }) {
  if (!objectId.test(recipe?.recipeId)) return null;
  return h(Discussion, {
    key: [recipe.recipeId, session?.revision, session?.body?.data?.id].join(
      '/',
    ),
    recipe,
    session,
    onChanged,
  });
}
