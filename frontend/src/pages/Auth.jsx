import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useApp, useAuth } from '../store';
import { Spinner } from '../components';

// =================================================================
export function Login() {
  const { t, toast } = useApp();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const [f, setF] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const user = await login(f.email, f.password);
      toast(`${t('seller.welcome')}, ${user.name}! 👋`);
      navigate(next);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const fillDemo = (email, password) => setF({ email, password });

  return (
    <div className="container page">
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>👋 {t('auth.login.title')}</h1>
          <p className="sub">{t('auth.login.subtitle')}</p>
          {error && <div className="form-error">{error}</div>}
          <form onSubmit={submit}>
            <div className="field">
              <label>{t('auth.email')}</label>
              <input className="input" type="email" required value={f.email}
                onChange={(e) => setF((x) => ({ ...x, email: e.target.value }))} />
            </div>
            <div className="field">
              <label>{t('auth.password')}</label>
              <input className="input" type="password" required value={f.password}
                onChange={(e) => setF((x) => ({ ...x, password: e.target.value }))} />
            </div>
            <button className="btn btn--primary btn--block btn--lg" disabled={busy}>
              {busy ? '...' : t('auth.loginBtn')}
            </button>
          </form>
          <p className="muted" style={{ textAlign: 'center', marginTop: 16, fontSize: 14 }}>
            {t('auth.noAccount')} <Link to="/royxatdan-otish" className="link-btn">{t('nav.register')}</Link>
          </p>
          <hr className="divider" />
          <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>🔑 {t('auth.demo')}:</div>
          <div className="demo-chips">
            <button onClick={() => fillDemo('mijoz@tadbirgo.uz', 'mijoz123')}>👤 {t('auth.demo.customer')}</button>
            <button onClick={() => fillDemo('seller1@tadbirgo.uz', 'tadbir123')}>🏪 {t('auth.demo.seller')}</button>
            <button onClick={() => fillDemo('admin@tadbirgo.uz', 'admin123')}>⚙️ {t('auth.demo.admin')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =================================================================
export function Register() {
  const { t, toast } = useApp();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({
    name: '', email: '', password: '', password2: '', phone: '',
    role: 'customer', company_name: '', location: 'Toshkent', description: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (f.password !== f.password2) { setError(t('auth.passwordMismatch')); return; }
    if (f.password.length < 6) { setError(t('auth.password') + ' ≥ 6'); return; }
    setBusy(true);
    try {
      await register({
        name: f.name, email: f.email, password: f.password, phone: f.phone, role: f.role,
        company_name: f.company_name, location: f.location, description: f.description,
      });
      toast(t('common.success'));
      navigate(f.role === 'seller' ? '/sotuvchi' : '/');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="container page">
      <div className="auth-wrap" style={{ maxWidth: 520 }}>
        <div className="auth-card">
          <h1>🎉 {t('auth.register.title')}</h1>
          <p className="sub">{t('auth.register.subtitle')}</p>
          {error && <div className="form-error">{error}</div>}
          <form onSubmit={submit}>
            <div className="field">
              <label>{t('auth.role')}</label>
              <div className="role-picker">
                <button type="button" className={f.role === 'customer' ? 'active' : ''} onClick={() => set('role', 'customer')}>
                  <strong>🛍 {t('auth.role.customer')}</strong>
                  <span>{t('auth.role.customerHint')}</span>
                </button>
                <button type="button" className={f.role === 'seller' ? 'active' : ''} onClick={() => set('role', 'seller')}>
                  <strong>🏪 {t('auth.role.seller')}</strong>
                  <span>{t('auth.role.sellerHint')}</span>
                </button>
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>{t('auth.name')} *</label>
                <input className="input" required value={f.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div className="field">
                <label>{t('auth.phone')}</label>
                <input className="input" placeholder="+998 90 123 45 67" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>{t('auth.email')} *</label>
              <input className="input" type="email" required value={f.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>{t('auth.password')} *</label>
                <input className="input" type="password" required minLength={6} value={f.password} onChange={(e) => set('password', e.target.value)} />
              </div>
              <div className="field">
                <label>{t('auth.passwordConfirm')} *</label>
                <input className="input" type="password" required value={f.password2} onChange={(e) => set('password2', e.target.value)} />
              </div>
            </div>
            {f.role === 'seller' && (
              <>
                <div className="field">
                  <label>{t('auth.company')} *</label>
                  <input className="input" required value={f.company_name} onChange={(e) => set('company_name', e.target.value)} />
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label>{t('auth.city')}</label>
                    <input className="input" value={f.location} onChange={(e) => set('location', e.target.value)} />
                  </div>
                  <div className="field">
                    <label>{t('auth.description')}</label>
                    <input className="input" value={f.description} onChange={(e) => set('description', e.target.value)} />
                  </div>
                </div>
              </>
            )}
            <button className="btn btn--primary btn--block btn--lg" disabled={busy}>
              {busy ? '...' : t('auth.registerBtn')}
            </button>
          </form>
          <p className="muted" style={{ textAlign: 'center', marginTop: 16, fontSize: 14 }}>
            {t('auth.haveAccount')} <Link to="/kirish" className="link-btn">{t('auth.loginBtn')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// =================================================================
export function Profile() {
  const { t, toast, fmtDate, fmtMoney } = useApp();
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: '', phone: '' });
  const [pw, setPw] = useState({ old: '', new1: '' });
  const [packages, setPackages] = useState(null);

  useEffect(() => {
    if (user) setF({ name: user.name, phone: user.phone || '' });
    api.get('/api/packages').then((d) => setPackages(d.items)).catch(() => setPackages([]));
  }, [user]);

  if (!user) return <div className="container page"><Spinner big /></div>;

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.put('/api/auth/me', { name: f.name, phone: f.phone });
      await refresh();
      toast(t('profile.saved'));
    } catch (err) { toast(err.message, 'error'); }
  };

  const changePw = async (e) => {
    e.preventDefault();
    try {
      await api.put('/api/auth/password', { old_password: pw.old, new_password: pw.new1 });
      setPw({ old: '', new1: '' });
      toast(t('profile.password.changed'));
    } catch (err) { toast(err.message, 'error'); }
  };

  const premium = user.seller?.premium_until && user.seller.premium_until >= new Date().toISOString().slice(0, 10);

  return (
    <div className="container page">
      <h1 className="page__title">👤 {t('profile.title')}</h1>
      <div className="grid-2" style={{ maxWidth: 900 }}>
        <div>
          <div className="card">
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18 }}>
              <span className="avatar" style={{ width: 56, height: 56, fontSize: 24, borderRadius: 16 }}>{user.name[0]?.toUpperCase()}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{user.name}</div>
                <div className="muted" style={{ fontSize: 13 }}>{user.email}</div>
                <div style={{ marginTop: 4 }}>
                  <span className="tag tag--blue">{t(`profile.roles.${user.role}`)}</span>
                  {user.role === 'seller' && user.seller && (
                    <span className={`tag ${user.seller.approved ? 'tag--green' : 'tag--amber'}`} style={{ marginLeft: 6 }}>
                      {user.seller.approved ? `✓ ${user.seller.company_name}` : `⏳ ${user.seller.company_name}`}
                    </span>
                  )}
                  {premium && <span className="tag tag--blue" style={{ marginLeft: 6 }}>💎 {t('common.premium')}</span>}
                </div>
              </div>
            </div>
            <form onSubmit={save}>
              <div className="field">
                <label>{t('profile.name')}</label>
                <input className="input" value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} />
              </div>
              <div className="field">
                <label>{t('profile.phone')}</label>
                <input className="input" value={f.phone} onChange={(e) => setF((x) => ({ ...x, phone: e.target.value }))} />
              </div>
              <div className="field">
                <label>{t('profile.email')}</label>
                <input className="input" value={user.email} disabled />
              </div>
              <div className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>
                {t('profile.registered')}: {fmtDate(user.created_at)}
              </div>
              <button className="btn btn--primary">💾 {t('profile.save')}</button>
            </form>
          </div>

          <div className="card mt">
            <h3 className="card__title">🔒 {t('profile.password.title')}</h3>
            <form onSubmit={changePw}>
              <div className="field">
                <label>{t('profile.password.old')}</label>
                <input className="input" type="password" required value={pw.old} onChange={(e) => setPw((x) => ({ ...x, old: e.target.value }))} />
              </div>
              <div className="field">
                <label>{t('profile.password.new')}</label>
                <input className="input" type="password" required minLength={6} value={pw.new1} onChange={(e) => setPw((x) => ({ ...x, new1: e.target.value }))} />
              </div>
              <button className="btn btn--outline">🔒 {t('profile.password.title')}</button>
            </form>
          </div>

          {user.role === 'seller' && (
            <button className="btn btn--primary btn--block mt" onClick={() => navigate('/sotuvchi')}>
              🏪 {t('profile.sellerZone')} →
            </button>
          )}
        </div>

        <div>
          <div className="card">
            <h3 className="card__title">🧩 {t('profile.myPackages')}</h3>
            {!packages ? <Spinner /> : packages.length === 0 ? <p className="muted">{t('common.empty')}</p> : (
              packages.map((p) => (
                <div key={p.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="row-between">
                    <strong>{t(`builder.eventType.${p.event_type}`)}</strong>
                    <span className="tag">{fmtMoney(p.total)}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    📅 {p.event_date ? fmtDate(p.event_date) : '—'} · 👥 {p.guests} · 📍 {p.location || '—'}
                  </div>
                  <div className="muted" style={{ fontSize: 12.5 }}>{p.items?.length} {t('common.items')}</div>
                </div>
              ))
            )}
            <Link to="/paket" className="btn btn--ghost btn--sm mt">🧩 {t('nav.builder')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
