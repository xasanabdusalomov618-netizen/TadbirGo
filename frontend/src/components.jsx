import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { api } from './api';
import { useApp, useAuth, useCart } from './store';
import { CATEGORY_GRADIENTS, locCat, locName, PRICE_TYPE_KEYS } from './utils';

// ---------------------------------------------------------------
export function Spinner({ big }) {
  return (
    <div className={`spinner-wrap${big ? ' spinner-big' : ''}`}>
      <div className="spinner" />
    </div>
  );
}

export function EmptyState({ icon = '📦', title, text, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Stars({ value = 0, count, size = '' }) {
  const pct = Math.max(0, Math.min(5, value)) * 20;
  return (
    <span className={`stars ${size}`}>
      <span className="stars__bg">★★★★★</span>
      <span className="stars__fg" style={{ width: `${pct}%` }}>★★★★★</span>
      {count !== undefined && <span className="stars__count">({count})</span>}
    </span>
  );
}

export function StatusBadge({ status }) {
  const { t } = useApp();
  return <span className={`badge-status badge-status--${status}`}>{t(`status.${status}`)}</span>;
}

export function Price({ value, type, className = '' }) {
  const { fmtMoney, t } = useApp();
  return (
    <span className={`price ${className}`}>
      <strong>{fmtMoney(value)}</strong>
      {type && PRICE_TYPE_KEYS[type] && <em> / {t(PRICE_TYPE_KEYS[type])}</em>}
    </span>
  );
}

export function ProductImage({ product, className = '' }) {
  const slug = product.category?.slug;
  if (product.image) return <img src={product.image} alt={product.name} loading="lazy" className={className} />;
  return (
    <div className={`img-fallback ${className}`} style={{ background: CATEGORY_GRADIENTS[slug] || 'linear-gradient(135deg,#667eea,#764ba2)' }}>
      <span>{product.category?.icon || '🎉'}</span>
    </div>
  );
}

export function ProductCard({ p }) {
  const { t, lang, toast } = useApp();
  const cart = useCart();
  return (
    <Link to={`/mahsulot/${p.id}`} className="product-card">
      <div className="product-card__media">
        <ProductImage product={p} />
        {p.featured && <span className="chip chip--featured">{t('common.featured')} ⭐</span>}
        {!p.available && <span className="chip chip--off">{t('common.unavailable')}</span>}
      </div>
      <div className="product-card__body">
        <div className="product-card__cat">{p.category?.icon} {locCat(p.category, lang)}</div>
        <h3 className="product-card__name">{locName(p, lang)}</h3>
        <div className="product-card__meta">
          <Stars value={p.rating} count={p.rating_count} />
        </div>
        <div className="product-card__loc">📍 {p.location}</div>
        <div className="product-card__footer">
          <Price value={p.price} type={p.price_type} />
          <button
            className="btn btn--sm btn--primary"
            onClick={(e) => {
              e.preventDefault();
              cart.add(p);
              toast(t('product.addedToCart'));
            }}
          >
            🛒 <span className="hide-sm">{t('catalog.addToCart')}</span>
          </button>
        </div>
      </div>
    </Link>
  );
}

export function BarChart({ data, height = 180, money = true }) {
  const { fmtMoney, lang } = useApp();
  if (!data?.length) return <div className="chart-empty">—</div>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="barchart" style={{ height }}>
      {data.map((d) => (
        <div className="barchart__col" key={d.label}>
          <div className="barchart__value">{money ? fmtMoney(d.value) : d.value}</div>
          <div className="barchart__bar" style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }} title={fmtMoney(d.value)} />
          <div className="barchart__label">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

export function QtyInput({ value, onChange, max = 999, min = 1 }) {
  return (
    <div className="qty-input">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
      />
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  );
}

// ---------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------
export function Navbar() {
  const { t, lang, setLang, theme, toggleTheme } = useApp();
  const { user, logout } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState({ items: [], unread: 0 });
  const [q, setQ] = useState('');
  const userRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => { setMenuOpen(false); setUserOpen(false); setNotifOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!user) { setNotifs({ items: [], unread: 0 }); return; }
    let stop = false;
    const load = () => api.get('/api/notifications').then((d) => { if (!stop) setNotifs(d); }).catch(() => {});
    load();
    const iv = setInterval(load, 30000);
    return () => { stop = true; clearInterval(iv); };
  }, [user, location.pathname]);

  useEffect(() => {
    const onDoc = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    navigate(`/katalog?q=${encodeURIComponent(q)}`);
  };

  const navLinks = [
    { to: '/katalog', label: t('nav.catalog') },
    { to: '/kategoriyalar', label: t('nav.categories') },
    { to: '/paket', label: t('nav.builder') },
  ];

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="navbar__logo">
          <span className="navbar__logo-mark">🎉</span>
          <span className="navbar__logo-text">Tadbir<em>Go</em></span>
        </Link>

        <nav className="navbar__links">
          {navLinks.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `navbar__link${isActive ? ' active' : ''}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <form className="navbar__search" onSubmit={submitSearch}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('common.search')} />
          <button type="submit" aria-label="search">🔍</button>
        </form>

        <div className="navbar__actions">
          <button className="icon-btn" onClick={toggleTheme} title="Theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <div className="lang-switch">
            {['uz', 'ru', 'en'].map((l) => (
              <button key={l} className={lang === l ? 'active' : ''} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {user && (
            <div className="dropdown" ref={notifRef}>
              <button className="icon-btn icon-btn--bell" onClick={() => setNotifOpen((v) => !v)}>
                🔔{notifs.unread > 0 && <span className="dot">{notifs.unread}</span>}
              </button>
              {notifOpen && (
                <div className="dropdown__menu dropdown__menu--notif">
                  <div className="dropdown__head">
                    <strong>{t('notif.title')}</strong>
                    {notifs.unread > 0 && (
                      <button className="link-btn" onClick={() => api.post('/api/notifications/read').then(() => setNotifs((n) => ({ ...n, unread: 0, items: n.items.map((i) => ({ ...i, is_read: 1 })) })))}>
                        {t('nav.markRead')}
                      </button>
                    )}
                  </div>
                  {notifs.items.length === 0 && <div className="dropdown__empty">{t('notif.empty')}</div>}
                  {notifs.items.slice(0, 8).map((n) => (
                    <Link key={n.id} to={n.link || '/profil'} className={`notif-item${n.is_read ? '' : ' unread'}`}>
                      <span>{n.text}</span>
                      <small>{new Date(n.created_at.replace(' ', 'T') + 'Z').toLocaleDateString()}</small>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          <Link to="/savat" className="icon-btn icon-btn--cart">
            🛒{cart.count > 0 && <span className="dot">{cart.count}</span>}
          </Link>

          {user ? (
            <div className="dropdown" ref={userRef}>
              <button className="navbar__user" onClick={() => setUserOpen((v) => !v)}>
                <span className="avatar">{user.name?.[0]?.toUpperCase()}</span>
                <span className="hide-sm">{user.name?.split(' ')[0]}</span> ▾
              </button>
              {userOpen && (
                <div className="dropdown__menu">
                  <Link to="/profil">👤 {t('nav.profile')}</Link>
                  <Link to="/buyurtmalarim">📦 {t('nav.bookings')}</Link>
                  {(user.role === 'seller') && <Link to="/sotuvchi">🏪 {t('nav.seller')}</Link>}
                  {user.role === 'admin' && <Link to="/admin">⚙️ {t('nav.admin')}</Link>}
                  <button onClick={() => { logout(); navigate('/'); }}>🚪 {t('nav.logout')}</button>
                </div>
              )}
            </div>
          ) : (
            <div className="navbar__auth">
              <Link to="/kirish" className="btn btn--ghost btn--sm hide-sm">{t('nav.login')}</Link>
              <Link to="/royxatdan-otish" className="btn btn--primary btn--sm">{t('nav.register')}</Link>
            </div>
          )}

          <button className="icon-btn navbar__burger" onClick={() => setMenuOpen((v) => !v)}>☰</button>
        </div>
      </div>

      {menuOpen && (
        <div className="navbar__mobile">
          <form onSubmit={submitSearch} className="navbar__search">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('common.search')} />
            <button type="submit">🔍</button>
          </form>
          {navLinks.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
          {user && <Link to="/buyurtmalarim">{t('nav.bookings')}</Link>}
          {user?.role === 'seller' && <Link to="/sotuvchi">{t('nav.seller')}</Link>}
          {user?.role === 'admin' && <Link to="/admin">{t('nav.admin')}</Link>}
          {!user && <Link to="/kirish">{t('nav.login')}</Link>}
        </div>
      )}
    </header>
  );
}

// ---------------------------------------------------------------
// Sticky mobile cart bar
// ---------------------------------------------------------------
export function MobileCartBar() {
  const cart = useCart();
  const { t, fmtMoney } = useApp();
  const location = useLocation();
  if (cart.count === 0 || ['/savat', '/checkout'].includes(location.pathname)) return null;
  return (
    <Link to="/savat" className="mobile-cart-bar">
      <span>🛒 {cart.count} {t('common.items')}</span>
      <strong>{fmtMoney(cart.total)} →</strong>
    </Link>
  );
}

// ---------------------------------------------------------------
// Footer
// ---------------------------------------------------------------
export function Footer() {
  const { t, lang } = useApp();
  const [cats, setCats] = useState([]);
  useEffect(() => { api.get('/api/categories').then((d) => setCats(d.items)).catch(() => {}); }, []);
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <div className="navbar__logo">
            <span className="navbar__logo-mark">🎉</span>
            <span className="navbar__logo-text">Tadbir<em>Go</em></span>
          </div>
          <p className="footer__about">{t('footer.about')}</p>
        </div>
        <div>
          <h4>{t('footer.menu')}</h4>
          <Link to="/katalog">{t('nav.catalog')}</Link>
          <Link to="/kategoriyalar">{t('nav.categories')}</Link>
          <Link to="/paket">{t('nav.builder')}</Link>
          <Link to="/buyurtmalarim">{t('nav.bookings')}</Link>
        </div>
        <div>
          <h4>{t('footer.categories')}</h4>
          {cats.slice(0, 6).map((c) => (
            <Link key={c.id} to={`/katalog?category=${c.slug}`}>{locCat(c, lang)}</Link>
          ))}
        </div>
        <div>
          <h4>{t('footer.contact')}</h4>
          <a href="tel:+998712000000">📞 +998 71 200 00 00</a>
          <a href="mailto:info@tadbirgo.uz">✉️ info@tadbirgo.uz</a>
          <span>📍 Toshkent, O'zbekiston</span>
        </div>
      </div>
      <div className="container footer__bottom">
        © 2026 TadbirGo. {t('footer.rights')}
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------
export function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="toasts">
      {toasts.map((x) => (
        <div key={x.id} className={`toast toast--${x.type}`}>{x.message}</div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------
// Count-up number (statistics counter)
export function CountUp({ value = 0, suffix = '+', duration = 1200 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const k = Math.min(1, (now - start) / duration);
      setN(Math.round(from + (value - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{n.toLocaleString('en-US').replace(/,/g, ' ')}{suffix}</>;
}

// ---------------------------------------------------------------
// Month calendar with blocked dates (booking slot checker)
export function Calendar({ blocked = [], value = '', onChange, minDate, rangeEnd = '', lang = 'uz', t }) {
  const today = new Date();
  const initial = value ? new Date(value + 'T00:00:00') : today;
  const [view, setView] = useState({ y: initial.getFullYear(), m: initial.getMonth() });
  const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const todayIso = iso(today.getFullYear(), today.getMonth(), today.getDate());
  const minIso = minDate || todayIso;
  const locale = lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-GB' : 'uz-UZ';
  const monthName = new Date(view.y, view.m, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'short' }));
  const first = new Date(view.y, view.m, 1);
  const offset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const blockedSet = new Set(blocked);

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const shift = (delta) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  const inRange = (day) => rangeEnd && value && day > value && day <= rangeEnd;

  return (
    <div className="calendar">
      <div className="calendar__head">
        <button type="button" className="calendar__nav" onClick={() => shift(-1)} aria-label="prev">‹</button>
        <strong>{monthName}</strong>
        <button type="button" className="calendar__nav" onClick={() => shift(1)} aria-label="next">›</button>
      </div>
      <div className="calendar__grid">
        {weekdays.map((w, i) => <div key={i} className="calendar__wd">{w}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const key = iso(view.y, view.m, d);
          const isBlocked = blockedSet.has(key);
          const isPast = key < minIso;
          const isSel = key === value;
          const cls = ['calendar__day',
            isBlocked && 'is-blocked',
            isPast && 'is-past',
            isSel && 'is-selected',
            key === todayIso && 'is-today',
            inRange(key) && 'is-range',
          ].filter(Boolean).join(' ');
          return (
            <button key={key} type="button" className={cls}
              disabled={isPast || isBlocked}
              title={isBlocked ? (t ? t('product.busyOnDate') : 'Band') : key}
              onClick={() => onChange && onChange(key)}>
              {d}
            </button>
          );
        })}
      </div>
      <div className="calendar__legend">
        <span><i className="dot dot--free" />{t ? t('calendar.free') : 'Free'}</span>
        <span><i className="dot dot--busy" />{t ? t('calendar.busy') : 'Busy'}</span>
        <span><i className="dot dot--sel" />{t ? t('calendar.selected') : 'Selected'}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Map preview of the event location (OpenStreetMap embed, no API key)
export function MapPreview({ city, address = '', t }) {
  if (!city) {
    return <div className="map-preview map-preview--empty">📍 {t ? t('checkout.map.noCity') : 'Select a city'}</div>;
  }
  const d = 0.06;
  const bbox = `${city.lon - d},${city.lat - d},${city.lon + d},${city.lat + d}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${city.lat},${city.lon}`;
  return (
    <div className="map-preview">
      <iframe title={city.name} src={src} loading="lazy" referrerPolicy="no-referrer" />
      <div className="map-preview__meta">
        <span>📍 <strong>{city.name}</strong>{address ? ` — ${address}` : ''}</span>
        <a href={`https://www.openstreetmap.org/?mlat=${city.lat}&mlon=${city.lon}#map=13/${city.lat}/${city.lon}`}
          target="_blank" rel="noreferrer">{t ? t('checkout.map.open') : 'Open map'} ↗</a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Horizontal bar list (revenue breakdown)
export function HBars({ items = [], money = true, labelKey = 'label' }) {
  const { fmtMoney } = useApp();
  if (!items.length) return <div className="chart-empty">—</div>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="hbars">
      {items.map((it) => (
        <div key={it[labelKey]} className="hbars__row">
          <div className="hbars__label"><span>{it.icon} {it[labelKey]}</span><strong>{money ? fmtMoney(it.value) : it.value}</strong></div>
          <div className="hbars__track"><div className="hbars__fill" style={{ width: `${Math.max(2, (it.value / max) * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------
// Image upload field with preview (review photos, seller documents)
export function PhotoField({ value, onChange, t, label }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useApp();
  const pick = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast(t('upload.tooBig'), 'error'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.upload('/api/uploads', fd);
      onChange(res.url);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <label className="photo-field">
      {value ? (
        <span className="photo-field__preview"><img src={value} alt="" />
          <button type="button" className="photo-field__remove" onClick={(e) => { e.preventDefault(); onChange(''); }}>✕</button>
        </span>
      ) : (
        <span className="photo-field__empty">{busy ? '⏳' : '📷'} {label || t('upload.pick')}</span>
      )}
      <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
    </label>
  );
}
