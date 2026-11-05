import { useCallback, useEffect, useState } from 'react';
import * as api from '../api.js';
import { useAuth } from '../AuthContext.jsx';

// Loads the logged-in user's profile from GET /api/users/:id.
// An expired or invalid token (401) logs the user out, matching the API's 1h token expiry.
export function useCurrentUser() {
  const { session, signOut } = useAuth();
  const [state, setState] = useState({ status: 'loading', user: null, error: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', user: null, error: '' });

    (async () => {
      try {
        const user = await api.getUser(session.id, session.token);
        if (!cancelled) setState({ status: 'ready', user, error: '' });
      } catch (err) {
        if (cancelled) return;
        if (err.status === 401) {
          signOut();
          return;
        }
        setState({ status: 'error', user: null, error: err.message || 'Could not load your profile.' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session.id, session.token, attempt, signOut]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  // lets a page swap in a fresh user document (e.g. the PATCH response) without refetching
  const setUser = useCallback((user) => setState({ status: 'ready', user, error: '' }), []);
  return { ...state, reload, setUser };
}
