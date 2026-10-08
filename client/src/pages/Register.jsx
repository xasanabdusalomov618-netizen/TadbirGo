import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserPlus, Store, User, Check } from 'lucide-react';

import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { errorMessage } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Alert } from '../components/ui.jsx';

const CITIES = ['Toshkent', 'Samarqand', 'Andijon', 'Buxoro', "Farg'ona", 'Namangan', 'Xorazm', 'Qarshi', 'Nukus', 'Jizzax'];

export default function Register() {
  const { t, i18n } = useTranslation();
  const { register, isAuthed, user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
    role: params.get('role') === 'seller' ? 'seller' : 'customer',
    city: 'Toshkent',
    business_name: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthed && user) navigate(user.role === 'seller' ? '/seller' : '/', { replace: true });
  }, [isAuthed, user, navigate]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    if (form.password.length < 6) {
      setError(t('auth.requiredFields'));
      return;
    }
    setBusy(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: form.role,
        city: form.city,
        business_name: form.business_name,
        language: i18n.language,
        theme,
      });
      toast.success(t('auth.registered'));
      navigate(form.role === 'seller' ? '/seller' : '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <div className="soft-lg p-6 sm:p-8">
        <h1 className="text-2xl font-black">{t('auth.registerTitle')}</h1>
        <p className="mt-1.5 text-sm text-muted">{t('app.tagline')}</p>

        {/* role switch */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            { value: 'customer', icon: User, label: t('auth.roleCustomer'), hint: t('auth.customerHint') },
            { value: 'seller', icon: Store, label: t('auth.roleSeller'), hint: t('auth.sellerHint') },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => set('role', option.value)}
              className="rounded-2xl p-4 text-left transition"
              style={{
                boxShadow:
                  form.role === option.value
                    ? 'inset 3px 3px 7px var(--sd), inset -3px -3px 7px var(--sl), 0 0 0 2px var(--accent-glow)'
                    : 'inset 2px 2px 5px var(--sd), inset -2px -2px 5px var(--sl)',
                color: form.role === option.value ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              <div className="flex items-center gap-2">
                <option.icon size={18} />
                <span className="text-sm font-bold">{option.label}</span>
                {form.role === option.value && <Check size={14} className="ml-auto" />}
              </div>
              <p className="mt-2 text-[11px] leading-snug text-muted">{option.hint}</p>
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-5">
            <Alert type="error">{error}</Alert>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="soft-label">{t('auth.name')} *</label>
            <input required value={form.name} onChange={(e) => set('name', e.target.value)} className="soft-input" placeholder="Dilnoza Karimova" />
          </div>

          {form.role === 'seller' && (
            <div>
              <label className="soft-label">{t('auth.businessName')} *</label>
              <input
                required
                value={form.business_name}
                onChange={(e) => set('business_name', e.target.value)}
                className="soft-input"
                placeholder="Toshkent Event Service"
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="soft-label">{t('auth.email')} *</label>
              <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="soft-input" placeholder="you@example.com" />
            </div>
            <div>
              <label className="soft-label">{t('auth.phone')}</label>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="soft-input" placeholder="+998 90 123 45 67" />
            </div>
          </div>

          <div>
            <label className="soft-label">{t('common.city')}</label>
            <select value={form.city} onChange={(e) => set('city', e.target.value)} className="soft-input">
              {CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="soft-label">{t('auth.password')} *</label>
              <input
                required
                type="password"
                minLength={6}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                className="soft-input"
                placeholder="••••••"
              />
            </div>
            <div>
              <label className="soft-label">{t('auth.confirmPassword')} *</label>
              <input
                required
                type="password"
                value={form.confirm}
                onChange={(e) => set('confirm', e.target.value)}
                className="soft-input"
                placeholder="••••••"
              />
            </div>
          </div>

          <button type="submit" disabled={busy} className="soft-btn-primary w-full">
            <UserPlus size={17} /> {busy ? t('auth.submitting') : t('auth.createAccount')}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="link-soft">{t('auth.login')}</Link>
        </p>
      </div>
    </div>
  );
}
