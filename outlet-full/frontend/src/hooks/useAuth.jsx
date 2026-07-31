import { useState, useEffect, createContext, useContext } from "react";
import { authApi, authStorage } from "../services/authApi";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null);
  const [permessi, setPermessi] = useState({});
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const token = authStorage.getToken();
    if (!token) { setLoading(false); return; }
    authApi.me()
      .then(d => { setUser(d.user); setPermessi(d.permessi); })
      .catch(() => { authStorage.clear(); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const d = await authApi.login(username, password);
    authStorage.setToken(d.token);
    setUser(d.user);
    setPermessi(d.permessi);
    return d;
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    authStorage.clear();
    setUser(null);
    setPermessi({});
  };

  // Controlla accesso a una pagina
  // returns: 'completa' | 'lettura' | 'nascosta'
  const canAccess = (pagina) => {
    if (!user) return "nascosta";
    if (user.is_admin) return "completa";
    return permessi[pagina] || "nascosta";
  };

  const isAdmin = user?.is_admin || false;

  return (
    <AuthCtx.Provider value={{ user, permessi, loading, login, logout, canAccess, isAdmin }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
