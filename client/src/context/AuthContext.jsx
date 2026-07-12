import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../lib/api.js";

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("af_user") || "null");
  } catch {
    return null;
  }
}

// Returns decoded token payload if the token is present and unexpired.
function decodeValid(token) {
  if (!token) return null;
  try {
    const payload = jwtDecode(token);
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem("af_token");
    return decodeValid(t) ? t : null;
  });
  const [user, setUser] = useState(() => (decodeValid(localStorage.getItem("af_token")) ? readStoredUser() : null));
  const [loading, setLoading] = useState(Boolean(token));

  // Persist token + revalidate against the server on load / token change.
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    api
      .get("/auth/me")
      .then(({ data }) => {
        if (!active) return;
        setUser(data.user);
        localStorage.setItem("af_user", JSON.stringify(data.user));
      })
      .catch(() => {
        if (!active) return;
        logout();
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const persist = (tk, usr) => {
    localStorage.setItem("af_token", tk);
    localStorage.setItem("af_user", JSON.stringify(usr));
    setToken(tk);
    setUser(usr);
  };

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    persist(data.token, data.user);
    return data.user;
  };

  const signup = async (name, email, password) => {
    const { data } = await api.post("/auth/signup", { name, email, password });
    persist(data.token, data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("af_token");
    localStorage.removeItem("af_user");
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      role: user?.role || decodeValid(token)?.role || null,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      signup,
      logout,
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
