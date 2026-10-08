import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, MapPin, CalendarDays, Users, Phone, Star, Wallet, Package, MessageSquare,
  CheckCircle2, Circle, Truck, ShieldCheck,
} from 'lucide-react';

import { api, errorMessage } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Loader, EmptyState, StatusBadge, Modal, Rating, Breadcrumbs } from '../components/ui.jsx';
import { money, formatDate, formatDateTime } from '../lib/format.js';

const PIPELINE = ['yangi', 'confirmed', 'preparing', 'delivering', 'installing', 'ongoing', 'completed'];

export default function BookingDetails() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [busy, setBusy] = useState(false);

  const load = () => {
    api
      .get(`/bookings/${id}`)
      .then(setBooking)
      .catch(() => setBooking(null))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const cancel = async () => {
    setBusy(true);
    try {
      await api.patch(`/bookings/${booking.id}/status`, { status: 'cancelled', cancel_reason: cancelReason });
      toast.success(t('bookings.cancel'));
      setCancelOpen(false);
      load();
    } catch (error) {
      toast.error(errorMessage(error, t));
    } finally {
      setBusy(false);
    }
  };

  const pay = async () => {
    setBusy(true);
    try {
      await api.post(`/bookings/${booking.id}/pay`, { method: booking.payment_method });
      toast.success(t('bookings.paid'));
      load();
    } catch (error) {
      toast.error(errorMessage(error, t));
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async () => {
    setBusy(true);
    try {
      await api.post('/reviews', { booking_id: booking.id, rating: review.rating, comment: review.comment });
      toast.success(t('bookings.thanks'));
      setReviewOpen(false);
      load();
    } catch (error) {
      toast.error(errorMessage(error, t));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader />;
  if (!booking) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          title={t('common.notFound')}
          description={t('errors.notFoundText')}
          action={<Link to="/bookings" className="soft-btn-primary mt-3">{t('bookings.title')}</Link>}
        />
      </div>
    );
  }

  const activeIndex = booking.status === 'pending' ? 0 : PIPELINE.indexOf(booking.status);
  const isCustomer = booking.customer_id === user?.id;
  const cancellable = isCustomer && !['completed', 'cancelled'].includes(booking.status);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { to: '/', label: t('nav.home') },
          { to: '/bookings', label: t('bookings.title') },
          { label: booking.code },
        ]}
      />

      <Link to="/bookings" className="soft-btn-ghost mb-2 !px-0">
        <ArrowLeft size={15} /> {t('bookings.title')}
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black sm:text-3xl">{booking.code}</h1>
            <StatusBadge status={booking.status} />
          </div>
          <p className="mt-2 text-sm text-muted">
            {t(`package.${booking.event_type}`, booking.event_type)} · {formatDateTime(booking.created_at, i18n.language)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black" style={{ color: 'var(--accent)' }}>{money(booking.total)}</p>
          <p className="text-xs text-muted">
            {booking.payment_status === 'paid' ? t('bookings.paid') : booking.payment_status === 'refunded' ? t('bookings.refunded') : t('bookings.pendingPayment')}
          </p>
        </div>
      </div>

      {/* timeline */}
      {booking.status !== 'cancelled' ? (
        <div className="soft mb-5 overflow-x-auto p-5">
          <p className="mb-4 text-sm font-extrabold">{t('bookings.timeline')}</p>
          <div className="flex min-w-[640px] items-start justify-between">
            {PIPELINE.map((step, index) => {
              const done = index <= activeIndex;
              return (
                <div key={step} className="flex flex-1 flex-col items-center text-center">
                  <div className="flex w-full items-center">
                    <span className="h-0.5 flex-1" style={{ background: index === 0 ? 'transparent' : done ? 'var(--accent)' : 'var(--line)' }} />
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white"
                      style={{ background: done ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'var(--line)' }}
                    >
                      {done ? <CheckCircle2 size={15} /> : <Circle size={13} />}
                    </span>
                    <span
                      className="h-0.5 flex-1"
                      style={{ background: index === PIPELINE.length - 1 ? 'transparent' : index < activeIndex ? 'var(--accent)' : 'var(--line)' }}
                    />
                  </div>
                  <p className="mt-2 w-24 text-[10px] font-bold leading-tight" style={{ color: done ? 'var(--ink)' : 'var(--muted)' }}>
                    {t(`status.${step}`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="soft mb-5 p-5">
          <p className="text-sm font-extrabold" style={{ color: 'var(--danger)' }}>{t('status.cancelled')}</p>
          {booking.cancel_reason && <p className="mt-1 text-sm text-muted">{t('bookings.cancelReason')}: {booking.cancel_reason}</p>}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {/* items */}
          <section className="soft p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold">
              <Package size={16} style={{ color: 'var(--accent)' }} /> {t('bookings.items')}
            </h2>
            <div className="space-y-2.5">
              {booking.items.map((item) => (
                <Link
                  key={item.id}
                  to={`/products/${item.product_id}`}
                  className="soft-flat flex items-center gap-3 rounded-2xl p-3 transition hover:text-accent"
                  style={{ textDecoration: 'none' }}
                >
                  <div className="h-14 w-16 shrink-0 overflow-hidden rounded-xl bg-surface2">
                    {item.image_url && <img src={item.image_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{item.name}</p>
                    <p className="text-[11px] text-muted">
                      {money(item.price)} × {item.quantity}
                      {item.units > 1 ? ` × ${item.units} ${t('common.days')}` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-black">{money(item.subtotal)}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* event info */}
          <section className="soft p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold">
              <CalendarDays size={16} style={{ color: 'var(--accent)' }} /> {t('checkout.eventDetails')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Info icon={CalendarDays} label={t('checkout.eventDate')} value={booking.event_date ? formatDate(booking.event_date, i18n.language) : '—'} />
              <Info icon={Users} label={t('checkout.guests')} value={booking.guests || 0} />
              <Info icon={MapPin} label={t('common.city')} value={booking.city || '—'} />
              <Info icon={Truck} label={t('cart.deliveryTitle')} value={booking.delivery_option?.name_uz ? booking.delivery_option[`name_${i18n.language}`] : '—'} />
            </div>
            {booking.address && (
              <p className="mt-4 flex items-start gap-2 text-sm text-muted">
                <MapPin size={14} className="mt-0.5 shrink-0" /> {booking.address}
              </p>
            )}
            {booking.notes && (
              <p className="mt-3 rounded-2xl bg-surface2 p-3 text-sm text-muted">{booking.notes}</p>
            )}
          </section>

          {/* review */}
          {booking.status === 'completed' && isCustomer && (
            <section className="soft p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold">
                <Star size={16} style={{ color: 'var(--warn)' }} /> {t('bookings.reviewTitle')}
              </h2>
              {booking.review ? (
                <div className="soft-flat rounded-2xl p-4">
                  <Rating value={booking.review.rating} size={16} />
                  <p className="mt-2 text-sm text-muted">{t('bookings.thanks')}</p>
                </div>
              ) : (
                <button onClick={() => setReviewOpen(true)} className="soft-btn-primary">
                  <Star size={16} /> {t('bookings.writeReview')}
                </button>
              )}
            </section>
          )}
        </div>

        <aside className="space-y-4">
          {/* totals */}
          <div className="soft p-5">
            <h2 className="mb-4 text-sm font-extrabold">{t('checkout.summary')}</h2>
            <Row label={t('common.subtotal')} value={money(booking.subtotal)} />
            <Row label={t('cart.deliveryCost')} value={money(booking.delivery_fee)} />
            <Row label={t('cart.installationCost')} value={money(booking.installation_fee)} />
            <Row label={t('cart.serviceFee')} value={money(booking.service_fee)} />
            <div className="soft-divider my-3.5" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">{t('common.total')}</span>
              <span className="text-xl font-black" style={{ color: 'var(--accent)' }}>{money(booking.total)}</span>
            </div>

            {isCustomer && booking.payment_status === 'pending' && booking.status !== 'cancelled' && (
              <button onClick={pay} disabled={busy} className="soft-btn-primary mt-4 w-full">
                <Wallet size={16} /> {t('bookings.payNow')}
              </button>
            )}
            {cancellable && (
              <button onClick={() => setCancelOpen(true)} className="soft-btn-danger mt-2 w-full">
                {t('bookings.cancel')}
              </button>
            )}
          </div>

          {/* seller */}
          <div className="soft p-5">
            <h2 className="mb-4 text-sm font-extrabold">{t('bookings.seller')}</h2>
            <Link to={`/explore?seller=${booking.seller?.slug}`} className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
              <img src={booking.seller.logo_url} alt="" className="h-12 w-12 rounded-2xl object-cover" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{booking.seller.name}</p>
                <Rating value={booking.seller.rating} size={11} />
              </div>
            </Link>
            <div className="mt-4 grid gap-2">
              <a href={`tel:${booking.seller?.phone || booking.customer?.phone || ''}`} className="soft-btn !py-2.5 !text-xs">
                <Phone size={14} /> {t('seller.contactCustomer')}
              </a>
              <Link to="/explore" className="soft-btn !py-2.5 !text-xs">
                <MessageSquare size={14} /> {t('product.askQuestion')}
              </Link>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
              <ShieldCheck size={12} style={{ color: 'var(--ok)' }} /> {t('home.adv1')}
            </p>
          </div>
        </aside>
      </div>

      {/* cancel modal */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={t('bookings.cancelConfirm')}
        footer={
          <>
            <button onClick={() => setCancelOpen(false)} className="soft-btn flex-1">{t('common.cancel')}</button>
            <button onClick={cancel} disabled={busy} className="soft-btn-danger flex-1">{t('bookings.cancel')}</button>
          </>
        }
      >
        <textarea
          rows={4}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder={t('bookings.cancelReason')}
          className="soft-input resize-none"
        />
      </Modal>

      {/* review modal */}
      <Modal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title={t('bookings.reviewTitle')}
        footer={
          <>
            <button onClick={() => setReviewOpen(false)} className="soft-btn flex-1">{t('common.cancel')}</button>
            <button onClick={submitReview} disabled={busy} className="soft-btn-primary flex-1">{t('bookings.submit')}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="soft-label">{t('bookings.rating')}</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setReview((r) => ({ ...r, rating: value }))}
                  className="p-1 transition"
                  aria-label={String(value)}
                >
                  <Star
                    size={30}
                    style={{
                      color: value <= review.rating ? 'var(--warn)' : 'var(--line)',
                      fill: value <= review.rating ? 'var(--warn)' : 'transparent',
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="soft-label">{t('bookings.comment')}</p>
            <textarea
              rows={4}
              value={review.comment}
              onChange={(e) => setReview((r) => ({ ...r, comment: e.target.value }))}
              className="soft-input resize-none"
              placeholder={t('bookings.writeReview')}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="mb-2 flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="soft-flat rounded-2xl p-3.5">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <Icon size={12} /> {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold">{value}</p>
    </div>
  );
}
