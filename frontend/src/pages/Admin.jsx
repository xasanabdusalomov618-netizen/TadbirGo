import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApp } from '../store';
import { BarChart, EmptyState, Spinner, StatusBadge } from '../components';
import { locName, monthLabel } from '../utils';

const TABS = ['stats', 'users', 'sellers', 'products', 'bookings'];

export default function Admin() {
  const { t, lang, fmtMoney, fmtDate, toast } = useApp();
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState(null);
  const [sellers, setSellers] = useState(null);
  const [products, setProducts] = useState(null);
  const [bookings, setBookings] = useState(null);

  const loadTab = (x) => {
    setTab(x);
    if (x === 'stats') api.get('/api/admin/stats').then(setStats).catch(() => {});
    if (x === 'users') api.get('/api/admin/users').then(setUsers).catch(() => {});
    if (x === 'sellers') api.get('/api/admin/sellers').then(setSellers).catch(() => {});
    if (x === 'products') api.get('/api/admin/products').then(setProducts).catch(() => {});
    if (x === 'bookings') api.get('/api/admin/bookings').then(setBookings).catch(() => {});
  };

  useEffect(() => { loadTab('stats'); }, []);

  const approveSeller = async (id) => {
    await api.post(`/api/admin/sellers/${id}/approve`);
    toast(t('common.success'));
    loadTab('sellers');
  };
  const approveProduct = async (id) => {
    await api.post(`/api/admin/products/${id}/approve`);
    toast(t('common.success'));
    loadTab('products');
  };
  const removeProduct = async (p) => {
    if (!window.confirm(t('admin.removeConfirm'))) return;
    await api.del(`/api/admin/products/${p.id}`);
    toast(t('common.success'));
    loadTab('products');
  };

  return (
    <div className="container page">
      <h1 className="page__title">⚙️ {t('admin.title')}</h1>
      <div className="tabs">
        {TABS.map((x) => (
          <button key={x} className={`tab${tab === x ? ' active' : ''}`} onClick={() => loadTab(x)}>
            {t(`admin.tab.${x}`)}
          </button>
        ))}
      </div>

      {/* ---------- STATS ---------- */}
      {tab === 'stats' && (!stats ? <Spinner big /> : (
        <div>
          <div className="stats-grid mb">
            <div className="stat-card"><div className="stat-card__icon">👥</div><strong>{stats.users}</strong><span>{t('admin.stat.users')}</span></div>
            <div className="stat-card"><div className="stat-card__icon">🏪</div><strong>{stats.sellers}</strong><span>{t('admin.stat.sellers')}</span></div>
            <div className="stat-card"><div className="stat-card__icon">🧾</div><strong>{stats.bookings}</strong><span>{t('admin.stat.bookings')}</span></div>
            <div className="stat-card"><div className="stat-card__icon">💰</div><strong>{fmtMoney(stats.revenue)}</strong><span>{t('admin.stat.revenue')}</span></div>
            <div className="stat-card"><div className="stat-card__icon">🏷</div><strong>{fmtMoney(stats.commission)}</strong><span>{t('admin.stat.commission')}</span></div>
            <div className="stat-card"><div className="stat-card__icon">📦</div><strong>{stats.active_listings}</strong><span>{t('admin.stat.listings')}</span></div>
            <div className="stat-card"><div className="stat-card__icon">⏳</div><strong>{stats.pending_sellers}</strong><span>{t('admin.stat.pendingSellers')}</span></div>
            <div className="stat-card"><div className="stat-card__icon">🕵️</div><strong>{stats.pending_products}</strong><span>{t('admin.stat.pendingProducts')}</span></div>
          </div>

          <div className="grid-2">
            <div className="card">
              <h3 className="card__title">📈 {t('admin.chart')}</h3>
              <BarChart data={stats.monthly.map((m) => ({ label: monthLabel(m.m, lang), value: m.revenue }))} height={210} />
            </div>
            <div className="card">
              <h3 className="card__title">🧾 {t('admin.recent')}</h3>
              {stats.recent_bookings.map((b) => (
                <Link key={b.id} to={`/buyurtma/${b.id}`} className="row-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>
                    <strong>{b.code}</strong>
                    <span className="muted" style={{ display: 'block', fontSize: 12.5 }}>{b.seller_name} · {b.customer_name}</span>
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <strong>{fmtMoney(b.total)}</strong>
                    <span style={{ display: 'block' }}><StatusBadge status={b.status} /></span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* ---------- USERS ---------- */}
      {tab === 'users' && (!users ? <Spinner big /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>ID</th><th>{t('auth.name')}</th><th>{t('admin.email')}</th><th>{t('admin.phone')}</th><th>{t('admin.role')}</th><th>{t('admin.stat.bookings')}</th><th>{t('admin.registered')}</th></tr></thead>
            <tbody>
              {users.items.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td><strong>{u.name}</strong></td>
                  <td>{u.email}</td>
                  <td>{u.phone || '—'}</td>
                  <td><span className={`tag ${u.role === 'admin' ? 'tag--blue' : u.role === 'seller' ? 'tag--amber' : 'tag--green'}`}>{t(`profile.roles.${u.role}`)}</span></td>
                  <td>{u.bookings_count}</td>
                  <td>{fmtDate(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* ---------- SELLERS ---------- */}
      {tab === 'sellers' && (!sellers ? <Spinner big /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>{t('admin.company')}</th><th>{t('admin.owner')}</th><th>{t('common.location')}</th><th>⭐</th><th>{t('common.products')}</th><th>{t('common.status')}</th><th>{t('common.actions')}</th></tr></thead>
            <tbody>
              {sellers.items.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.company_name}</strong>{s.premium_until && ' 💎'}</td>
                  <td>{s.owner_name}<div className="muted" style={{ fontSize: 12 }}>{s.owner_email}</div></td>
                  <td>{s.location}</td>
                  <td>{Number(s.rating).toFixed(1)} ⭐</td>
                  <td>{s.products_count}</td>
                  <td>{s.approved ? <span className="tag tag--green">✓</span> : <span className="tag tag--amber">⏳</span>}</td>
                  <td>
                    {!s.approved && <button className="btn btn--success btn--sm" onClick={() => approveSeller(s.id)}>✅ {t('admin.approve')}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* ---------- PRODUCTS ---------- */}
      {tab === 'products' && (!products ? <Spinner big /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>{t('common.products')}</th><th>{t('common.seller')}</th><th>{t('common.price')}</th><th>{t('common.status')}</th><th>{t('common.actions')}</th></tr></thead>
            <tbody>
              {products.items.map((p) => (
                <tr key={p.id}>
                  <td><Link to={`/mahsulot/${p.id}`}><strong>{locName(p, lang)}</strong></Link></td>
                  <td>{p.seller.company_name}</td>
                  <td>{fmtMoney(p.price)}</td>
                  <td>
                    {p.approved ? <span className="tag tag--green">✓</span> : <span className="tag tag--amber">⏳ {t('common.pending')}</span>}
                    {!p.available && <span className="tag" style={{ marginLeft: 4, background: 'var(--red-bg)', color: 'var(--red)' }}>off</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {!p.approved && <button className="btn btn--success btn--sm" onClick={() => approveProduct(p.id)}>✅ {t('admin.approve')}</button>}
                      <button className="btn btn--danger btn--sm" onClick={() => removeProduct(p)}>🗑 {t('admin.remove')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* ---------- BOOKINGS ---------- */}
      {tab === 'bookings' && (!bookings ? <Spinner big /> : bookings.items.length === 0 ? <EmptyState icon="🧾" title={t('common.empty')} /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>{t('checkout.pay.booking')}</th><th>{t('common.customer')}</th><th>{t('common.seller')}</th><th>{t('common.date')}</th><th>{t('common.total')}</th><th>{t('common.status')}</th></tr></thead>
            <tbody>
              {bookings.items.map((b) => (
                <tr key={b.id}>
                  <td><Link to={`/buyurtma/${b.id}`}><strong>{b.code}</strong></Link></td>
                  <td>{b.customer_name}</td>
                  <td>{b.seller_name}</td>
                  <td>{fmtDate(b.event_date)}</td>
                  <td>{fmtMoney(b.total)}</td>
                  <td><StatusBadge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
