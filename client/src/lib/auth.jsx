import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, getStoredUser, setSession, clearSession } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [loading, setLoading] = useState(!!getToken());

  // Validate a stored token on mount so a stale session doesn't linger.
  useEffect(() => {
    let alive = true;
    if (!getToken()) {
      setLoading(false);
      return () => {};
    }
    api('/auth/me')
      .then((res) => {
        if (!alive) return;
        setUser(res.user);
        setSession(null, res.user);
      })
      .catch(() => {
        if (!alive) return;
        clearSession();
        setUser(null);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const applyAuth = useCallback((res) => {
    setSession(res.token, res.user);
    setUser(res.user);
    return res.user;
  }, []);

  const login = useCallback(
    async (email, password) => applyAuth(await api('/auth/login', { method: 'POST', body: { email, password } })),
    [applyAuth]
  );

  const signup = useCallback(
    async (name, email, password) =>
      applyAuth(await api('/auth/signup', { method: 'POST', body: { name, email, password } })),
    [applyAuth]
  );

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  // Lets the org page refresh the current user if their own record changed.
  const refresh = useCallback(async () => {
    const res = await api('/auth/me');
    setUser(res.user);
    setSession(null, res.user);
    return res.user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refresh, applyAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function hasRole(user, roles) {
  if (!user) return false;
  return roles.includes(user.role);
}