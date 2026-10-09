import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ClipboardList, Check, X, ChevronRight, ArrowRight, Phone, MapPin, CalendarDays, Users, Package,
} from 'lucide-react';

import { api, errorMessage } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Loader, EmptyState, StatusBadge, Chip, Modal } from '../components/ui.jsx';
import { money, formatDate, formatDateTime } from '../lib/format.js';

const FILTERS = ['all', 'yangi', 'pending', 'confirmed', 'preparing', 'delivering', 'installing', 'ongoing', 'completed', 'cancelled'];

const NEXT_STATUS = {
  yangi: 'confirmed',
  confirmed: 'preparing',
  preparing: 'delivering',
  delivering: 'installing',
  installing: 'ongoing',
  ongoing: 'completed',
};

export default function SellerOrders() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [status, setStatus] = useState('all');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get(`/bookings/seller${status === 'all' ? '' : `?status=${status}`}`)
      .then((res) => setOrders(res.items || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status]);

  const change = async (booking, newStatus, extra = {}) => {
    setBusy(true);
    try {
      await api.patch(`/bookings/${booking.id}/status`, { status: newStatus, ...extra });
      toast.success(t(`status.${newStatus}`));
      setActive(null);
      setRejectOpen(false);
      setReason('');
      load();
    } catch (error) {
      toast.error(errorMessage(error, t));
    } finally {
      setBusy(false);
    }
  };

  const counts = useMemo(() => {
    const map = {};
    orders.forEach((o) => (map[o.status] = (map[o.status] || 0) + 1));
    return map;
  }, [orders]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t('seller.ordersTitle')}</h1>
          <p className="mt-1 text-sm text-muted">{orders.length} {t('seller.statOrders').toLowerCase()}</p>
        </div>
        <Link to="/seller" className="soft-btn !py-2.5 !text-xs">{t('seller.dashboard')}</Link>
      </div>

      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {FILTERS.map((filter) => (
          <Chip key={filter} active={status === filter} onClick={() => setStatus(filter)}>
            {filter === 'all' ? t('bookings.filterAll') : t(`status.${filter}`)}
            {filter !== 'all' && counts[filter] ? <span className="ml-1 opacity-70">({counts[filter]})</span> : null}
          </Chip>
        ))}
      </div>

      {loading ? (
        <Loader />
      ) : orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title={t('seller.emptyOrders')} />
      ) : (
        <div className="space-y-3">
          {orders.map((booking) => (
            <div key={booking.id} className="soft p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black">{booking.code}</span>
                    <StatusBadge status={booking.status} size="sm" />
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {booking.customer?.name} · <a href={`tel:${booking.customer?.phone}`} className="hover:text-accent">{booking.customer?.phone}</a>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted">
                    <span className="flex items-center gap-1"><CalendarDays size={11} /> {booking.event_date ? formatDate(booking.event_date, i18n.language, { short: true }) : '—'}</span>
                    <span className="flex items-center gap-1"><MapPin size={11} /> {booking.city || '—'}</span>
                    <span className="flex items-center gap-1"><Users size={11} /> {booking.guests || 0}</span>
                    <span className="flex items-center gap-1"><Package size={11} /> {booking.items?.length || 0}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="text-lg font-black" style={{ color: 'var(--accent)' }}>{money(booking.total)}</span>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setActive(booking)} className="soft-btn !px-3 !py-2 !text-[11px]">
                      {t('bookings.view')} <ChevronRight size={12} />
                    </button>
                    {['yangi', 'pending'].includes(booking.status) && (
                      <>
                        <button
                          onClick={() => change(booking, 'confirmed')}
                          disabled={busy}
                          className="soft-btn !px-3 !py-2 !text-[11px]"
                          style={{ color: 'var(--ok)' }}
                        >
                          <Check size={13} /> {t('seller.accept')}
                        </button>
                        <button
                          onClick={() => {
                            setActive(booking);
                            setRejectOpen(true);
                          }}
                          className="soft-btn-danger !px-3 !py-2 !text-[11px]"
                        >
                          <X size={13} /> {t('seller.reject')}
                        </button>
                      </>
                    )}
                    {NEXT_STATUS[booking.status] && booking.status !== 'yangi' && booking.status !== 'pending' && (
                      <button
                        onClick={() => change(booking, NEXT_STATUS[booking.status])}
                        disabled={busy}
                        className="soft-btn-primary !px-3 !py-2 !text-[11px]"
                      >
                        {t('seller.advance')} <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* detail modal */}
      <Modal
        open={!!active && !rejectOpen}
        onClose={() => setActive(null)}
        title={`${t('seller.orderDetail')} · ${active?.code || ''}`}
        maxWidth="max-w-2xl"
        footer={
          active && NEXT_STATUS[active.status] ? (
            <>
              <button onClick={() => setActive(null)} className="soft-btn flex-1">{t('common.close')}</button>
              <button onClick={() => change(active, NEXT_STATUS[active.status])} className="soft-btn-primary flex-1">
                {t('status.' + NEXT_STATUS[active.status])} <ArrowRight size={14} />
              </button>
            </>
          ) : undefined
        }
      >
        {active && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusBadge status={active.status} />
              <span className="text-xs text-muted">{formatDateTime(active.created_at, i18n.language)}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field icon={Users} label={t('bookings.customer')} value={active.customer?.name} />
              <Field icon={Phone} label={t('common.phone')} value={active.customer?.phone} />
              <Field icon={CalendarDays} label={t('checkout.eventDate')} value={active.event_date ? formatDate(active.event_date, i18n.language) : '—'} />
              <Field icon={MapPin} label={t('common.address')} value={active.address || active.city || '—'} />
            </div>

            {active.notes && <p className="rounded-2xl bg-surface2 p-3 text-sm text-muted">{active.notes}</p>}

            <div>
              <p className="soft-label">{t('bookings.items')}</p>
              <div className="space-y-2">
                {active.items.map((item) => (
                  <div key={item.id} className="soft-flat flex items-center gap-3 rounded-2xl p-3">
                    <div className="h-12 w-14 shrink-0 overflow-hidden rounded-lg bg-surface2">
                      {item.image_url && <img src={item.image_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">{item.name}</p>
                      <p className="text-[11px] text-muted">{money(item.price)} × {item.quantity}</p>
                    </div>
                    <span className="text-xs font-black">{money(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="soft-inset space-y-1.5 p-4 text-sm">
              <Line label={t('common.subtotal')} value={money(active.subtotal)} />
              <Line label={t('cart.deliveryCost')} value={money(active.delivery_fee)} />
              <Line label={t('cart.installationCost')} value={money(active.installation_fee)} />
              <Line label={t('seller.commission')} value={`- ${money(active.commission)}`} />
              <div className="soft-divider my-2" />
              <Line label={t('common.total')} value={money(active.total)} bold />
            </div>
          </div>
        )}
      </Modal>

      {/* reject modal */}
      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={t('seller.reject')}
        footer={
          <>
            <button onClick={() => setRejectOpen(false)} className="soft-btn flex-1">{t('common.cancel')}</button>
            <button onClick={() => change(active, 'cancelled', { cancel_reason: reason })} disabled={busy} className="soft-btn-danger flex-1">
              {t('seller.reject')}
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-muted">{active?.code}</p>
        <textarea
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('seller.rejectReason')}
          className="soft-input resize-none"
        />
      </Modal>
    </div>
  );
}

function Field({ icon: Icon, label, value }) {
  return (
    <div className="soft-flat rounded-2xl p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <Icon size={12} /> {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold">{value || '—'}</p>
    </div>
  );
}

function Line({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? 'text-sm font-bold' : 'text-muted'}>{label}</span>
      <span className={bold ? 'text-base font-black' : 'font-bold'}>{value}</span>
    </div>
  );
}
