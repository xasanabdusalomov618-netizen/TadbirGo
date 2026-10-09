import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package, Wallet, TrendingUp, Star, Eye, Plus, ClipboardList, Crown, Check, X, ChevronRight, Sparkles,
  Pencil, PauseCircle, PlayCircle, Trash2, Zap,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';

import { api, errorMessage } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { Loader, StatCard, StatusBadge, EmptyState, Rating } from '../components/ui.jsx';
import { money, compactNumber, formatDate } from '../lib/format.js';

export default function SellerDashboard() {
  const { t, i18n } = useTranslation();
  const { user, seller } = useAuth();
  const toast = useToast();
  const { isDark } = useTheme();
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    Promise.all([
      api.get('/sellers/me'),
      api.get('/analytics/seller'),
      api.get('/bookings/seller'),
      api.get('/sellers/me/products'),
    ])
      .then(([me, stats, orderList, productList]) => {
        setData(me);
        setAnalytics(stats);
        setOrders(orderList.items || []);
        setProducts(productList.items || []);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const act = async (booking, status, extra = {}) => {
    setBusyId(booking.id);
    try {
      await api.patch(`/bookings/${booking.id}/status`, { status, ...extra });
      toast.success(t(`status.${status}`));
      load();
    } catch (error) {
      toast.error(errorMessage(error, t));
    } finally {
      setBusyId(null);
    }
  };

  const act2 = async (product, action) => {
    setBusyId(product.id);
    try {
      if (action === 'toggle') {
        await api.patch(`/products/${product.id}/status`, { is_active: !product.is_active });
        toast.success(product.is_active ? t('seller.pause') : t('seller.publish'));
      } else if (action === 'feature') {
        await api.post(`/products/${product.id}/feature`);
        toast.success(t('seller.feature'));
      } else if (action === 'delete') {
        await api.del(`/products/${product.id}`);
        toast.success(t('common.delete'));
      }
      load();
    } catch (error) {
      toast.error(errorMessage(error, t));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loader />;
  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState icon={Package} title={t('errors.somethingWrong')} description={t('errors.serverError')} />
      </div>
    );
  }

  const { seller: profile, stats, monthly } = data;
  const pending = (analytics?.summary?.pending || stats.pending_orders || 0);
  const gridColor = isDark ? '#2a3140' : '#dfe5ef';
  const axisColor = isDark ? '#98a2b8' : '#6a7490';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* header */}
      <div className="soft-lg mb-6 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <img src={profile.logo_url} alt="" className="h-16 w-16 rounded-3xl object-cover" />
          <div>
            <p className="flex items-center gap-2 text-xl font-extrabold">
              {profile.business_name}
              {profile.is_premium && (
                <span className="soft-badge" style={{ background: 'color-mix(in srgb, var(--warn) 18%, transparent)', color: 'var(--warn)' }}>
                  <Crown size={11} /> {t('common.premium')}
                </span>
              )}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
              <Rating value={profile.rating} count={profile.review_count} size={12} />
              <span className="flex items-center gap-1"><Eye size={12} /> {profile.city}</span>
              <span>{t('seller.commission')}: {Math.round((profile.commission_rate || 0.12) * 100)}%</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/seller/products/new" className="soft-btn-primary !py-2.5 !text-xs">
            <Plus size={15} /> {t('seller.addProduct')}
          </Link>
          <Link to="/seller/orders" className="soft-btn !py-2.5 !text-xs">
            <ClipboardList size={15} /> {t('seller.orders')}
          </Link>
          <Link to="/seller/earnings" className="soft-btn !py-2.5 !text-xs">
            <Wallet size={15} /> {t('seller.earnings')}
          </Link>
        </div>
      </div>

      {/* stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={ClipboardList}
          label={t('seller.statOrders')}
          value={stats.total_orders || 0}
          hint={`${stats.pending_orders || 0} ${t('seller.statPending').toLowerCase()}`}
        />
        <StatCard
          icon={TrendingUp}
          label={t('seller.statRevenue')}
          value={money(stats.gross_revenue || 0, { compact: true })}
          accent="var(--accent-2)"
        />
        <StatCard
          icon={Wallet}
          label={t('seller.statEarnings')}
          value={money(stats.net_earnings || 0, { compact: true })}
          accent="var(--ok)"
          hint={`${t('seller.balance')}: ${money(profile.balance || 0, { compact: true })}`}
        />
        <StatCard icon={Star} label={t('seller.statRating')} value={Number(profile.rating || 0).toFixed(1)} accent="var(--warn)" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* chart */}
        <section className="soft p-5">
          <h2 className="mb-4 text-sm font-extrabold">{t('seller.monthlyChart')}</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="month" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => compactNumber(v)} />
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
                <Bar dataKey="net" radius={[8, 8, 0, 0]}>
                  {(monthly || []).map((entry, index) => (
                    <Cell key={index} fill={index === monthly.length - 1 ? 'var(--accent)' : 'var(--accent-2)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* premium */}
        <section className="soft p-5" style={{ border: profile.is_premium ? '1px solid var(--warn)' : undefined }}>
          <div className="flex items-center gap-2">
            <Crown size={18} style={{ color: 'var(--warn)' }} />
            <h2 className="text-sm font-extrabold">{t('seller.premiumBenefits')}</h2>
          </div>
          <ul className="mt-4 space-y-2.5">
            {['premiumBenefit1', 'premiumBenefit2', 'premiumBenefit3', 'premiumBenefit4'].map((key) => (
              <li key={key} className="flex items-start gap-2.5 text-xs text-muted">
                <Check size={14} style={{ color: 'var(--ok)' }} className="mt-0.5 shrink-0" />
                {t(`seller.${key}`)}
              </li>
            ))}
          </ul>
          <div className="soft-divider my-4" />
          {profile.is_premium ? (
            <p className="text-center text-sm font-bold" style={{ color: 'var(--warn)' }}>
              {t('seller.subscribed')} · {formatDate(profile.premium_until, i18n.language, { short: true })}
            </p>
          ) : (
            <Link to="/seller/earnings" className="soft-btn-primary w-full">
              <Sparkles size={16} /> {t('seller.subscribe')}
            </Link>
          )}
        </section>
      </div>

      {/* my listings */}
      <section className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">{t('seller.productsTitle')} ({products.length})</h2>
          <Link to="/seller/products/new" className="soft-btn !py-2 !text-[11px]">
            <Plus size={14} /> {t('seller.addProduct')}
          </Link>
        </div>

        {products.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t('seller.emptyProducts')}
            action={
              <Link to="/seller/products/new" className="soft-btn-primary mt-3">
                <Plus size={15} /> {t('seller.emptyProductsCta')}
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <div key={product.id} className="soft flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-16 shrink-0 overflow-hidden rounded-xl bg-surface2">
                    {product.image ? (
                      <img src={product.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-white" style={{ background: 'var(--accent)' }}>
                        <Package size={16} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link to={`/products/${product.id}`} className="line-clamp-1 text-sm font-bold hover:text-accent" style={{ textDecoration: 'none' }}>
                      {product.name}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-muted">{product.category_name} · {money(product.price)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span
                    className="soft-badge"
                    style={{
                      background: product.is_active ? 'color-mix(in srgb, var(--ok) 16%, transparent)' : 'color-mix(in srgb, var(--muted) 16%, transparent)',
                      color: product.is_active ? 'var(--ok)' : 'var(--muted)',
                    }}
                  >
                    {product.is_active ? t('common.available') : t('seller.pause')}
                  </span>
                  {product.featured && (
                    <span className="soft-badge" style={{ background: 'color-mix(in srgb, var(--warn) 18%, transparent)', color: 'var(--warn)' }}>
                      <Zap size={10} /> TOP
                    </span>
                  )}
                  <span className="soft-badge" style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>
                    <Eye size={10} /> {product.views}
                  </span>
                </div>

                <div className="mt-auto flex flex-wrap gap-1.5">
                  <Link to={`/seller/products/${product.id}/edit`} className="soft-btn !px-2.5 !py-1.5 !text-[10px]">
                    <Pencil size={11} /> {t('seller.editProduct')}
                  </Link>
                  <button
                    onClick={() => act2(product, 'toggle')}
                    className="soft-btn !px-2.5 !py-1.5 !text-[10px]"
                  >
                    {product.is_active ? <><PauseCircle size={11} /> {t('seller.pause')}</> : <><PlayCircle size={11} /> {t('seller.publish')}</>}
                  </button>
                  <button
                    onClick={() => act2(product, 'feature')}
                    className="soft-btn !px-2.5 !py-1.5 !text-[10px]"
                    style={{ color: 'var(--warn)' }}
                  >
                    <Zap size={11} /> {t('seller.feature')}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(t('seller.deleteConfirm'))) act2(product, 'delete');
                    }}
                    className="soft-btn-danger !px-2.5 !py-1.5 !text-[10px]"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* recent orders */}
      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{t('seller.recentOrders')}</h2>
          <Link to="/seller/orders" className="soft-btn-ghost !px-0">
            {t('common.viewAll')} <ChevronRight size={15} />
          </Link>
        </div>

        {orders.length === 0 ? (
          <EmptyState icon={ClipboardList} title={t('seller.emptyOrders')} />
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 5).map((booking) => (
              <div key={booking.id} className="soft flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black">{booking.code}</span>
                    <StatusBadge status={booking.status} size="sm" />
                  </div>
                  <p className="mt-1.5 truncate text-xs text-muted">
                    {booking.customer_name} · {booking.city} · {booking.items?.length || 0} {t('bookings.items').toLowerCase()}
                  </p>
                  <p className="text-[11px] text-muted">{booking.event_date ? formatDate(booking.event_date, i18n.language, { short: true }) : '—'}</p>
                </div>
                <span className="text-sm font-black">{money(booking.total)}</span>
                {['yangi', 'pending'].includes(booking.status) && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => act(booking, 'confirmed')}
                      disabled={busyId === booking.id}
                      className="soft-btn !px-3 !py-2 !text-[11px]"
                      style={{ color: 'var(--ok)' }}
                    >
                      <Check size={13} /> {t('seller.accept')}
                    </button>
                    <button
                      onClick={() => act(booking, 'cancelled', { cancel_reason: t('seller.reject') })}
                      disabled={busyId === booking.id}
                      className="soft-btn-danger !px-3 !py-2 !text-[11px]"
                    >
                      <X size={13} /> {t('seller.reject')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
