import { useState, useEffect } from 'react';
import {
  decodeToken,
  getToken,
  logout as authLogout,
  saveToken,
} from '../services/auth.service';
import { getPageList } from '../services/pages.service';
import { AuthUser, PageItem } from '../types';

const BYPASS_AUTH = process.env.REACT_APP_BYPASS_AUTH === '1';

const DEV_USER: AuthUser = {
  id_azienda: 1,
  nome: 'Luca',
  cognome: 'H.',
  email: 'dev@sibylla.it',
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPages = async (id_azienda: number) => {
    try {
      const pages: PageItem[] = await getPageList(id_azienda);
      setAllowedPages(pages.map((p) => p.link).filter(Boolean));
    } catch {
      setAllowedPages([]);
    }
  };

  useEffect(() => {
    if (BYPASS_AUTH) {
      setUser(DEV_USER);
      setAllowedPages([]);
      setLoading(false);
      return;
    }

    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    const decoded = decodeToken(token);
    if (!decoded) {
      setLoading(false);
      return;
    }
    setUser(decoded as AuthUser);
    if (decoded?.id_azienda) {
      loadPages(decoded.id_azienda).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (token: string) => {
    saveToken(token);
    const decoded = decodeToken(token);
    if (decoded) {
      setUser(decoded as AuthUser);
      if (decoded.id_azienda) loadPages(decoded.id_azienda);
    }
  };

  const handleLogout = async () => {
    await authLogout();
    setUser(null);
    setAllowedPages([]);
  };

  return { user, allowedPages, loading, handleLogin, handleLogout };
}
