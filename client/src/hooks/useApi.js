import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../AuthContext.jsx';

// Runs an authenticated API call and tracks its state.
//   load: (token) => Promise<data>, or null to wait (status 'idle') until inputs are ready
//   deps: values that should trigger a refetch when they change (like useEffect deps)
// status: 'idle' | 'loading' | 'ready' | 'error'
// While a refetch is loading, the previous data is kept so lists don't flash empty.
// A 401 (expired token) logs the user out.
export function useApi(load, deps) {
  const { session, signOut } = useAuth();
  const [state, setState] = useState({ status: load ? 'loading' : 'idle', data: null, error: '' });
  const [attempt, setAttempt] = useState(0);
  const enabled = Boolean(load);

  useEffect(() => {
    if (!load) {
      setState({ status: 'idle', data: null, error: '' });
      return undefined;
    }

    let cancelled = false;
    setState((prev) => ({ status: 'loading', data: prev.data, error: '' }));

    load(session.token).then(
      (data) => {
        if (!cancelled) setState({ status: 'ready', data, error: '' });
      },
      (err) => {
        if (cancelled) return;
        if (err.status === 401) {
          signOut();
          return;
        }
        setState({ status: 'error', data: null, error: err.message || 'Something went wrong.' });
      }
    );

    return () => {
      cancelled = true;
    };
    // `load` is a fresh closure every render; callers list what it depends on in `deps`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token, signOut, attempt, enabled, ...deps]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, reload };
}
