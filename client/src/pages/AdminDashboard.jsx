import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users, Store, ShoppingBag, DollarSign, Package, Percent, ShieldCheck, ShieldOff, Trash2,
  Check, Plus, Megaphone, CreditCard, LayoutGrid, TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts';

import { api, errorMessage } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { Loader, StatCard, StatusBadge, EmptyState, Modal } from '../components/ui.jsx';
import { money, compactNumber, formatDate, localize } from '../lib/format.js';

const TABS = [
  { key: 'overview', label: 'admin.title', icon: TrendingUp },
  { key: 'users', label: 'admin.users', icon: Users },
  { key: 'sellers', label: 'admin.sellers', icon: Store },
  { key: 'products', label: 'admin.products', icon: Package },
  { key: 'bookings', label: 'admin.bookings', icon: ShoppingBag },
  { key: 'categories', label: 'admin.categories', icon: LayoutGrid },
  { key: 'ads', label: 'admin.advertising', icon: Megaphone },
  { key: 'payments', label: 'admin.payments', icon: CreditCard },
];

const COLORS = ['#6366f1', '#8b5cf6', '#0ea5e9', '#f59e0b', '#16a34a', '#ec4899', '#e5484d', '#64748b'];

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { isDark } = useTheme();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [products, setProducts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [ads, setAds] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userQuery, setUserQuery] = useState('');
  const [adForm, setAdForm] = useState({ title: '', image_url: '', link: '', placement: 'home', budget: 1000000 });
  const [adOpen, setAdOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const gridColor = isDark ? '#2a3140' : '#dfe5ef';
  const axisColor = isDark ? '#98a2b8' : '#6a7490';

  const loadAll = () => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/users'),
      api.get('/admin/sellers'),
      api.get('/admin/products'),
      api.get('/admin/bookings'),
      api.get('/categories/with-counts'),
      api.get('/admin/ads'),
      api.get('/admin/payments'),
    ])
      .then(([s, u, sel, p, b, c, a, pay]) => {
        setStats(s);
        setUsers(u.items || []);
        setSellers(sel.items || []);
        setProducts(p.items || []);
        setBookings(b.items || []);
        setCategories(c.items || []);
        setAds(a.items || []);
        setPayments(pay.items || []);
      })
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  };

  useEffect(loadAll, []);

  const act = async (promise, message) => {
    setBusy(true);
    try {
      await promise;
      toast.success(message || t('common.success'));
      loadAll();
    } catch (error) {
      toast.error(errorMessage(error, t));
    } finally {
      setBusy(false);
    }
  };

  const createAd = async (event) => {
    event.preventDefault();
    await act(api.post('/admin/ads', adForm), t('common.success'));
    setAdOpen(false);
    setAdForm({ title: '', image_url: '', link: '', placement: 'home', budget: 1000000 });
  };

  if (loading) return <Loader />;
  if (!stats) return <div className="p-10 text-center">{t('errors.somethingWrong')}</div>;

  const totals = stats.totals || {};
  const statusData = (stats.byStatus || []).map((item) => ({ name: t(`status.${item.status}`), value: item.count }));
  const filteredUsers = users.filter(
    (u) => !userQuery || u.name?.toLowerCase().includes(userQuery.toLowerCase()) || u.email?.toLowerCase().includes(userQuery.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t('admin.title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('app.tagline')}</p>
        </div>
        <span className="soft-chip !text-[11px]">
          <ShieldCheck size={13} style={{ color: 'var(--ok)' }} /> {totals.users || 0} {t('admin.statUsers').toLowerCase()}
        </span>
      </div>

      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {TABS.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition ${
              tab === item.key ? 'text-accent' : 'text-muted hover:text-ink'
            }`}
            style={tab === item.key ? { boxShadow: 'inset 3px 3px 7px var(--sd), inset -3px -3px 7px var(--sl)' } : undefined}
          >
            <item.icon size={14} /> {t(item.label)}
          </button>
        ))}
      </div>

      {/* overview */}
      {tab === 'overview' && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard icon={Users} label={t('admin.statUsers')} value={totals.users || 0} hint={`${totals.customers || 0} ${t('auth.roleCustomer').toLowerCase()}`} />
            <StatCard icon={Store} label={t('admin.statSellers')} value={totals.sellers || 0} accent="var(--accent-2)" hint={`${totals.pending_sellers || 0} ${t('admin.pendingSellers').toLowerCase()}`} />
            <StatCard icon={Package} label={t('admin.statListings')} value={totals.listings || 0} accent="#0ea5e9" />
            <StatCard icon={ShoppingBag} label={t('admin.statBookings')} value={totals.bookings || 0} accent="#8b5cf6" hint={`${totals.active_bookings || 0} ${t('status.yangi').toLowerCase()}`} />
            <StatCard icon={DollarSign} label={t('admin.statRevenue')} value={money(totals.revenue || 0, { compact: true })} accent="var(--ok)" />
            <StatCard icon={Percent} label={t('admin.statCommission')} value={money((totals.commission || 0) + (totals.extra_revenue || 0), { compact: true })} accent="var(--warn)" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
            <section className="soft p-5">
              <h2 className="mb-4 text-sm font-extrabold">{t('admin.monthlyRevenue')}</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.monthly || []}>
                    <defs>
                      <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isDark ? '#7c83ff' : '#5b62f4'} stopOpacity={0.55} />
                        <stop offset="100%" stopColor={isDark ? '#7c83ff' : '#5b62f4'} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="month" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => compactNumber(v)} />
                    <Tooltip
                      contentStyle={{
                        background: isDark ? '#1b1f2a' : '#eef1f7',
                        border: `1px solid ${gridColor}`,
                        borderRadius: 16,
                        fontSize: 12,
                      }}
                      formatter={(value) => money(value)}
                    />
                    <Area type="monotone" dataKey="revenue" stroke={isDark ? '#7c83ff' : '#5b62f4'} strokeWidth={3} fill="url(#revGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="soft p-5">
              <h2 className="mb-4 text-sm font-extrabold">{t('admin.byStatus')}</h2>
              <div className="h-72">
                {statusData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={2}>
                        {statusData.map((entry, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: isDark ? '#1b1f2a' : '#eef1f7',
                          border: `1px solid ${gridColor}`,
                          borderRadius: 16,
                          fontSize: 12,
                        }}
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-sm text-muted">{t('admin.noData')}</p>
                )}
              </div>
            </section>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="soft p-5">
              <h2 className="mb-4 text-sm font-extrabold">{t('admin.topCategories')}</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topCategories || []} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                    <XAxis type="number" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name_uz"
                      stroke={axisColor}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      width={90}
                    />
                    <Tooltip
                      cursor={{ fill: isDark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)' }}
                      contentStyle={{
                        background: isDark ? '#1b1f2a' : '#eef1f7',
                        border: `1px solid ${gridColor}`,
                        borderRadius: 16,
                        fontSize: 12,
                      }}
                      formatter={(value) => money(value)}
                    />
                    <Bar dataKey="revenue" radius={[0, 8, 8, 0]} fill="var(--accent)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="soft p-5">
              <h2 className="mb-4 text-sm font-extrabold">{t('admin.recentBookings')}</h2>
              <div className="space-y-2">
                {(stats.recentBookings || []).map((booking) => (
                  <div key={booking.id} className="soft-flat flex items-center gap-3 rounded-2xl p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">{booking.code}</p>
                      <p className="truncate text-[11px] text-muted">{booking.customer_name} → {booking.seller_name}</p>
                    </div>
                    <StatusBadge status={booking.status} size="sm" />
                    <span className="text-xs font-black">{money(booking.total, { compact: true })}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="soft mt-5 p-5">
            <h2 className="mb-4 text-sm font-extrabold">{t('admin.topSellers')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                    <th className="pb-3 font-semibold">{t('admin.sellers')}</th>
                    <th className="pb-3 font-semibold">{t('seller.statOrders')}</th>
                    <th className="pb-3 font-semibold">{t('seller.statRevenue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats.topSellers || []).map((seller) => (
                    <tr key={seller.id} className="border-t border-line/60">
                      <td className="py-3">
                        <span className="text-xs font-bold">{seller.business_name}</span>
                        {seller.is_premium && <span className="ml-2 text-[10px] font-bold" style={{ color: 'var(--warn)' }}>PREMIUM</span>}
                      </td>
                      <td className="py-3 text-xs text-muted">{seller.orders}</td>
                      <td className="py-3 text-xs font-black">{money(seller.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* users */}
      {tab === 'users' && (
        <section className="soft p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-extrabold">{t('admin.users')} ({users.length})</h2>
            <input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder={t('admin.searchUser')}
              className="soft-input !py-2.5 !text-xs sm:max-w-xs"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                  <th className="pb-3 font-semibold">{t('auth.name')}</th>
                  <th className="pb-3 font-semibold">{t('auth.email')}</th>
                  <th className="pb-3 font-semibold">{t('auth.role')}</th>
                  <th className="pb-3 font-semibold">{t('common.city')}</th>
                  <th className="pb-3 font-semibold">{t('common.created')}</th>
                  <th className="pb-3 text-right font-semibold">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((item) => (
                  <tr key={item.id} className="border-t border-line/60">
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 place-items-center rounded-xl bg-surface2 text-[11px] font-bold">
                          {(item.name || 'U').slice(0, 1)}
                        </span>
                        <span className="text-xs font-bold">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-xs text-muted">{item.email}</td>
                    <td className="py-3">
                      <select
                        value={item.role}
                        onChange={(e) => act(api.patch(`/admin/users/${item.id}`, { role: e.target.value }))}
                        className="soft-input !w-auto !px-2.5 !py-1.5 !text-[11px]"
                      >
                        <option value="customer">{t('auth.roleCustomer')}</option>
                        <option value="seller">{t('auth.roleSeller')}</option>
                        <option value="admin">{t('nav.admin')}</option>
                      </select>
                    </td>
                    <td className="py-3 text-xs text-muted">{item.city || '—'}</td>
                    <td className="py-3 text-xs text-muted">{formatDate(item.created_at, i18n.language, { short: true })}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => act(api.patch(`/admin/users/${item.id}`, { is_blocked: !item.is_blocked }))}
                        className="soft-btn !px-3 !py-1.5 !text-[11px]"
                        style={{ color: item.is_blocked ? 'var(--ok)' : 'var(--danger)' }}
                      >
                        {item.is_blocked ? <><ShieldCheck size={12} /> {t('admin.unblock')}</> : <><ShieldOff size={12} /> {t('admin.block')}</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* sellers */}
      {tab === 'sellers' && (
        <section className="soft p-5">
          <h2 className="mb-4 text-sm font-extrabold">
            {t('admin.sellers')} ({sellers.length}) · {t('admin.pendingSellers')}: {totals.pending_sellers || 0}
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {sellers.map((seller) => (
              <div key={seller.id} className="soft-flat rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <img src={seller.logo_url} alt="" className="h-12 w-12 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{seller.business_name}</p>
                    <p className="truncate text-[11px] text-muted">{seller.email} · {seller.city}</p>
                    <p className="mt-1 text-[11px] text-muted">
                      {seller.product_count} {t('admin.products').toLowerCase()} · {Math.round((seller.commission_rate || 0.12) * 100)}% {t('seller.commission').toLowerCase()}
                    </p>
                  </div>
                  <span
                    className="soft-badge"
                    style={{
                      background: seller.is_approved ? 'color-mix(in srgb, var(--ok) 16%, transparent)' : 'color-mix(in srgb, var(--warn) 16%, transparent)',
                      color: seller.is_approved ? 'var(--ok)' : 'var(--warn)',
                    }}
                  >
                    {seller.is_approved ? t('common.verified') : t('status.pending')}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => act(api.patch(`/admin/sellers/${seller.id}`, { is_approved: !seller.is_approved }))}
                    className="soft-btn !px-3 !py-1.5 !text-[11px]"
                    style={{ color: seller.is_approved ? 'var(--warn)' : 'var(--ok)' }}
                  >
                    {seller.is_approved ? t('admin.revoke') : t('admin.approve')}
                  </button>
                  <button
                    onClick={() => act(api.patch(`/admin/sellers/${seller.id}`, { is_premium: !seller.is_premium }))}
                    className="soft-btn !px-3 !py-1.5 !text-[11px]"
                  >
                    {seller.is_premium ? t('seller.subscribed') : t('seller.premium')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* products */}
      {tab === 'products' && (
        <section className="soft p-5">
          <h2 className="mb-4 text-sm font-extrabold">{t('admin.products')} ({products.length})</h2>
          <div className="space-y-2">
            {products.map((product) => (
              <div key={product.id} className="soft-flat flex flex-wrap items-center gap-3 rounded-2xl p-3">
                <div className="h-12 w-14 shrink-0 overflow-hidden rounded-xl bg-surface2">
                  {product.image && <img src={product.image} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{product.name}</p>
                  <p className="truncate text-[11px] text-muted">{product.seller_name} · {product.city} · {money(product.price)}</p>
                </div>
                <span
                  className="soft-badge"
                  style={{
                    background: product.is_approved ? 'color-mix(in srgb, var(--ok) 16%, transparent)' : 'color-mix(in srgb, var(--warn) 16%, transparent)',
                    color: product.is_approved ? 'var(--ok)' : 'var(--warn)',
                  }}
                >
                  {product.is_approved ? t('common.verified') : t('status.pending')}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => act(api.patch(`/admin/products/${product.id}`, { is_approved: !product.is_approved }))}
                    className="soft-btn !px-3 !py-1.5 !text-[11px]"
                  >
                    {product.is_approved ? t('admin.revoke') : t('admin.approve')}
                  </button>
                  <button
                    onClick={() => act(api.patch(`/admin/products/${product.id}`, { featured: !product.featured }))}
                    className="soft-btn !px-3 !py-1.5 !text-[11px]"
                  >
                    {product.featured ? 'TOP' : t('seller.feature')}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(t('admin.removeConfirm'))) act(api.del(`/admin/products/${product.id}`));
                    }}
                    className="soft-btn-danger !px-3 !py-1.5 !text-[11px]"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* bookings */}
      {tab === 'bookings' && (
        <section className="soft p-5">
          <h2 className="mb-4 text-sm font-extrabold">{t('admin.bookings')} ({bookings.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                  <th className="pb-3 font-semibold">{t('bookings.code')}</th>
                  <th className="pb-3 font-semibold">{t('bookings.customer')}</th>
                  <th className="pb-3 font-semibold">{t('bookings.seller')}</th>
                  <th className="pb-3 font-semibold">{t('common.status')}</th>
                  <th className="pb-3 text-right font-semibold">{t('common.total')}</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id} className="border-t border-line/60">
                    <td className="py-3">
                      <Link to={`/bookings/${booking.id}`} className="text-xs font-bold link-soft">{booking.code}</Link>
                    </td>
                    <td className="py-3 text-xs text-muted">{booking.customer_name}</td>
                    <td className="py-3 text-xs text-muted">{booking.seller_name}</td>
                    <td className="py-3"><StatusBadge status={booking.status} size="sm" /></td>
                    <td className="py-3 text-right text-xs font-black">{money(booking.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* categories */}
      {tab === 'categories' && (
        <section className="soft p-5">
          <h2 className="mb-4 text-sm font-extrabold">{t('admin.categories')} ({categories.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <div key={category.id} className="soft-flat flex items-center gap-3 rounded-2xl p-4">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"
                  style={{ background: `linear-gradient(135deg, ${category.accent}, ${category.accent}aa)` }}
                >
                  {localize(category, 'name', i18n.language).slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{localize(category, 'name', i18n.language)}</p>
                  <p className="text-[11px] text-muted">{category.slug} · {category.product_count}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* advertising */}
      {tab === 'ads' && (
        <section className="soft p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-extrabold">{t('admin.advertising')}</h2>
            <button onClick={() => setAdOpen(true)} className="soft-btn-primary !py-2 !text-[11px]">
              <Plus size={14} /> {t('admin.addAd')}
            </button>
          </div>
          <div className="space-y-2">
            {ads.length === 0 ? (
              <EmptyState icon={Megaphone} title={t('admin.noData')} />
            ) : (
              ads.map((ad) => (
                <div key={ad.id} className="soft-flat flex flex-wrap items-center gap-3 rounded-2xl p-3">
                  {ad.image_url && <img src={ad.image_url} alt="" className="h-12 w-16 rounded-xl object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">{ad.title}</p>
                    <p className="text-[11px] text-muted">{ad.placement} · {money(ad.budget)} · {ad.impressions} views · {ad.clicks} clicks</p>
                  </div>
                  <button onClick={() => act(api.del(`/admin/ads/${ad.id}`))} className="soft-btn-danger !px-3 !py-1.5 !text-[11px]">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* payments */}
      {tab === 'payments' && (
        <section className="soft p-5">
          <h2 className="mb-4 text-sm font-extrabold">{t('admin.ledger')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                  <th className="pb-3 font-semibold">{t('common.date')}</th>
                  <th className="pb-3 font-semibold">{t('admin.payments')}</th>
                  <th className="pb-3 font-semibold">{t('admin.sellers')}</th>
                  <th className="pb-3 font-semibold">{t('common.status')}</th>
                  <th className="pb-3 text-right font-semibold">{t('common.price')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-line/60">
                    <td className="py-3 text-xs text-muted">{formatDate(payment.created_at, i18n.language, { short: true })}</td>
                    <td className="py-3 text-xs font-semibold">{payment.type}</td>
                    <td className="py-3 text-xs text-muted">{payment.seller_name || '—'}</td>
                    <td className="py-3">
                      <StatusBadge status={payment.status === 'paid' ? 'completed' : 'pending'} size="sm" />
                    </td>
                    <td className="py-3 text-right text-xs font-black">{money(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ad modal */}
      <Modal open={adOpen} onClose={() => setAdOpen(false)} title={t('admin.addAd')}>
        <form onSubmit={createAd} className="space-y-4">
          <div>
            <label className="soft-label">{t('admin.adTitle')}</label>
            <input required value={adForm.title} onChange={(e) => setAdForm({ ...adForm, title: e.target.value })} className="soft-input" />
          </div>
          <div>
            <label className="soft-label">Image URL</label>
            <input value={adForm.image_url} onChange={(e) => setAdForm({ ...adForm, image_url: e.target.value })} className="soft-input" placeholder="/media/products/p07-1.svg" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="soft-label">{t('admin.adLink')}</label>
              <input value={adForm.link} onChange={(e) => setAdForm({ ...adForm, link: e.target.value })} className="soft-input" placeholder="/products/7" />
            </div>
            <div>
              <label className="soft-label">{t('admin.adPlacement')}</label>
              <select value={adForm.placement} onChange={(e) => setAdForm({ ...adForm, placement: e.target.value })} className="soft-input">
                <option value="home">home</option>
                <option value="explore">explore</option>
                <option value="sidebar">sidebar</option>
              </select>
            </div>
          </div>
          <div>
            <label className="soft-label">{t('admin.adBudget')}</label>
            <input type="number" value={adForm.budget} onChange={(e) => setAdForm({ ...adForm, budget: Number(e.target.value) })} className="soft-input" />
          </div>
          <button type="submit" disabled={busy} className="soft-btn-primary w-full">
            <Check size={16} /> {t('common.save')}
          </button>
        </form>
      </Modal>
    </div>
  );
}
