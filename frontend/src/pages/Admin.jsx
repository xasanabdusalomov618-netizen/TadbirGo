import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApp } from '../store';
import { BarChart, EmptyState, HBars, Spinner, StatusBadge } from '../components';
import { locName, monthLabel, locCat } from '../utils';

const TABS = ['stats', 'disputes', 'bookings', 'sellers', 'categories', 'products', 'users', 'settings'];

const BOOKING_STATUSES = ['yangi', 'kutmoqda', 'tasdiqlandi', 'tayyorlanmoqda', 'yetkazilmoqda', 'ornatilmoqda',
  'jarayonida', 'yakunlandi', 'bekor'];

export default function Admin() {
  const { t, lang, fmtMoney, fmtDate, toast } = useApp();
  const [tab, setTab] = useState('stats');
  const [data, setData] = useState({});

  const load = (x) => {
    const map = {
      stats: ['/api/admin/stats'],
      users: ['/api/admin/users'],
      sellers: ['/api/admin/sellers'],
      products: ['/api/admin/products'],
      bookings: ['/api/admin/bookings'],
      disputes: ['/api/admin/disputes'],
      categories: ['/api/admin/categories'],
      settings: ['/api/admin/settings'],
    };
    const [url] = map[x];
    const extra = x === 'stats' ? ['/api/admin/revenue-by-category'] : [];
    return Promise.all([url, ...extra].map((u) => api.get(u)))
      .then(([main, rev]) => setData((d) => ({ ...d, [x]: main, ...(rev ? { revenue: rev } : {}) })))
      .catch((e) => toast(e.message, 'error'));
  };

  const open = (x) => { setTab(x); load(x); };
  useEffect(() => { load('stats'); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (fn, msg = 'common.success') => {
    try {
      await fn();
      toast(t(msg));
      load(tab);
      return true;
    } catch (e) {
      toast(e.message, 'error');
      return false;
    }
  };

  const approveSeller = (id) => act(() => api.post(`/api/admin/sellers/${id}/approve`));
  const suspendSeller = (s) => {
    if (!s.suspended && !window.confirm(t('admin.suspendConfirm'))) return;
    act(() => api.post(`/api/admin/sellers/${s.id}/suspend`, { suspended: !s.suspended }));
  };
  const approveProduct = (id) => act(() => api.post(`/api/admin/products/${id}/approve`));
  const removeProduct = (p) => {
    if (!window.confirm(t('admin.removeConfirm'))) return;
    act(() => api.del(`/api/admin/products/${p.id}`));
  };

  const stats = data.stats;

  return (
    <div className="container page">
      <div className="page__head">
        <h1 className="page__title">⚙️ {t('admin.title')}</h1>
        <p className="page__subtitle">{t('admin.subtitle')}</p>
      </div>
      <div className="tabs tabs--scroll">
        {TABS.map((x) => (
          <button key={x} className={`tab${tab === x ? ' active' : ''}`} onClick={() => open(x)}>
            {t(`admin.tab.${x}`)}
            {x === 'disputes' && stats?.open_disputes > 0 && <span className="tab__count">{stats.open_disputes}</span>}
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
            <div className="stat-card"><div className="stat-card__icon">🛟</div><strong>{stats.open_disputes}</strong><span>{t('admin.stat.openDisputes')}</span></div>
          </div>

          <div className="grid-2">
            <div className="card">
              <h3 className="card__title">📈 {t('admin.chart')}</h3>
              <BarChart data={stats.monthly.map((m) => ({ label: monthLabel(m.m, lang), value: m.revenue }))} height={210} />
            </div>
            <div className="card">
              <h3 className="card__title">🧩 {t('admin.revenueBreakdown')}</h3>
              <HBars items={(data.revenue?.items || []).filter((c) => c.gross > 0).map((c) => ({
                label: locCat(c, lang), icon: c.icon, value: c.gross,
              }))} />
            </div>
          </div>

          <div className="card mt">
            <h3 className="card__title">🧾 {t('admin.recent')}</h3>
            {stats.recent_bookings.map((b) => (
              <Link key={b.id} to={`/buyurtma/${b.id}`} className="row-between list-row">
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
      ))}

      {/* ---------- DISPUTES ---------- */}
      {tab === 'disputes' && (!data.disputes ? <Spinner big /> : data.disputes.items.length === 0 ? (
        <EmptyState icon="🛟" title={t('common.empty')} text={t('admin.disputes.empty')} />
      ) : (
        <div className="dispute-list">
          {data.disputes.items.map((d) => (
            <DisputeRow key={d.id} d={d} t={t} fmtMoney={fmtMoney} fmtDate={fmtDate}
              onResolve={(payload) => act(() => api.post(`/api/admin/disputes/${d.id}/resolve`, payload), 'admin.disputes.resolved')} />
          ))}
        </div>
      ))}

      {/* ---------- BOOKINGS ---------- */}
      {tab === 'bookings' && (!data.bookings ? <Spinner big /> : data.bookings.items.length === 0 ? (
        <EmptyState icon="🧾" title={t('common.empty')} />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>{t('checkout.pay.booking')}</th><th>{t('common.customer')}</th><th>{t('common.seller')}</th><th>{t('common.date')}</th><th>{t('common.total')}</th><th>{t('common.status')}</th><th>{t('admin.overrideStatus')}</th></tr></thead>
            <tbody>
              {data.bookings.items.map((b) => (
                <tr key={b.id}>
                  <td><Link to={`/buyurtma/${b.id}`}><strong>{b.code}</strong></Link></td>
                  <td>{b.customer_name}</td>
                  <td>{b.seller_name}</td>
                  <td>{fmtDate(b.event_date)}</td>
                  <td>{fmtMoney(b.total)}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td>
                    <select className="select select--sm" value={b.status}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === b.status) return;
                        if (window.confirm(t('admin.overrideConfirm'))) {
                          act(() => api.post(`/api/admin/bookings/${b.id}/status`, { status: v, note: 'admin' }), 'admin.overrideDone');
                        }
                      }}>
                      {BOOKING_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* ---------- SELLERS ---------- */}
      {tab === 'sellers' && (!data.sellers ? <Spinner big /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>{t('admin.company')}</th><th>{t('admin.owner')}</th><th>{t('admin.verification')}</th><th>⭐</th><th>{t('common.products')}</th><th>{t('common.status')}</th><th>{t('common.actions')}</th></tr></thead>
            <tbody>
              {data.sellers.items.map((s) => (
                <tr key={s.id} style={s.suspended ? { opacity: 0.6 } : undefined}>
                  <td><strong>{s.company_name}</strong>{s.premium_until && ' 💎'}<div className="muted" style={{ fontSize: 12 }}>{s.location}</div></td>
                  <td>{s.owner_name}<div className="muted" style={{ fontSize: 12 }}>{s.owner_email}</div></td>
                  <td style={{ fontSize: 12.5 }}>
                    <div>STIR: <strong>{s.tax_id || '—'}</strong></div>
                    <div>PINFL: <strong>{s.pinfl || '—'}</strong></div>
                    <div>{t('auth.verify.passport')}: <strong>{s.passport || '—'}</strong></div>
                    <span className={`tag ${s.verification_status === 'verified' ? 'tag--green' : 'tag--amber'}`}>
                      {t(`admin.verif.${s.verification_status}`)}
                    </span>
                  </td>
                  <td>{Number(s.rating).toFixed(1)} ⭐</td>
                  <td>{s.products_count}</td>
                  <td>
                    {s.suspended ? <span className="tag tag--red">{t('admin.suspended')}</span>
                      : s.approved ? <span className="tag tag--green">✓</span> : <span className="tag tag--amber">⏳</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {!s.approved && <button className="btn btn--success btn--sm" onClick={() => approveSeller(s.id)}>✅ {t('admin.approve')}</button>}
                      <button className={`btn btn--sm ${s.suspended ? 'btn--outline' : 'btn--danger'}`} onClick={() => suspendSeller(s)}>
                        {s.suspended ? `↺ ${t('admin.reactivate')}` : `⛔ ${t('admin.suspend')}`}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* ---------- CATEGORIES & COMMISSION ---------- */}
      {tab === 'categories' && (!data.categories ? <Spinner big /> : (
        <CategoryManager data={data.categories} t={t} lang={lang} onSaved={() => load('categories')} toast={toast} />
      ))}

      {/* ---------- PRODUCTS ---------- */}
      {tab === 'products' && (!data.products ? <Spinner big /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>{t('common.products')}</th><th>{t('common.seller')}</th><th>{t('common.price')}</th><th>{t('common.status')}</th><th>{t('common.actions')}</th></tr></thead>
            <tbody>
              {data.products.items.map((p) => (
                <tr key={p.id}>
                  <td><Link to={`/mahsulot/${p.id}`}><strong>{locName(p, lang)}</strong></Link></td>
                  <td>{p.seller.company_name}</td>
                  <td>{fmtMoney(p.price)}</td>
                  <td>
                    {p.approved ? <span className="tag tag--green">✓</span> : <span className="tag tag--amber">⏳ {t('common.pending')}</span>}
                    {!p.available && <span className="tag tag--red" style={{ marginLeft: 4 }}>off</span>}
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

      {/* ---------- USERS ---------- */}
      {tab === 'users' && (!data.users ? <Spinner big /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>ID</th><th>{t('auth.name')}</th><th>{t('admin.email')}</th><th>{t('admin.phone')}</th><th>{t('admin.role')}</th><th>{t('admin.stat.bookings')}</th><th>{t('admin.registered')}</th></tr></thead>
            <tbody>
              {data.users.items.map((u) => (
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

      {/* ---------- SETTINGS ---------- */}
      {tab === 'settings' && (!data.settings ? <Spinner big /> : (
        <CommissionSettings initial={data.settings} t={t} onSaved={() => load('settings')} toast={toast} />
      ))}
    </div>
  );
}

function DisputeRow({ d, t, fmtMoney, fmtDate, onResolve }) {
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState(Math.round(d.total / 2));
  const open = d.status === 'open';
  return (
    <div className="card dispute-admin">
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Link to={`/buyurtma/${d.booking_id}`}><strong>{d.code}</strong></Link>
          <span className="muted" style={{ marginLeft: 8, fontSize: 13 }}>{d.customer_name} ↔ {d.seller_name}</span>
        </div>
        <div>
          <span className={`tag ${open ? 'tag--amber' : d.status === 'resolved' ? 'tag--green' : ''}`}>{t(`dispute.status.${d.status}`)}</span>
          <strong style={{ marginLeft: 10 }}>{fmtMoney(d.total)}</strong>
        </div>
      </div>
      <div className="mt"><span className="tag tag--blue">{t(`dispute.reason.${d.reason}`)}</span></div>
      {d.description && <p style={{ margin: '8px 0 0' }}>{d.description}</p>}
      <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>{t('dispute.openedBy')}: {d.opened_by_name} · {fmtDate(d.created_at)}</div>
      {d.resolution && <p style={{ marginTop: 8 }}>✔ {d.resolution}</p>}

      {open && (
        <div className="dispute-admin__actions">
          <input className="input" placeholder={t('admin.disputes.note')} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="dispute-admin__buttons">
            <button className="btn btn--danger btn--sm" onClick={() => window.confirm(t('admin.disputes.confirmRefund')) && onResolve({ action: 'refund', note })}>
              ↩ {t('admin.disputes.refundAll')}
            </button>
            <div className="partial-refund">
              <input className="input" type="number" min="1" max={d.total} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
              <button className="btn btn--outline btn--sm" onClick={() => onResolve({ action: 'partial', amount, note })}>
                {t('admin.disputes.partial')}
              </button>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={() => onResolve({ action: 'dismiss', note })}>✕ {t('admin.disputes.dismiss')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryManager({ data, t, lang, onSaved, toast }) {
  const blank = { id: null, name_uz: '', name_ru: '', name_en: '', icon: '📦', commission_rate: '' };
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!editing.name_uz.trim()) { toast(t('admin.cat.nameRequired'), 'error'); return; }
    const rate = editing.commission_rate === '' || editing.commission_rate == null ? null : Number(editing.commission_rate);
    if (rate !== null && (rate < 10 || rate > 20)) { toast(t('admin.cat.rateRange'), 'error'); return; }
    const body = { name_uz: editing.name_uz, name_ru: editing.name_ru, name_en: editing.name_en, icon: editing.icon, commission_rate: rate };
    setBusy(true);
    try {
      if (editing.id) await api.put(`/api/admin/categories/${editing.id}`, body);
      else await api.post('/api/admin/categories', body);
      toast(t('common.success'));
      setEditing(null);
      onSaved();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const remove = async (c) => {
    if (!window.confirm(t('admin.cat.deleteConfirm'))) return;
    try { await api.del(`/api/admin/categories/${c.id}`); toast(t('common.success')); onSaved(); }
    catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div>
      <div className="row-between mb" style={{ flexWrap: 'wrap', gap: 10 }}>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          {t('admin.cat.hint')} <strong>{t('admin.cat.global')}: {data.global_rate}%</strong>
        </p>
        <button className="btn btn--primary btn--sm" onClick={() => setEditing({ ...blank })}>＋ {t('admin.cat.new')}</button>
      </div>

      {editing && (
        <div className="card mb cat-editor">
          <h3 className="card__title">{editing.id ? t('admin.cat.edit') : t('admin.cat.new')}</h3>
          <div className="form-grid">
            <div className="field"><label>{t('admin.cat.nameUz')} *</label><input className="input" value={editing.name_uz} onChange={(e) => setEditing({ ...editing, name_uz: e.target.value })} /></div>
            <div className="field"><label>{t('admin.cat.nameRu')}</label><input className="input" value={editing.name_ru} onChange={(e) => setEditing({ ...editing, name_ru: e.target.value })} /></div>
            <div className="field"><label>{t('admin.cat.nameEn')}</label><input className="input" value={editing.name_en} onChange={(e) => setEditing({ ...editing, name_en: e.target.value })} /></div>
            <div className="field"><label>{t('admin.cat.icon')}</label><input className="input" maxLength={4} value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} /></div>
            <div className="field">
              <label>{t('admin.cat.rate')}: <strong className="grad-text">{editing.commission_rate === '' || editing.commission_rate == null ? `${data.global_rate}% (${t('admin.cat.useGlobal')})` : `${editing.commission_rate}%`}</strong></label>
              <input type="range" className="range" min="10" max="20" step="0.5"
                value={editing.commission_rate === '' || editing.commission_rate == null ? data.global_rate : editing.commission_rate}
                onChange={(e) => setEditing({ ...editing, commission_rate: Number(e.target.value) })} />
              <button type="button" className="btn btn--ghost btn--sm" style={{ marginTop: 6 }}
                onClick={() => setEditing({ ...editing, commission_rate: '' })}>↺ {t('admin.cat.useGlobal')}</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--primary btn--sm" disabled={busy} onClick={save}>💾 {t('common.save')}</button>
            <button className="btn btn--ghost btn--sm" onClick={() => setEditing(null)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>{t('admin.cat.col')}</th><th>{t('common.products')}</th><th>{t('admin.cat.rate')}</th><th>{t('common.actions')}</th></tr></thead>
          <tbody>
            {data.items.map((c) => (
              <tr key={c.id}>
                <td><span style={{ fontSize: 18, marginRight: 8 }}>{c.icon}</span><strong>{locCat(c, lang)}</strong></td>
                <td>{c.products_count}</td>
                <td>
                  {c.commission_rate != null
                    ? <span className="tag tag--blue">{c.commission_rate}%</span>
                    : <span className="muted">{data.global_rate}% ({t('admin.cat.useGlobal')})</span>}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn--outline btn--sm" onClick={() => setEditing({
                      id: c.id, name_uz: c.name_uz, name_ru: c.name_ru, name_en: c.name_en, icon: c.icon || '📦',
                      commission_rate: c.commission_rate ?? '',
                    })}>✏️ {t('common.edit')}</button>
                    <button className="btn btn--danger btn--sm" onClick={() => remove(c)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CommissionSettings({ initial, t, onSaved, toast }) {
  const [rate, setRate] = useState(initial.commission_rate);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api.put('/api/admin/settings', { commission_rate: Number(rate) });
      toast(t('common.success'));
      onSaved();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="card" style={{ maxWidth: 620 }}>
      <h3 className="card__title">🏷 {t('admin.settings.commission')}</h3>
      <p className="muted" style={{ fontSize: 14 }}>{t('admin.settings.hint')}</p>
      <div className="commission-display"><strong className="grad-text">{rate}%</strong><span className="muted">{t('admin.settings.global')}</span></div>
      <input type="range" className="range" min={initial.min} max={initial.max} step="0.5" value={rate}
        onChange={(e) => setRate(Number(e.target.value))} />
      <div className="row-between muted" style={{ fontSize: 12.5 }}><span>{initial.min}%</span><span>{initial.max}%</span></div>
      <button className="btn btn--primary mt" disabled={busy} onClick={save}>💾 {t('common.save')}</button>
    </div>
  );
}
