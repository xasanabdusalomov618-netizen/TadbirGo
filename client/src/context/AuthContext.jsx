import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { setLanguage } from '../i18n/index.js';
import { useTheme } from './ThemeContext.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [seller, setSeller] = useState(null);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const { setTheme } = useTheme();

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/auth/me');
      setUser(data.user || null);
      setSeller(data.seller || null);
      setUnread(data.unread || 0);
      if (data.user?.language) setLanguage(data.user.language);
      if (data.user?.theme) setTheme(data.user.theme);
      return data.user;
    } catch {
      setUser(null);
      setSeller(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setTheme]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    setUser(data.user);
    setSeller(data.seller || null);
    setUnread(data.unread || 0);
    if (data.user?.language) setLanguage(data.user.language);
    if (data.user?.theme) setTheme(data.user.theme);
    return data.user;
  }, [setTheme]);

  const register = useCallback(async (payload) => {
    const data = await api.post('/auth/register', payload);
    setUser(data.user);
    setSeller(data.seller || null);
    setUnread(data.unread || 0);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      setSeller(null);
      setUnread(0);
    }
  }, []);

  const patchUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
    if (patch.seller) setSeller(patch.seller);
  }, []);

  const value = useMemo(
    () => ({
      user,
      seller,
      unread,
      loading,
      isAuthed: !!user,
      isCustomer: user?.role === 'customer',
      isSeller: user?.role === 'seller' || user?.role === 'admin',
      isAdmin: user?.role === 'admin',
      setUnread,
      refresh,
      login,
      register,
      logout,
      patchUser,
    }),
    [user, seller, unread, loading, refresh, login, register, logout, patchUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
