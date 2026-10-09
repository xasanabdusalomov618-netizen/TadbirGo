import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from './api';
import uz from './i18n/uz';
import ru from './i18n/ru';
import en from './i18n/en';

const DICTS = { uz, ru, en };

// ------------------------------------------------------------------
// i18n + theme + toast context
// ------------------------------------------------------------------
const AppCtx = createContext(null);

export function AppProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('tg_lang') || 'uz');
  const [theme, setThemeState] = useState(
    () => localStorage.getItem('tg_theme') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  );
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('tg_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem('tg_lang', lang);
  }, [lang]);

  const t = useCallback(
    (key, vars) => {
      let s = (DICTS[lang] && DICTS[lang][key]) ?? DICTS.uz[key] ?? key;
      if (vars) Object.entries(vars).forEach(([k, v]) => (s = s.replace(`{${k}}`, v)));
      return s;
    },
    [lang],
  );

  const fmtMoney = useCallback((n) => {
    const s = Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return lang === 'ru' ? `${s} сум` : lang === 'en' ? `${s} UZS` : `${s} so'm`;
  }, [lang]);

  const fmtDate = useCallback((d) => {
    if (!d) return '';
    const dt = new Date(d.length <= 10 ? d + 'T00:00:00' : d);
    const locale = lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-GB';
    return dt.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  }, [lang]);

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3500);
  }, []);

  const value = useMemo(
    () => ({
      lang, setLang: setLangState,
      theme, toggleTheme: () => setThemeState((x) => (x === 'dark' ? 'light' : 'dark')),
      t, fmtMoney, fmtDate, toast, toasts,
    }),
    [lang, theme, t, fmtMoney, fmtDate, toast, toasts],
  );
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export const useApp = () => useContext(AppCtx);

// ------------------------------------------------------------------
// Auth context
// ------------------------------------------------------------------
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      if (!getToken()) { setReady(true); return; }
      try {
        const me = await api.get('/api/auth/me');
        setUser(me);
      } catch {
        setToken('');
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const d = await api.post('/api/auth/login', { email, password });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  };

  const register = async (payload) => {
    const d = await api.post('/api/auth/register', payload);
    setToken(d.token);
    setUser(d.user);
    return d.user;
  };

  const logout = () => {
    setToken('');
    setUser(null);
  };

  const refresh = async () => {
    try { setUser(await api.get('/api/auth/me')); } catch { /* noop */ }
  };

  return (
    <AuthCtx.Provider value={{ user, setUser, ready, login, register, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

// ------------------------------------------------------------------
// Cart context (localStorage)
// ------------------------------------------------------------------
const CartCtx = createContext(null);
const CART_KEY = 'tadbirgo_cart';

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
  });
  const [delivery, setDelivery] = useState(() => localStorage.getItem('tg_delivery') || 'standard');
  const [installation, setInstallation] = useState(() => localStorage.getItem('tg_install') === '1');
  const [pickup, setPickup] = useState(() => localStorage.getItem('tg_pickup') === '1');
  const [options, setOptions] = useState([]);

  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem('tg_delivery', delivery); }, [delivery]);
  useEffect(() => { localStorage.setItem('tg_install', installation ? '1' : '0'); }, [installation]);
  useEffect(() => { localStorage.setItem('tg_pickup', pickup ? '1' : '0'); }, [pickup]);

  useEffect(() => {
    api.get('/api/delivery-options').then((d) => setOptions(d.items)).catch(() => {});
  }, []);

  const add = (product, quantity = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.product_id === product.id);
      if (found) {
        return prev.map((i) => i.product_id === product.id
          ? { ...i, quantity: Math.min(i.quantity + quantity, product.quantity || 999) } : i);
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        name_ru: product.name_ru,
        name_en: product.name_en,
        price: product.price,
        price_type: product.price_type,
        image: product.image,
        category_icon: product.category?.icon,
        seller_id: product.seller?.id,
        seller_name: product.seller?.company_name,
        quantity: Math.min(quantity, product.quantity || 999),
        max: product.quantity || 999,
      }];
    });
  };

  const addMany = (entries) => {
    setItems((prev) => {
      const next = [...prev];
      for (const { product, quantity } of entries) {
        const found = next.find((i) => i.product_id === product.id);
        if (found) found.quantity = Math.min(found.quantity + quantity, product.quantity || 999);
        else next.push({
          product_id: product.id, name: product.name, name_ru: product.name_ru, name_en: product.name_en,
          price: product.price, price_type: product.price_type, image: product.image,
          category_icon: product.category?.icon, seller_id: product.seller?.id,
          seller_name: product.seller?.company_name,
          quantity: Math.min(quantity, product.quantity || 999), max: product.quantity || 999,
        });
      }
      return next;
    });
  };

  const remove = (id) => setItems((prev) => prev.filter((i) => i.product_id !== id));
  const setQty = (id, qty) => setItems((prev) => prev.map((i) =>
    (i.product_id === id ? { ...i, quantity: Math.max(1, Math.min(qty, i.max || 999)) } : i)));
  const clear = () => setItems([]);

  const fees = useMemo(() => {
    const opt = (slug) => options.find((o) => o.slug === slug)?.price || 0;
    return {
      delivery: delivery === 'none' ? 0 : opt(delivery),
      installation: installation ? opt('installation') : 0,
      pickup: pickup ? opt('pickup') : 0,
    };
  }, [options, delivery, installation, pickup]);

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.price * i.quantity, 0), [items]);
  const total = subtotal + fees.delivery + fees.installation + fees.pickup;
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartCtx.Provider value={{
      items, add, addMany, remove, setQty, clear, count, subtotal, total, fees,
      delivery, setDelivery, installation, setInstallation, pickup, setPickup, options,
    }}>
      {children}
    </CartCtx.Provider>
  );
}

export const useCart = () => useContext(CartCtx);
