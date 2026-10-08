import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Wallet, TrendingUp, Crown, CreditCard, Sparkles, Coins, Percent } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

import { api, errorMessage } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { Loader, StatCard, StatusBadge } from '../components/ui.jsx';
import { money, compactNumber, formatDate } from '../lib/format.js';

const STATUS_COLORS = ['#6366f1', '#8b5cf6', '#0ea5e9', '#f59e0b', '#16a34a', '#ec4899', '#e5484d', '#64748b'];

export default function SellerEarnings() {
  const { t, i18n } = useTranslation();
  const { seller } = useAuth();
  const toast = useToast();
  const { isDark } = useTheme();
  const [data, setData] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = () => {
    Promise.all([api.get('/analytics/seller'), api.get('/sellers/me')])
      .then(([stats, profile]) => {
        setData(stats);
        setMe(profile);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const payout = async () => {
    setBusy(true);
    try {
      const res = await api.post('/sellers/me/payout', { amount: me.seller.balance });
      toast.success(`${t('seller.payoutDone')}: ${money(res.amount)}`);
      load();
    } catch (error) {
      toast.error(errorMessage(error, t));
    } finally {
      setBusy(false);
    }
  };

  const subscribe = async () => {
    setBusy(true);
    try {
      await api.post('/sellers/me/premium');
      toast.success(t('seller.subscribed'));
      load();
    } catch (error) {
      toast.error(errorMessage(error, t));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader />;
  if (!data) return <div className="mx-auto max-w-2xl px-4 py-16"><p>{t('errors.somethingWrong')}</p></div>;

  const gridColor = isDark ? '#2a3140' : '#dfe5ef';
  const axisColor = isDark ? '#98a2b8' : '#6a7490';
  const summary = data.summary || {};
  const statusData = (data.statusBreakdown || []).map((item) => ({
    name: t(`status.${item.status}`),
    value: item.count,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t('seller.earningsTitle')}</h1>
          <p className="mt-1 text-sm text-muted">{t('seller.dashboard')}</p>
        </div>
        <Link to="/seller" className="soft-btn !py-2.5 !text-xs">{t('seller.dashboard')}</Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={TrendingUp} label={t('seller.gross')} value={money(summary.gross || 0, { compact: true })} />
        <StatCard icon={Wallet} label={t('seller.net')} value={money(summary.net_earnings || 0, { compact: true })} accent="var(--ok)" />
        <StatCard
          icon={Coins}
          label={t('seller.balance')}
          value={money(me?.seller?.balance || 0, { compact: true })}
          accent="var(--accent-2)"
        />
        <StatCard
          icon={Percent}
          label={t('seller.commission')}
          value={money(summary.commission_paid || 0, { compact: true })}
          accent="var(--danger)"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* chart */}
        <section className="soft p-5">
          <h2 className="mb-4 text-sm font-extrabold">{t('seller.monthlyChart')}</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.months || []}>
                <defs>
                  <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isDark ? '#7c83ff' : '#5b62f4'} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={isDark ? '#7c83ff' : '#5b62f4'} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="label" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
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
                <Area type="monotone" dataKey="net" stroke={isDark ? '#7c83ff' : '#5b62f4'} strokeWidth={3} fill="url(#netGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* balance + premium */}
        <div className="space-y-5">
          <section className="soft p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold">
              <Wallet size={16} style={{ color: 'var(--accent)' }} /> {t('seller.payout')}
            </h2>
            <p className="text-3xl font-black" style={{ color: 'var(--accent)' }}>{money(me?.seller?.balance || 0)}</p>
            <p className="mt-1 text-xs text-muted">{t('seller.net')}</p>
            <button
              onClick={payout}
              disabled={busy || !me?.seller?.balance}
              className="soft-btn-primary mt-4 w-full disabled:opacity-50"
            >
              <CreditCard size={16} /> {t('seller.payout')}
            </button>
            {!me?.seller?.balance && <p className="mt-2 text-center text-[11px] text-muted">{t('seller.noBalance')}</p>}
          </section>

          <section className="soft p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold">
              <Crown size={16} style={{ color: 'var(--warn)' }} /> {t('seller.premium')}
            </h2>
            <p className="text-sm text-muted">{t('seller.premiumDesc')}</p>
            {me?.seller?.is_premium ? (
              <p className="mt-4 text-center text-sm font-bold" style={{ color: 'var(--warn)' }}>
                {t('seller.subscribed')} · {formatDate(me.seller.premium_until, i18n.language, { short: true })}
              </p>
            ) : (
              <button onClick={subscribe} disabled={busy} className="soft-btn-primary mt-4 w-full">
                <Sparkles size={16} /> {t('seller.subscribe')} · 299 000 so'm
              </button>
            )}
          </section>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        {/* status breakdown */}
        <section className="soft p-5">
          <h2 className="mb-4 text-sm font-extrabold">{t('seller.statusBreakdown')}</h2>
          <div className="h-64">
            {statusData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                    {statusData.map((entry, index) => (
                      <Cell key={index} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
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
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-sm text-muted">{t('admin.noData')}</p>
            )}
          </div>
        </section>

        {/* top products */}
        <section className="soft p-5">
          <h2 className="mb-4 text-sm font-extrabold">{t('seller.topProducts')}</h2>
          <div className="space-y-2.5">
            {(data.topProducts || []).length === 0 ? (
              <p className="text-sm text-muted">{t('admin.noData')}</p>
            ) : (
              data.topProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  className="soft-flat flex items-center gap-3 rounded-2xl p-3 transition hover:text-accent"
                  style={{ textDecoration: 'none' }}
                >
                  <div className="h-12 w-14 shrink-0 overflow-hidden rounded-xl bg-surface2">
                    {product.image && <img src={product.image} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">{product.name}</p>
                    <p className="text-[11px] text-muted">{product.orders} {t('seller.statOrders').toLowerCase()} · {product.units} {t('seller.sold').toLowerCase()}</p>
                  </div>
                  <span className="text-xs font-black">{money(product.revenue, { compact: true })}</span>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      {/* payouts */}
      <section className="soft mt-5 p-5">
        <h2 className="mb-4 text-sm font-extrabold">{t('seller.payouts')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="pb-3 font-semibold">{t('common.date')}</th>
                <th className="pb-3 font-semibold">{t('admin.payments')}</th>
                <th className="pb-3 font-semibold">{t('common.status')}</th>
                <th className="pb-3 text-right font-semibold">{t('common.price')}</th>
              </tr>
            </thead>
            <tbody>
              {(data.payouts || []).map((payment) => (
                <tr key={payment.id} className="border-t border-line/60">
                  <td className="py-3 text-xs text-muted">{formatDate(payment.created_at, i18n.language, { short: true })}</td>
                  <td className="py-3 text-xs font-semibold">{payment.type}</td>
                  <td className="py-3"><StatusBadge status={payment.status === 'paid' ? 'completed' : 'pending'} size="sm" /></td>
                  <td className="py-3 text-right text-xs font-black">{money(payment.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
