import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShoppingCart, Menu, X, Sun, Moon, Globe, Bell, ChevronDown, LayoutGrid, Sparkles,
  Home, Compass, User, Package, LayoutDashboard, Shield, LogOut, Check,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { LANGUAGES, setLanguage } from '../i18n/index.js';
import { money, initials } from '../lib/format.js';

const NAV_LINKS = [
  { to: '/', labelKey: 'nav.home', icon: Home, end: true },
  { to: '/explore', labelKey: 'nav.explore', icon: Compass },
  { to: '/categories', labelKey: 'nav.categories', icon: LayoutGrid },
  { to: '/package-builder', labelKey: 'nav.packages', icon: Sparkles },
];

function LanguageMenu() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="soft-icon !h-10 !w-10 text-muted transition hover:text-accent"
        title={t('nav.language')}
        aria-label={t('nav.language')}
      >
        <Globe size={17} />
      </button>
      {open && (
        <div className="soft-lg absolute right-0 top-12 z-50 w-44 overflow-hidden p-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                i18n.language === lang.code ? 'text-accent' : 'text-muted hover:text-ink'
              }`}
              style={i18n.language === lang.code ? { boxShadow: 'inset 2px 2px 5px var(--sd), inset -2px -2px 5px var(--sl)' } : undefined}
            >
              <span className="text-base">{lang.flag}</span>
              <span className="flex-1 text-left">{lang.label}</span>
              {i18n.language === lang.code && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { t } = useTranslation();
  const { user, logout, isSeller, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const links = [
    { to: '/profile', label: t('nav.profile'), icon: User },
    ...(isSeller ? [{ to: '/seller', label: t('nav.dashboard'), icon: LayoutDashboard }] : []),
    ...(isAdmin ? [{ to: '/admin', label: t('nav.admin'), icon: Shield }] : []),
    { to: '/bookings', label: t('nav.bookings'), icon: Package },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-2xl bg-surface p-1 pr-2 shadow-soft-sm transition hover:shadow-soft"
      >
        <span
          className="grid h-9 w-9 place-items-center rounded-xl text-xs font-extrabold text-white"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
        >
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="h-9 w-9 rounded-xl object-cover" />
          ) : (
            initials(user.name)
          )}
        </span>
        <ChevronDown size={14} className="text-muted" />
      </button>

      {open && (
        <div className="soft-lg absolute right-0 top-14 z-50 w-60 p-2">
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-bold">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="soft-divider my-1" />
          {links.map((link) => (
            <button
              key={link.to}
              onClick={() => {
                setOpen(false);
                navigate(link.to);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition hover:text-accent"
            >
              <link.icon size={16} /> {link.label}
            </button>
          ))}
          <div className="soft-divider my-1" />
          <button
            onClick={async () => {
              setOpen(false);
              await logout();
              navigate('/');
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:text-[color:var(--danger)]"
            style={{ color: 'var(--danger)' }}
          >
            <LogOut size={16} /> {t('nav.logout')}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { t } = useTranslation();
  const { user, unread, isSeller, isAdmin } = useAuth();
  const cart = useCart();
  const { theme, toggle } = useTheme();
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setDrawer(false), [location.pathname]);

  const go = (path) => navigate(path);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line/60 bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5" style={{ textDecoration: 'none' }}>
            <span
              className="grid h-10 w-10 place-items-center rounded-2xl text-white shadow-glow"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            >
              <Package size={19} strokeWidth={2.6} />
            </span>
            <span className="hidden flex-col leading-none sm:flex">
              <span className="text-[15px] font-extrabold tracking-tight">
                Event<span className="gradient-text">Box</span> UZ
              </span>
              <span className="text-[10px] font-medium text-muted">{t('app.tagline')}</span>
            </span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `rounded-2xl px-3.5 py-2 text-sm font-semibold transition ${
                    isActive ? 'text-accent' : 'text-muted hover:text-ink'
                  }`
                }
                style={({ isActive }) => (isActive ? { boxShadow: 'inset 3px 3px 7px var(--sd), inset -3px -3px 7px var(--sl)' } : undefined)}
              >
                {t(link.labelKey)}
              </NavLink>
            ))}
            {isSeller && (
              <NavLink
                to="/seller"
                className={({ isActive }) => `rounded-2xl px-3.5 py-2 text-sm font-semibold transition ${isActive ? 'text-accent' : 'text-muted hover:text-ink'}`}
                style={({ isActive }) => (isActive ? { boxShadow: 'inset 3px 3px 7px var(--sd), inset -3px -3px 7px var(--sl)' } : undefined)}
              >
                {t('nav.seller')}
              </NavLink>
            )}
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) => `rounded-2xl px-3.5 py-2 text-sm font-semibold transition ${isActive ? 'text-accent' : 'text-muted hover:text-ink'}`}
                style={({ isActive }) => (isActive ? { boxShadow: 'inset 3px 3px 7px var(--sd), inset -3px -3px 7px var(--sl)' } : undefined)}
              >
                {t('nav.admin')}
              </NavLink>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => go('/explore')}
              className="soft-icon !h-10 !w-10 text-muted transition hover:text-accent lg:hidden"
              aria-label={t('nav.search')}
            >
              <Compass size={17} />
            </button>

            <LanguageMenu />

            <button
              onClick={toggle}
              className="soft-icon !h-10 !w-10 text-muted transition hover:text-accent"
              title={theme === 'dark' ? t('nav.light') : t('nav.dark')}
              aria-label={t('nav.theme')}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {user ? (
              <>
                <Link
                  to="/profile"
                  className="soft-icon relative !h-10 !w-10 text-muted transition hover:text-accent"
                  aria-label={t('nav.notifications')}
                >
                  <Bell size={17} />
                  {unread > 0 && (
                    <span
                      className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold text-white"
                      style={{ background: 'var(--danger)' }}
                    >
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>
                <UserMenu />
              </>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link to="/login" className="soft-btn !py-2.5 !text-xs">
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="soft-btn-primary !py-2.5 !text-xs">
                  {t('nav.register')}
                </Link>
              </div>
            )}

            <Link
              to="/cart"
              className="soft-icon relative !h-10 !w-10 transition"
              style={{ color: cart.count ? 'var(--accent)' : 'var(--muted)' }}
              aria-label={t('nav.cart')}
            >
              <ShoppingCart size={17} />
              {cart.count > 0 && (
                <span
                  className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                >
                  {cart.count > 99 ? '99+' : cart.count}
                </span>
              )}
            </Link>

            <button
              onClick={() => setDrawer(true)}
              className="soft-icon !h-10 !w-10 text-muted lg:hidden"
              aria-label={t('nav.menu')}
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside className="absolute right-0 top-0 h-full w-[82%] max-w-sm animate-fade-up bg-bg p-5 shadow-soft-lg">
            <div className="flex items-center justify-between">
              <span className="text-lg font-extrabold">
                Event<span className="gradient-text">Box</span> UZ
              </span>
              <button onClick={() => setDrawer(false)} className="soft-icon !h-10 !w-10" aria-label={t('nav.close')}>
                <X size={18} />
              </button>
            </div>
            <div className="soft-divider my-5" />
            <nav className="flex flex-col gap-1">
              {[...NAV_LINKS, { to: '/bookings', labelKey: 'nav.bookings', icon: Package }].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-muted transition hover:text-accent"
                >
                  <link.icon size={17} /> {t(link.labelKey)}
                </Link>
              ))}
              {isSeller && (
                <Link to="/seller" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-muted transition hover:text-accent">
                  <LayoutDashboard size={17} /> {t('nav.dashboard')}
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-muted transition hover:text-accent">
                  <Shield size={17} /> {t('nav.admin')}
                </Link>
              )}
            </nav>
            <div className="soft-divider my-5" />
            {!user && (
              <div className="grid gap-3">
                <Link to="/login" className="soft-btn justify-center">
                  {t('nav.login')}
                </Link>
                <Link to="/register" className="soft-btn-primary justify-center">
                  {t('nav.register')}
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* mobile bottom tab bar */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-[70] border-t border-line/60 bg-bg/95 px-2 pt-2 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-around">
          {[
            { to: '/', icon: Home, label: t('nav.home') },
            { to: '/explore', icon: Compass, label: t('nav.explore') },
            { to: '/package-builder', icon: Sparkles, label: t('nav.packages') },
            { to: '/cart', icon: ShoppingCart, label: t('nav.cart'), badge: cart.count },
            { to: user ? '/profile' : '/login', icon: User, label: user ? t('nav.profile') : t('nav.login') },
          ].map((item) => {
            const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className="relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 text-[10px] font-semibold transition"
                style={{ color: active ? 'var(--accent)' : 'var(--muted)' }}
              >
                <item.icon size={19} strokeWidth={active ? 2.6 : 2} />
                {item.label}
                {item.badge > 0 && (
                  <span
                    className="absolute right-[22%] top-0 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* sticky cart button (mobile) */}
      {cart.count > 0 && (
        <button
          onClick={() => go('/cart')}
          className="fixed bottom-[74px] right-4 z-[75] flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-white shadow-glow lg:hidden"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
        >
          <ShoppingCart size={17} />
          <span>{cart.count}</span>
          <span className="opacity-90">· {money(cart.subtotal, { compact: true })}</span>
        </button>
      )}
    </>
  );
}
