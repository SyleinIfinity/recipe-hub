import { useCallback, useEffect, useRef, useState } from 'react';
import {
  invalidateSecurity,
  onSessionInvalid,
  readApi,
} from '../services/api.js';

// One owner in App; consumers receive the same confirmed snapshot.
export function useSession() {
  const [state, setState] = useState({ status: 'unknown', revision: 0 });
  const generation = useRef(0);
  const controller = useRef(null);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    controller.current?.abort();
    controller.current = new AbortController();
    invalidateSecurity();
    setState((s) => ({
      status: 'unknown',
      revision: s.revision + (s.status === 'unknown' ? 0 : 1),
    }));
    try {
      const body = await readApi('/auth/me', {
        signal: controller.current.signal,
        contextSensitive: true,
      });
      if (typeof body?.data?.displayName !== 'string')
        throw new Error('Invalid identity');
      if (generation.current === current)
        setState((s) => ({
          status: 'authenticated',
          body,
          revision: s.revision,
        }));
    } catch (error) {
      if (generation.current === current)
        setState((s) => ({
          status: error.status === 401 ? 'guest' : 'error',
          error,
          revision: s.revision,
        }));
    }
  }, []);
  useEffect(() => {
    const unsubscribe = onSessionInvalid(() => {
      ++generation.current;
      controller.current?.abort();
      setState((s) => ({
        status:
          s.status === 'authenticated' || s.status === 'expired'
            ? 'expired'
            : 'guest',
        revision:
          s.revision +
          (s.status === 'authenticated' || s.status === 'expired' ? 1 : 0),
      }));
    });
    refresh();
    return () => {
      unsubscribe();
      ++generation.current;
      controller.current?.abort();
    };
  }, [refresh]);
  // Adapter preserves existing Home/Shell presentation while session semantics stay explicit.
  const auth =
    state.status === 'authenticated'
      ? { status: 'ready', body: state.body }
      : ['guest', 'expired'].includes(state.status)
        ? { status: 'error', error: { status: 401 } }
        : {
            status: state.status === 'unknown' ? 'loading' : 'error',
            error: state.error,
          };
  return { ...state, auth, refresh };
}
