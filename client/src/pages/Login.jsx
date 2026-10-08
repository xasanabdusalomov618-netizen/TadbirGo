import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogIn, Shield, Store, User, Sparkles, ArrowRight } from 'lucide-react';

import { useAuth } from '../context/AuthContext.jsx';
import { api, errorMessage } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Alert } from '../components/ui.jsx';

const DEMO = [
  { email: 'customer@eventbox.uz', password: 'customer123', labelKey: 'auth.demoCustomer', icon: User, to: '/' },
  { email: 'seller@eventbox.uz', password: 'seller123', labelKey: 'auth.demoSeller', icon: Store, to: '/seller' },
  { email: 'admin@eventbox.uz', password: 'admin123', labelKey: 'auth.demoAdmin', icon: Shield, to: '/admin' },
];

export default function Login() {
  const { t } = useTranslation();
  const { login, isAuthed, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const next = params.get('next');

  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthed && user) {
      navigate(user.role === 'seller' ? '/seller' : user.role === 'admin' ? '/admin' : next || '/', { replace: true });
    }
  }, [isAuthed, user, navigate, next]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const account = await login(form.email, form.password);
      toast.success(t('auth.loggedIn'));
      const target = account.role === 'seller' ? '/seller' : account.role === 'admin' ? '/admin' : next || '/';
      navigate(target, { replace: true });
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  const fill = (account) => {
    setForm({ email: account.email, password: account.password });
    setError('');
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:items-center">
      {/* left: pitch */}
      <div className="hidden lg:block">
        <span className="soft-chip !text-[11px]">
          <Sparkles size={13} style={{ color: 'var(--accent)' }} /> {t('app.tagline')}
        </span>
        <h1 className="mt-6 text-balance text-4xl font-black leading-tight">
          <span className="gradient-text">{t('home.heroTitle')}</span>
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">{t('home.heroSubtitle')}</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {[
            { icon: Shield, title: t('home.adv1'), desc: t('home.adv1Desc') },
            { icon: Store, title: t('home.adv2'), desc: t('home.adv2Desc') },
          ].map((item) => (
            <div key={item.title} className="soft p-4">
              <item.icon size={20} style={{ color: 'var(--accent)' }} />
              <p className="mt-3 text-sm font-bold">{item.title}</p>
              <p className="mt-1 text-xs text-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* right: form */}
      <div className="soft-lg mx-auto w-full max-w-md p-6 sm:p-8">
        <h2 className="text-2xl font-black">{t('auth.loginTitle')}</h2>
        <p className="mt-1.5 text-sm text-muted">{t('app.tagline')}</p>

        {error && (
          <div className="mt-5">
            <Alert type="error">{error}</Alert>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="soft-label">{t('auth.email')}</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="soft-input"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="soft-label">{t('auth.password')}</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="soft-input"
              placeholder="••••••"
            />
          </div>

          <button type="submit" disabled={busy} className="soft-btn-primary w-full">
            <LogIn size={17} /> {busy ? t('auth.submitting') : t('auth.login')}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="link-soft">{t('auth.register')}</Link>
        </p>

        <div className="soft-divider my-6" />

        <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-muted">{t('auth.demoTitle')}</p>
        <div className="space-y-2">
          {DEMO.map((account) => (
            <button
              key={account.email}
              onClick={() => fill(account)}
              className="soft-flat flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:text-accent"
            >
              <span className="soft-icon !h-9 !w-9" style={{ color: 'var(--accent)' }}>
                <account.icon size={16} />
              </span>
              <span className="flex-1">
                <span className="block text-xs font-bold">{t(account.labelKey)}</span>
                <span className="block text-[10px] text-muted">{account.email}</span>
              </span>
              <ArrowRight size={14} className="text-muted" />
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] text-muted">{t('auth.demoHint')}</p>
      </div>
    </div>
  );
}
