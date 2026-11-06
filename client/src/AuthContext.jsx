import { createContext, useCallback, useContext, useState } from 'react';
import * as api from './api.js';

const STORAGE_KEY = 'auth';
const AuthContext = createContext(null);

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  // session = { id, firstName, lastName, role, token } or null
  const [session, setSession] = useState(loadSession);

  const signIn = useCallback(async (login, password) => {
    const { id, firstName, lastName, role, token } = await api.login(login, password);
    const next = { id, firstName, lastName, role, token };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
  }, []);

  // stable identity so hooks can list it as an effect dependency
  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  // merge fresh profile fields (e.g. a new first name) into the saved session
  const updateSession = useCallback((changes) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...changes };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ session, signIn, signOut, updateSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
