import {
  createContext,
  createElement as h,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, safeReturnPath } from '../../app/router.js';
import {
  ApiError,
  recipeHref,
  requestApi,
  useRead,
} from '../../services/api.js';
import { ErrorState, Icon } from '../../components/ui/primitives.js';
import '../../styles/community.css';

const SessionContext = createContext(null);
const PageContext = createContext(null);
const signedOut = { status: 'guest', revision: 0 };
const idPattern = /^[a-f\d]{24}$/i;
const routes = { saved: 'bookmarks', favorited: 'favorites' };

function identityKey(session) {
  return [session.status, session.body?.data?.id, session.revision].join('/');
}
// Keep the page mounted when a guest session resolves. Only personal controls
// and their in-flight requests belong to a particular identity.
export function InteractionSession({ session = signedOut, children }) {
  const identity = identityKey(session);
  const owner = useMemo(
    () => ({ locks: new Set(), listeners: new Set(), active: true }),
    [identity],
  );
  const [busy, setBusy] = useState({ owner, items: {} });
  const pending = busy.owner === owner ? busy.items : {};
  useEffect(() => {
    owner.active = true;
    return () => {
      owner.active = false;
    };
  }, [owner]);
  const subscribe = useCallback(
    (callback) => {
      owner.listeners.add(callback);
      return () => owner.listeners.delete(callback);
    },
    [owner],
  );
  async function change(recipeId, kind, active) {
    if (session.status !== 'authenticated' || owner.locks.has(recipeId))
      throw new ApiError(409, 'INTERACTION_PENDING');
    owner.locks.add(recipeId);
    setBusy((old) => ({
      owner,
      items: { ...(old.owner === owner ? old.items : {}), [recipeId]: kind },
    }));
    let confirmed = false;
    try {
      const result = await requestApi('/me/' + routes[kind] + '/' + recipeId, {
        method: active ? 'PUT' : 'DELETE',
      });
      const valid = active
        ? [200, 201].includes(result?.http?.status) &&
          result.data?.recipeId === recipeId &&
          result.data?.[kind] === true
        : result === null;
      if (!valid)
        throw new ApiError(0, 'INVALID_RESPONSE', {
          mutationOutcomeUncertain: true,
        });
      confirmed = true;
    } finally {
      owner.locks.delete(recipeId);
      if (owner.active) {
        setBusy((old) => {
          if (old.owner !== owner) return old;
          const next = { ...old.items };
          delete next[recipeId];
          return { owner, items: next };
        });
        for (const listener of owner.listeners)
          listener({ recipeId, kind, active, confirmed });
      }
    }
  }
  return h(
    SessionContext.Provider,
    { value: { session, pending, change, subscribe } },
    children,
  );
}

function Scope({ recipes, onChanged, onUnavailable, children }) {
  const { session, subscribe, pending, change } = useContext(SessionContext);
  const [round, setRound] = useState(0);
  const [summaries, setSummaries] = useState({});
  const readers = useRef(new Map());
  const ids = [
    ...new Set(
      recipes.map((r) => r?.recipeId).filter((id) => idPattern.test(id)),
    ),
  ].join(',');
  const membership = useRead(
    session.status === 'authenticated' && ids
      ? '/me/recipe-interactions?recipeIds=' + ids
      : null,
    round,
    { privateRequest: true, revision: session.revision },
  );
  const members = new Map(
    (Array.isArray(membership.body?.data) ? membership.body.data : []).map(
      (row) => [row.recipeId, row],
    ),
  );
  const callbacks = useRef({});
  useEffect(() => {
    callbacks.current = { recipes, onChanged, onUnavailable };
  }, [recipes, onChanged, onUnavailable]);
  const refresh = useCallback(async (recipe) => {
    const id = recipe.recipeId,
      path = recipeHref(recipe);
    if (!path) return;
    readers.current.get(id)?.abort();
    const controller = new AbortController();
    readers.current.set(id, controller);
    setSummaries((old) => ({ ...old, [id]: {} }));
    try {
      const result = await requestApi(path, {
        signal: controller.signal,
        contextSensitive: true,
      });
      if (
        result.data?.recipeId !== id ||
        !Number.isInteger(result.data?.interactionSummary?.favoriteCount) ||
        !Number.isInteger(result.data?.interactionSummary?.commentCount)
      )
        throw new ApiError(0, 'INVALID_RESPONSE');
      if (!controller.signal.aborted)
        setSummaries((old) => ({
          ...old,
          [id]: { summary: result.data.interactionSummary },
        }));
    } catch (error) {
      if (controller.signal.aborted) return;
      setSummaries((old) => ({ ...old, [id]: { error } }));
      if (error.status === 404) callbacks.current.onUnavailable?.();
    } finally {
      if (readers.current.get(id) === controller) readers.current.delete(id);
    }
  }, []);
  useEffect(() => {
    const controllers = readers.current;
    return () => {
      for (const controller of controllers.values()) controller.abort();
    };
  }, []);
  useEffect(
    () =>
      subscribe((event) => {
        const { recipes, onChanged } = callbacks.current;
        const recipe = recipes.find((r) => r.recipeId === event.recipeId);
        if (!recipe) return;
        setRound((n) => n + 1);
        if (event.kind === 'favorited') refresh(recipe);
        if (event.confirmed) onChanged?.(event);
      }),
    [subscribe, refresh],
  );
  const missing =
    membership.status === 'ready' &&
    ids.split(',').some((id) => id && !members.has(id));
  useEffect(() => {
    if (missing) callbacks.current.onUnavailable?.();
  }, [missing]);
  return h(
    PageContext.Provider,
    {
      value: {
        members,
        membership,
        pending,
        change,
        refresh,
        summaries,
        session,
        retry: () => setRound((n) => n + 1),
      },
    },
    children,
  );
}

export function InteractionScope({
  session = signedOut,
  recipes = [],
  ...props
}) {
  const shared = useContext(SessionContext);
  const scope = h(Scope, {
    key: identityKey(shared?.session ?? session),
    recipes,
    ...props,
  });
  return shared ? scope : h(InteractionSession, { session }, scope);
}
export function useInteractionRefresh() {
  return useContext(PageContext)?.refresh;
}

export function RecipeActions({ recipe, onComments, expanded }) {
  const page = useContext(PageContext);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  if (!page) return null;
  const {
    members,
    membership,
    pending,
    change,
    refresh,
    summaries,
    session,
    retry,
  } = page;
  const id = recipe.recipeId,
    member = members.get(id);
  const summary = Object.hasOwn(summaries, id)
    ? summaries[id].summary
    : recipe.interactionSummary;
  const guest = ['guest', 'expired'].includes(session.status);
  const returnTo = safeReturnPath(recipeHref(recipe), '/recipes');
  const loginHref = '/auth/login?' + new URLSearchParams({ returnTo });
  async function toggle(kind) {
    if (typeof member?.[kind] !== 'boolean' || pending[id]) return;
    setError(null);
    setNotice('');
    const active = !member[kind];
    try {
      await change(id, kind, active);
      setNotice(
        kind === 'saved'
          ? active
            ? 'Đã lưu vào thư viện.'
            : 'Đã bỏ lưu công thức.'
          : active
            ? 'Đã thích công thức.'
            : 'Đã bỏ thích công thức.',
      );
    } catch (err) {
      setError(err);
    }
  }
  function toggleButton(kind, icon, inactive, active, count) {
    const checked = member?.[kind],
      isPending = pending[id] === kind;
    const unknown = !guest && typeof checked !== 'boolean';
    const text = isPending
      ? kind === 'saved'
        ? 'Đang lưu…'
        : 'Đang cập nhật…'
      : unknown
        ? kind === 'saved'
          ? 'Kiểm tra đã lưu…'
          : 'Kiểm tra lượt thích…'
        : checked
          ? active
          : inactive;
    const content = [
      h(Icon, { key: 'icon', name: icon, size: 19 }),
      h('span', { key: 'text' }, text),
      Number.isInteger(count) &&
        h('span', { key: 'count', className: 'action-count' }, count),
    ];
    if (guest)
      return h(
        Link,
        {
          href: loginHref,
          className: 'recipe-action',
          'aria-label': 'Đăng nhập để ' + inactive.toLowerCase(),
        },
        ...content,
      );
    return h(
      'button',
      {
        type: 'button',
        className: 'recipe-action',
        'aria-label': text,
        'aria-pressed': typeof checked === 'boolean' ? checked : undefined,
        disabled: typeof checked !== 'boolean' || !!pending[id],
        onClick: () => toggle(kind),
      },
      ...content,
    );
  }
  const stateError = error || membership.error || summaries[id]?.error;
  return h(
    'div',
    { className: 'recipe-interactions' },
    h(
      'div',
      { className: 'recipe-actions' },
      toggleButton(
        'favorited',
        'heart',
        'Thích',
        'Đã thích',
        summary?.favoriteCount,
      ),
      onComments &&
        h(
          'button',
          {
            type: 'button',
            className: 'recipe-action',
            'aria-expanded': expanded,
            onClick: onComments,
          },
          h(Icon, { name: 'comment', size: 19 }),
          'Bình luận',
          Number.isInteger(summary?.commentCount) &&
            h('span', { className: 'action-count' }, summary.commentCount),
        ),
      toggleButton('saved', 'bookmark', 'Lưu', 'Đã lưu'),
    ),
    session.status === 'expired' &&
      h('p', { role: 'status' }, 'Phiên đăng nhập đã hết hạn.'),
    session.status === 'error' &&
      h(ErrorState, {
        title: 'Chưa xác minh được phiên đăng nhập',
        onRetry: session.refresh,
      }),
    !guest &&
      membership.status === 'loading' &&
      h(
        'span',
        { className: 'sr-only', role: 'status' },
        'Đang tải trạng thái thích và lưu.',
      ),
    !guest &&
      membership.status === 'ready' &&
      !member &&
      h('p', { role: 'status' }, 'Công thức hiện không khả dụng.'),
    stateError &&
      h(ErrorState, {
        error: stateError,
        title: 'Chưa đồng bộ được tương tác. Hãy kiểm tra lại.',
        onRetry: () => {
          setError(null);
          retry();
          refresh(recipe);
        },
      }),
    h('span', { role: 'status', className: 'sr-only' }, notice),
  );
}
