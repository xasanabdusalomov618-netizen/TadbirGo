import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User, Bell, Package, Sparkles, Settings, Save, Moon, Sun, Languages, Shield, Check, ChevronRight,
  Store, Mail, Phone, MapPin, CalendarDays,
} from 'lucide-react';

import { api, errorMessage } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { LANGUAGES, setLanguage } from '../i18n/index.js';
import { Loader, EmptyState, StatusBadge, Rating } from '../components/ui.jsx';
import { money, initials, localizePayload, timeAgo, formatDate } from '../lib/format.js';

const TABS = [
  { key: 'profile', label: 'profile.personal', icon: User },
  { key: 'bookings', label: 'profile.myBookings', icon: Package },
  { key: 'packages', label: 'profile.myPackages', icon: Sparkles },
  { key: 'notifications', label: 'profile.notifications', icon: Bell },
  { key: 'settings', label: 'profile.settings', icon: Settings },
];

const CITIES = ['Toshkent', 'Samarqand', 'Andijon', 'Buxoro', "Farg'ona", 'Namangan', 'Xorazm', 'Qarshi', 'Nukus', 'Jizzax'];

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { user, seller, setUnread, patchUser, refresh } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();

  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({ name: '', phone: '', city: '', avatar_url: '' });
  const [sellerForm, setSellerForm] = useState({ description: '', address: '', telegram: '', response_hours: 2 });
  const [passwords, setPasswords] = useState({ current: '', next: '' });
  const [bookings, setBookings] = useState([]);
  const [packages, setPackages] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({ name: user.name || '', phone: user.phone || '', city: user.city || 'Toshkent', avatar_url: user.avatar_url || '' });
    Promise.all([api.get('/bookings/my'), api.get('/packages'), api.get('/notifications')])
      .then(([myBookings, myPackages, myNotes]) => {
        setBookings(myBookings.items || []);
        setPackages(myPackages.items || []);
        setNotes(myNotes.items || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    if (seller) {
      setSellerForm({
        description: seller.description || '',
        address: seller.address || '',
        telegram: seller.telegram || '',
        response_hours: seller.response_hours || 2,
      });
    }
  }, [user, seller]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const data = await api.patch('/auth/me', form);
      patchUser({ ...data.user });
      toast.success(t('profile.saved'));
    } catch (error) {
      toast.error(errorMessage(error, t));
    } finally {
      setSaving(false);
    }
  };

  const saveSeller = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.patch('/sellers/me', sellerForm);
      await refresh();
      toast.success(t('profile.saved'));
    } catch (error) {
      toast.error(errorMessage(error, t));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (passwords.next.length < 6) {
      toast.error(t('auth.requiredFields'));
      return;
    }
    setSaving(true);
    try {
      await api.post('/auth/password', { current_password: passwords.current, new_password: passwords.next });
      setPasswords({ current: '', next: '' });
      toast.success(t('auth.passwordUpdated'));
    } catch (error) {
      toast.error(errorMessage(error, t) === t('errors.somethingWrong') ? t('auth.wrongPassword') : errorMessage(error, t));
    } finally {
      setSaving(false);
    }
  };

  const readAll = async () => {
    await api.patch('/notifications/read-all');
    setNotes(notes.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  };

  if (loading) return <Loader />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* header */}
      <div className="soft-lg mb-6 flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <div
          className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl text-2xl font-black text-white"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
        >
          {user.avatar_url ? <img src={user.avatar_url} alt="" className="h-20 w-20 object-cover" /> : initials(user.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-black">{user.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1"><Mail size={12} /> {user.email}</span>
            {user.phone && <span className="flex items-center gap-1"><Phone size={12} /> {user.phone}</span>}
            <span className="flex items-center gap-1"><CalendarDays size={12} /> {t('profile.memberSince')}: {formatDate(user.created_at, i18n.language, { short: true })}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="soft-badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              {user.role === 'admin' ? t('nav.admin') : user.role === 'seller' ? t('auth.roleSeller') : t('auth.roleCustomer')}
            </span>
            {seller && (
              <span className="soft-badge" style={{ background: 'color-mix(in srgb, var(--warn) 16%, transparent)', color: 'var(--warn)' }}>
                <Store size={11} /> {seller.business_name}
              </span>
            )}
            {user.role === 'seller' && (
              <Link to="/seller" className="soft-chip !py-1 !text-[11px]">
                {t('nav.dashboard')} <ChevronRight size={12} />
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        {/* tabs */}
        <aside className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
          {TABS.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex shrink-0 items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-bold transition lg:w-full ${
                tab === item.key ? 'text-accent' : 'text-muted hover:text-ink'
              }`}
              style={tab === item.key ? { boxShadow: 'inset 3px 3px 7px var(--sd), inset -3px -3px 7px var(--sl)' } : undefined}
            >
              <item.icon size={16} /> {t(item.label)}
              {item.key === 'notifications' && notes.filter((n) => !n.is_read).length > 0 && (
                <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: 'var(--danger)' }}>
                  {notes.filter((n) => !n.is_read).length}
                </span>
              )}
            </button>
          ))}
        </aside>

        <section>
          {/* profile */}
          {tab === 'profile' && (
            <div className="space-y-5">
              <form onSubmit={saveProfile} className="soft space-y-4 p-5">
                <h2 className="text-sm font-extrabold">{t('profile.personal')}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="soft-label">{t('auth.name')}</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="soft-input" />
                  </div>
                  <div>
                    <label className="soft-label">{t('auth.phone')}</label>
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="soft-input" />
                  </div>
                  <div>
                    <label className="soft-label">{t('common.city')}</label>
                    <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="soft-input">
                      {CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="soft-label">{t('auth.avatar')} URL</label>
                    <input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} className="soft-input" placeholder="/media/products/logo-1.svg" />
                  </div>
                </div>
                <button type="submit" disabled={saving} className="soft-btn-primary !py-2.5 !text-xs">
                  <Save size={15} /> {t('common.save')}
                </button>
              </form>

              {seller && (
                <form onSubmit={saveSeller} className="soft space-y-4 p-5">
                  <h2 className="text-sm font-extrabold">{t('profile.sellerProfile')}</h2>
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <Rating value={seller.rating} count={seller.review_count} />
                    <span className="text-xs text-muted">{seller.slug}</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="soft-label">{t('common.description')}</label>
                      <textarea rows={3} value={sellerForm.description} onChange={(e) => setSellerForm({ ...sellerForm, description: e.target.value })} className="soft-input resize-none" />
                    </div>
                    <div>
                      <label className="soft-label">{t('common.address')}</label>
                      <input value={sellerForm.address} onChange={(e) => setSellerForm({ ...sellerForm, address: e.target.value })} className="soft-input" />
                    </div>
                    <div>
                      <label className="soft-label">{t('common.telegram')}</label>
                      <input value={sellerForm.telegram} onChange={(e) => setSellerForm({ ...sellerForm, telegram: e.target.value })} className="soft-input" placeholder="@username" />
                    </div>
                  </div>
                  <button type="submit" disabled={saving} className="soft-btn-primary !py-2.5 !text-xs">
                    <Save size={15} /> {t('common.save')}
                  </button>
                </form>
              )}

              <form onSubmit={changePassword} className="soft space-y-4 p-5">
                <h2 className="flex items-center gap-2 text-sm font-extrabold">
                  <Shield size={15} /> {t('auth.security')}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="soft-label">{t('auth.currentPassword')}</label>
                    <input type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} className="soft-input" />
                  </div>
                  <div>
                    <label className="soft-label">{t('auth.newPassword')}</label>
                    <input type="password" value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} className="soft-input" />
                  </div>
                </div>
                <button type="submit" disabled={saving} className="soft-btn !py-2.5 !text-xs">{t('common.save')}</button>
              </form>
            </div>
          )}

          {/* bookings */}
          {tab === 'bookings' && (
            <div className="space-y-3">
              {bookings.length === 0 ? (
                <EmptyState icon={Package} title={t('bookings.empty')} action={<Link to="/explore" className="soft-btn-primary mt-3">{t('bookings.emptyCta')}</Link>} />
              ) : (
                bookings.slice(0, 12).map((booking) => (
                  <Link key={booking.id} to={`/bookings/${booking.id}`} className="soft flex items-center gap-4 p-4" style={{ textDecoration: 'none' }}>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black">{booking.code}</span>
                        <StatusBadge status={booking.status} size="sm" />
                      </div>
                      <p className="mt-1 truncate text-xs text-muted">{booking.seller.name}</p>
                    </div>
                    <span className="text-sm font-black">{money(booking.total)}</span>
                    <ChevronRight size={16} className="text-muted" />
                  </Link>
                ))
              )}
            </div>
          )}

          {/* packages */}
          {tab === 'packages' && (
            <div className="space-y-3">
              {packages.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title={t('package.noSaved')}
                  action={<Link to="/package-builder" className="soft-btn-primary mt-3">{t('package.title')}</Link>}
                />
              ) : (
                packages.map((pkg) => (
                  <div key={pkg.id} className="soft p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold">{pkg.name || t('package.title')}</p>
                      <span className="text-sm font-black" style={{ color: 'var(--accent)' }}>{money(pkg.estimate_total)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {pkg.guests} {t('common.guests')} · {pkg.city} · {pkg.items?.length || 0} {t('package.itemsCount')}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* notifications */}
          {tab === 'notifications' && (
            <div className="space-y-3">
              {notes.length > 0 && (
                <div className="flex justify-end">
                  <button onClick={readAll} className="soft-btn !py-2 !text-[11px]">
                    <Check size={13} /> {t('profile.markAllRead')}
                  </button>
                </div>
              )}
              {notes.length === 0 ? (
                <EmptyState icon={Bell} title={t('profile.emptyNotifications')} />
              ) : (
                notes.map((note) => {
                  const payload = localizePayload(note, i18n.language);
                  return (
                    <Link
                      key={note.id}
                      to={note.link || '#'}
                      className="soft flex gap-3 p-4"
                      style={{ textDecoration: 'none', opacity: note.is_read ? 0.65 : 1 }}
                    >
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: note.is_read ? 'var(--line)' : 'var(--accent)' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">{payload.title}</p>
                        <p className="mt-0.5 text-xs text-muted">{payload.body}</p>
                        <p className="mt-1.5 text-[10px] text-muted">{timeAgo(note.created_at, i18n.language)}</p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          )}

          {/* settings */}
          {tab === 'settings' && (
            <div className="space-y-5">
              <div className="soft p-5">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold">
                  <Languages size={15} /> {t('auth.languageHint')}
                </h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        api.patch('/auth/me', { language: lang.code }).catch(() => {});
                      }}
                      className="rounded-2xl p-4 text-center transition"
                      style={{
                        boxShadow:
                          i18n.language === lang.code
                            ? 'inset 3px 3px 7px var(--sd), inset -3px -3px 7px var(--sl), 0 0 0 2px var(--accent-glow)'
                            : 'inset 2px 2px 5px var(--sd), inset -2px -2px 5px var(--sl)',
                        color: i18n.language === lang.code ? 'var(--accent)' : 'var(--muted)',
                      }}
                    >
                      <span className="text-2xl">{lang.flag}</span>
                      <p className="mt-2 text-xs font-bold">{lang.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="soft p-5">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold">
                  {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />} {t('auth.themeHint')}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { value: 'light', label: t('nav.light'), icon: Sun },
                    { value: 'dark', label: t('nav.dark'), icon: Moon },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setTheme(option.value);
                        api.patch('/auth/me', { theme: option.value }).catch(() => {});
                      }}
                      className="flex items-center gap-3 rounded-2xl p-4 transition"
                      style={{
                        boxShadow:
                          theme === option.value
                            ? 'inset 3px 3px 7px var(--sd), inset -3px -3px 7px var(--sl), 0 0 0 2px var(--accent-glow)'
                            : 'inset 2px 2px 5px var(--sd), inset -2px -2px 5px var(--sl)',
                        color: theme === option.value ? 'var(--accent)' : 'var(--muted)',
                      }}
                    >
                      <option.icon size={18} />
                      <span className="text-sm font-bold">{option.label}</span>
                      {theme === option.value && <Check size={15} className="ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
