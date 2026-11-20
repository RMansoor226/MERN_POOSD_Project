import { useEffect, useState } from 'react';
import * as api from '../api.js';
import { useAuth } from '../AuthContext.jsx';

// Loads the full program catalog from GET /api/programs (all pages).
// status: 'loading' | 'ready' | 'unavailable'
// "unavailable" covers any failure (server down, error response),
// so the UI can degrade gracefully.
export function usePrograms() {
  const { session, signOut } = useAuth();
  const [state, setState] = useState({ status: 'loading', programs: [] });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await api.getPrograms(session.token);
        if (!cancelled) setState({ status: 'ready', programs: Array.isArray(data) ? data : [] });
      } catch (err) {
        if (cancelled) return;
        if (err.status === 401) {
          signOut();
          return;
        }
        setState({ status: 'unavailable', programs: [] });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session.token, signOut]);

  return state;
}
