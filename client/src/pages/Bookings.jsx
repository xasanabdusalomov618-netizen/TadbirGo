import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, CalendarDays, Users, MapPin, ChevronRight, Wallet } from 'lucide-react';

import { api } from '../lib/api.js';
import { Loader, EmptyState, StatusBadge, Chip, Skeleton } from '../components/ui.jsx';
import { money, formatDate, formatDateTime } from '../lib/format.js';

const FILTERS = ['all', 'yangi', 'pending', 'confirmed', 'preparing', 'delivering', 'installing', 'ongoing', 'completed', 'cancelled'];

export default function Bookings() {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/bookings/my${status === 'all' ? '' : `?status=${status}`}`)
      .then((res) => setItems(res.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('bookings.title')}</h1>
      <p className="mt-1.5 text-sm text-muted">{t('checkout.successText')}</p>

      <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {FILTERS.map((filter) => (
          <Chip key={filter} active={status === filter} onClick={() => setStatus(filter)}>
            {filter === 'all' ? t('bookings.filterAll') : t(`status.${filter}`)}
          </Chip>
        ))}
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Package}
            title={t('bookings.empty')}
            description={t('home.heroSubtitle')}
            action={
              <Link to="/explore" className="soft-btn-primary mt-3">
                {t('bookings.emptyCta')} <ChevronRight size={16} />
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((booking) => (
            <Link
              key={booking.id}
              to={`/bookings/${booking.id}`}
              className="soft card-hover block p-4 sm:p-5"
              style={{ textDecoration: 'none' }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black">{booking.code}</span>
                    <StatusBadge status={booking.status} size="sm" />
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                    <Package size={12} /> {booking.seller.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black" style={{ color: 'var(--accent)' }}>{money(booking.total)}</p>
                  <p className="text-[11px] text-muted">{formatDateTime(booking.created_at, i18n.language)}</p>
                </div>
              </div>

              <div className="soft-divider my-3.5" />

              <div className="grid grid-cols-2 gap-3 text-xs text-muted sm:grid-cols-4">
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={12} /> {booking.event_date ? formatDate(booking.event_date, i18n.language, { short: true }) : '—'}
                </span>
                <span className="flex items-center gap-1.5"><Users size={12} /> {booking.guests || 0}</span>
                <span className="flex items-center gap-1.5"><MapPin size={12} /> {booking.city || '—'}</span>
                <span className="flex items-center gap-1.5">
                  <Wallet size={12} /> {booking.payment_status === 'paid' ? t('bookings.paid') : t('bookings.pendingPayment')}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {booking.items.slice(0, 4).map((item) => (
                  <span key={item.id} className="soft-chip !py-1 !text-[10px]">
                    {item.name} ×{item.quantity}
                  </span>
                ))}
                {booking.items.length > 4 && (
                  <span className="soft-chip !py-1 !text-[10px]">+{booking.items.length - 4}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
