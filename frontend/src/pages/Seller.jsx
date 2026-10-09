import React, { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useApp } from '../store';
import { BarChart, EmptyState, Price, Spinner, StatusBadge, Stars } from '../components';
import { locCat, locName, monthLabel } from '../utils';

export function SellerTabs() {
  const { t } = useApp();
  return (
    <div className="tabs">
      <NavLink to="/sotuvchi" end className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>📊 {t('seller.overview')}</NavLink>
      <NavLink to="/sotuvchi/mahsulotlar" className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>📦 {t('seller.products')}</NavLink>
      <NavLink to="/sotuvchi/buyurtmalar" className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>🧾 {t('seller.orders')}</NavLink>
      <NavLink to="/sotuvchi/daromad" className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>💰 {t('seller.earnings')}</NavLink>
    </div>
  );
}

// =================================================================
export function SellerDashboard() {
  const { t, fmtMoney, fmtDate, lang } = useApp();
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState('');

  useEffect(() => { api.get('/api/seller/overview').then(setD).catch(() => {}); }, []);

  const buyPremium = async () => {
    setBusy('premium');
    try {
      const r = await api.post('/api/seller/premium');
      setD((x) => ({ ...x, profile: { ...x.profile, premium_until: r.premium_until } }));
    } catch { /* noop */ }
    setBusy('');
  };

  if (!d) return <Spinner big />;
  const { profile, stats } = d;
  const premium = profile.premium_until && profile.premium_until >= new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="row-between mb">
        <div>
          <h1 className="page__title" style={{ marginBottom: 2 }}>{t('seller.welcome')}, {profile.company_name} 👋</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Stars value={profile.rating} count={profile.rating_count} />
            <span className="muted" style={{ fontSize: 13 }}>📍 {profile.location}</span>
            {profile.approved
              ? <span className="tag tag--green">✓ {t('common.approved')}</span>
              : <span className="tag tag--amber">⏳ {t('common.pending')}</span>}
            {premium && <span className="tag tag--blue">💎 {t('common.premium')}</span>}
          </div>
        </div>
        {!premium && (
          <button className="btn btn--ghost btn--sm" onClick={buyPremium} disabled={busy === 'premium'}>
            {busy === 'premium' ? '...' : t('seller.premium.buy')} — {fmtMoney(500000)}
          </button>
        )}
      </div>

      {!profile.approved && (
        <div className="form-error" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>
          ⏳ {t('seller.notApproved')}
        </div>
      )}

      <div className="stats-grid mb">
        <div className="stat-card"><div className="stat-card__icon">📦</div><strong>{stats.product_count}</strong><span>{t('seller.stat.products')}</span></div>
        <div className="stat-card"><div className="stat-card__icon">🧾</div><strong>{stats.booking_count}</strong><span>{t('seller.stat.bookings')}</span></div>
        <div className="stat-card"><div className="stat-card__icon">⏳</div><strong>{stats.pending_count}</strong><span>{t('seller.stat.pending')}</span></div>
        <div className="stat-card"><div className="stat-card__icon">💵</div><strong>{fmtMoney(stats.revenue_month)}</strong><span>{t('seller.stat.revenueMonth')}</span></div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 className="card__title">💰 {t('seller.earnings.chart')}</h3>
          <BarChart data={d.monthly.map((m) => ({ label: monthLabel(m.m, lang), value: m.revenue }))} />
        </div>
        <div className="card">
          <h3 className="card__title">🧾 {t('seller.recentOrders')}</h3>
          {d.recent_bookings.length === 0 ? <p className="muted">{t('seller.empty.orders')}</p> : (
            d.recent_bookings.map((b) => (
              <Link key={b.id} to={`/buyurtma/${b.id}`} className="row-between" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <span>
                  <strong>{b.code}</strong>
                  <span className="muted" style={{ fontSize: 12.5, display: 'block' }}>{fmtDate(b.event_date)} · {b.customer_name}</span>
                </span>
                <span style={{ textAlign: 'right' }}>
                  <strong>{fmtMoney(b.total)}</strong>
                  <span style={{ display: 'block' }}><StatusBadge status={b.status} /></span>
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// =================================================================
export function SellerProducts() {
  const { t, lang, fmtMoney, toast } = useApp();
  const [items, setItems] = useState(null);
  const navigate = useNavigate();

  const load = () => api.get('/api/seller/products').then((d) => setItems(d.items)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  const del = async (p) => {
    if (!window.confirm(`${t('common.delete')}: ${locName(p, lang)}?`)) return;
    await api.del(`/api/seller/products/${p.id}`);
    toast(t('common.success'));
    load();
  };

  const feature = async (p) => {
    try {
      await api.post(`/api/seller/products/${p.id}/feature`);
      toast(t('common.success'));
      load();
    } catch (e) { toast(e.message, 'error'); }
  };

  if (!items) return <Spinner big />;

  return (
    <div>
      <div className="row-between mb">
        <h2 style={{ margin: 0 }}>{t('seller.products')} ({items.length})</h2>
        <Link to="/sotuvchi/mahsulot-qoshish" className="btn btn--primary">＋ {t('seller.addProduct')}</Link>
      </div>
      {items.length === 0 ? (
        <EmptyState icon="📦" title={t('seller.empty.products')}
          action={<Link to="/sotuvchi/mahsulot-qoshish" className="btn btn--primary">＋ {t('seller.addProduct')}</Link>} />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('common.products')}</th>
                <th>{t('common.price')}</th>
                <th>{t('common.status')}</th>
                <th>⭐</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/mahsulot/${p.id}`} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      {p.image
                        ? <img src={p.image} alt="" style={{ width: 52, height: 40, objectFit: 'cover', borderRadius: 8 }} />
                        : <div className="img-fallback" style={{ width: 52, height: 40, borderRadius: 8, fontSize: 18 }}>{p.category.icon}</div>}
                      <span style={{ fontWeight: 700 }}>{locName(p, lang)}</span>
                    </Link>
                  </td>
                  <td><Price value={p.price} type={p.price_type} /></td>
                  <td>
                    {p.approved
                      ? <span className="tag tag--green">✓ {t('common.approved')}</span>
                      : <span className="tag tag--amber">⏳ {t('common.pending')}</span>}
                    {p.featured && <span className="tag tag--blue" style={{ marginLeft: 4 }}>⭐</span>}
                    {!p.available && <span className="tag" style={{ marginLeft: 4, background: 'var(--red-bg)', color: 'var(--red)' }}>{t('common.unavailable')}</span>}
                  </td>
                  <td><Stars value={p.rating} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <Link to={`/sotuvchi/mahsulot/${p.id}`} className="btn btn--outline btn--sm">✏️ {t('common.edit')}</Link>
                      {!p.featured && <button className="btn btn--ghost btn--sm" onClick={() => feature(p)}>⭐ {fmtMoney(100000)}</button>}
                      <button className="btn btn--danger btn--sm" onClick={() => del(p)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =================================================================
export function ProductForm() {
  const { id } = useParams();
  const { t, toast } = useApp();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [cats, setCats] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [f, setF] = useState({
    name: '', name_ru: '', name_en: '', description: '', price: 100000, price_type: 'kun',
    category_id: '', location: 'Toshkent', quantity: 1, available: true, images: [], blocked_dates: [],
  });

  useEffect(() => { api.get('/api/categories').then((d) => setCats(d.items)); }, []);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/api/products/${id}`).then((p) => {
      setF({
        name: p.name, name_ru: p.name_ru, name_en: p.name_en, description: p.description,
        price: p.price, price_type: p.price_type, category_id: p.category.id,
        location: p.location, quantity: p.quantity, available: p.available,
        images: p.images, blocked_dates: p.blocked_dates,
      });
    });
  }, [id, isEdit]);

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const d = await api.upload('/api/seller/upload', fd);
      setF((x) => ({ ...x, images: [...x.images, d.url] }));
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!f.name.trim() || !f.category_id || !f.price || !f.location.trim()) {
      setError(t('common.required'));
      return;
    }
    setBusy(true);
    try {
      if (isEdit) {
        await api.put(`/api/seller/products/${id}`, { ...f, price: Number(f.price), quantity: Number(f.quantity) });
        toast(t('seller.form.updated'));
      } else {
        await api.post('/api/seller/products', { ...f, price: Number(f.price), quantity: Number(f.quantity) });
        toast(t('seller.form.created'));
      }
      navigate('/sotuvchi/mahsulotlar');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <Link to="/sotuvchi/mahsulotlar" className="link-btn">← {t('common.back')}</Link>
      <h2 style={{ margin: '10px 0 16px' }}>{isEdit ? `✏️ ${t('common.edit')}` : `＋ ${t('seller.addProduct')}`}</h2>
      <form className="card" onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-grid">
          <div className="field">
            <label>{t('seller.form.name')} *</label>
            <input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="field">
            <label>{t('seller.form.category')} *</label>
            <select className="select" value={f.category_id} onChange={(e) => set('category_id', Number(e.target.value))}>
              <option value="">—</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {locCat(c, 'uz')}</option>)}
            </select>
          </div>
          <div className="field">
            <label>{t('seller.form.nameRu')}</label>
            <input className="input" value={f.name_ru} onChange={(e) => set('name_ru', e.target.value)} />
          </div>
          <div className="field">
            <label>{t('seller.form.nameEn')}</label>
            <input className="input" value={f.name_en} onChange={(e) => set('name_en', e.target.value)} />
          </div>
          <div className="field">
            <label>{t('seller.form.price')} *</label>
            <input className="input" type="number" min="1000" step="1000" value={f.price} onChange={(e) => set('price', e.target.value)} />
          </div>
          <div className="field">
            <label>{t('seller.form.priceType')}</label>
            <select className="select" value={f.price_type} onChange={(e) => set('price_type', e.target.value)}>
              <option value="kun">{t('common.perDay')}</option>
              <option value="soat">{t('common.perHour')}</option>
              <option value="dona">{t('common.perPiece')}</option>
              <option value="xizmat">{t('common.perService')}</option>
              <option value="to'plam">{t('common.perSet')}</option>
              <option value="kishi">{t('common.perGuest')}</option>
            </select>
          </div>
          <div className="field">
            <label>{t('seller.form.location')} *</label>
            <input className="input" value={f.location} onChange={(e) => set('location', e.target.value)} />
          </div>
          <div className="field">
            <label>{t('seller.form.quantity')}</label>
            <input className="input" type="number" min="1" value={f.quantity} onChange={(e) => set('quantity', e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>{t('seller.form.description')}</label>
          <textarea className="textarea" value={f.description} onChange={(e) => set('description', e.target.value)} />
        </div>

        <div className="field">
          <label>🖼 {t('seller.form.images')}</label>
          <label className="upload-zone" style={{ display: 'block' }}>
            <input type="file" accept="image/*" hidden onChange={upload} />
            {uploading ? t('seller.form.uploading') : `📤 ${t('seller.form.upload')} (JPG/PNG/WEBP, 5MB)`}
          </label>
          <div className="upload-thumbs">
            {f.images.map((u, i) => (
              <div className="thumb" key={i}>
                <img src={u} alt="" />
                <button type="button" onClick={() => set('images', f.images.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
          </div>
        </div>

        <div className="field">
          <label>📅 {t('seller.form.blockedDates')}</label>
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>{t('seller.form.blockedHint')}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="date" className="input" value={dateInput} onChange={(e) => setDateInput(e.target.value)} style={{ flex: 1 }} />
            <button type="button" className="btn btn--outline" onClick={() => {
              if (dateInput && !f.blocked_dates.includes(dateInput)) set('blocked_dates', [...f.blocked_dates, dateInput]);
              setDateInput('');
            }}>＋ {t('seller.form.addDate')}</button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {f.blocked_dates.map((d) => (
              <span key={d} className="tag">📅 {d}
                <button onClick={() => set('blocked_dates', f.blocked_dates.filter((x) => x !== d))}
                  style={{ background: 'none', border: 'none', color: 'var(--red)', marginLeft: 4 }}>✕</button>
              </span>
            ))}
          </div>
        </div>

        <label className={`radio-card${f.available ? ' selected' : ''}`} style={{ marginTop: 6 }}>
          <input type="checkbox" checked={f.available} onChange={(e) => set('available', e.target.checked)} />
          <span className="radio-card__title">{t('common.available')}</span>
        </label>

        <button className="btn btn--primary btn--lg btn--block mt" disabled={busy}>
          {busy ? '...' : `💾 ${t('seller.form.submit')}`}
        </button>
      </form>
    </div>
  );
}

// =================================================================
export function SellerOrders() {
  const { t, fmtMoney, fmtDate } = useApp();
  const [items, setItems] = useState(null);

  const load = () => api.get('/api/bookings').then((d) => setItems(d.items)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);

  if (!items) return <Spinner big />;
  if (items.length === 0) return <EmptyState icon="🧾" title={t('seller.empty.orders')} />;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>{t('seller.orders')} ({items.length})</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((b) => (
          <div key={b.id} className="card booking-card">
            <div className="booking-card__head">
              <span className="booking-card__code">🧾 {b.code}</span>
              <StatusBadge status={b.status} />
            </div>
            <div className="booking-card__meta">
              <span>👤 {b.customer_name}</span>
              <span>📅 {fmtDate(b.event_date)}</span>
              <span>📍 {b.location}</span>
              <span>🛍 {b.items_count} {t('common.items')}</span>
            </div>
            <div className="row-between">
              <strong style={{ fontSize: 16 }}>{fmtMoney(b.total)}</strong>
              <Link to={`/buyurtma/${b.id}`} className="btn btn--primary btn--sm">{t('bookings.detail.title')} →</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =================================================================
export function SellerEarnings() {
  const { t, lang, fmtMoney, fmtDate } = useApp();
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/api/seller/earnings').then(setD).catch(() => {}); }, []);
  if (!d) return <Spinner big />;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>💰 {t('seller.earnings')}</h2>
      <div className="stats-grid mb" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
        <div className="stat-card"><div className="stat-card__icon">📈</div><strong>{fmtMoney(d.gross)}</strong><span>{t('seller.earnings.gross')}</span></div>
        <div className="stat-card"><div className="stat-card__icon">🏷</div><strong style={{ color: 'var(--red)' }}>−{fmtMoney(d.commission)}</strong><span>{t('seller.earnings.commission')}</span></div>
        <div className="stat-card"><div className="stat-card__icon">💵</div><strong style={{ color: 'var(--green)' }}>{fmtMoney(d.net)}</strong><span>{t('seller.earnings.net')}</span></div>
      </div>

      <div className="card mb">
        <h3 className="card__title">{t('seller.earnings.chart')}</h3>
        <BarChart data={d.monthly.map((m) => ({ label: monthLabel(m.m, lang), value: m.gross - m.commission }))} />
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('checkout.pay.booking')}</th>
              <th>{t('admin.registered')}</th>
              <th>{t('checkout.pay.method')}</th>
              <th>{t('seller.earnings.gross')}</th>
              <th>{t('seller.earnings.commission')}</th>
              <th>{t('seller.earnings.net')}</th>
            </tr>
          </thead>
          <tbody>
            {d.payments.map((p, i) => (
              <tr key={i}>
                <td><Link to={`/buyurtma/${p.booking_id}`} className="link-btn">{p.code}</Link></td>
                <td>{fmtDate(p.created_at)}</td>
                <td>💳 {p.method}</td>
                <td>{fmtMoney(p.amount)}</td>
                <td style={{ color: 'var(--red)' }}>−{fmtMoney(p.commission)}</td>
                <td style={{ color: 'var(--green)', fontWeight: 800 }}>{fmtMoney(p.amount - p.commission)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SellerShell({ children }) {
  const { t } = useApp();
  return (
    <div className="container page">
      <h1 className="page__title">🏪 {t('seller.title')}</h1>
      <SellerTabs />
      {children}
    </div>
  );
}
