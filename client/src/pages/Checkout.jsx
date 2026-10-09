import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CreditCard, Wallet, Smartphone, CheckCircle2, ArrowLeft, MapPin, CalendarDays, Users, FileText,
  Truck, Wrench, PackageCheck,
} from 'lucide-react';

import { api, errorMessage } from '../lib/api.js';
import { useCart, lineTotal } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Modal, Loader } from '../components/ui.jsx';
import { money, formatDate } from '../lib/format.js';

const SERVICE_FEE_RATE = 0.03;
const EVENT_TYPES = ['wedding', 'birthday', 'corporate', 'conference', 'graduation', 'other'];

const PAYMENTS = [
  { value: 'cash', label: 'checkout.payCash', icon: Wallet },
  { value: 'card', label: 'checkout.payCard', icon: CreditCard },
  { value: 'click', label: 'checkout.payClick', icon: Smartphone },
  { value: 'payme', label: 'checkout.payPayme', icon: Smartphone },
];

export default function Checkout() {
  const { t, i18n } = useTranslation();
  const cart = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [agreed, setAgreed] = useState(false);

  const [form, setForm] = useState({
    eventType: cart.config.eventType || 'wedding',
    eventDate: cart.config.eventDate || '',
    endDate: '',
    guests: cart.config.guests || 100,
    city: cart.config.city || user?.city || 'Toshkent',
    district: '',
    address: '',
    notes: '',
    name: user?.name || '',
    phone: user?.phone || '',
    paymentMethod: 'cash',
  });

  useEffect(() => {
    api
      .get('/delivery-options')
      .then((res) => {
        setOptions(res.items || []);
        if (!res.items?.some((o) => o.id === cart.config.deliveryOptionId)) {
          cart.updateConfig({ deliveryOptionId: res.items?.[0]?.id });
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const delivery = options.find((o) => o.id === cart.config.deliveryOptionId) || options[0];
  const installOption = options.find((o) => o.code === 'installation');
  const pickupOption = options.find((o) => o.code === 'pickup');

  const deliveryFee = useMemo(() => {
    if (!delivery || !cart.items.length) return 0;
    return Math.round((delivery.base_fee + delivery.per_km_fee * (cart.config.distanceKm || 0)) * delivery.express_multiplier);
  }, [delivery, cart.config.distanceKm, cart.items.length]);

  const installationFee = useMemo(
    () =>
      cart.items.length
        ? (cart.config.needInstallation ? installOption?.installation_fee || 0 : 0) +
          (cart.config.needPickup ? pickupOption?.base_fee || 0 : 0)
        : 0,
    [cart.config.needInstallation, cart.config.needPickup, cart.items.length, installOption, pickupOption]
  );

  const subtotal = cart.items.reduce((sum, item) => sum + lineTotal(item, Number(form.guests) || cart.config.guests), 0);
  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
  const total = subtotal + deliveryFee + installationFee + serviceFee;

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name || !form.phone || !form.city || !cart.items.length) {
      toast.error(t('checkout.fillAll'));
      return;
    }
    setSubmitting(true);
    try {
      const data = await api.post('/bookings', {
        items: cart.items.map((item) => ({ product_id: item.id, quantity: item.quantity, units: item.units })),
        event_date: form.eventDate,
        end_date: form.endDate,
        event_type: form.eventType,
        city: form.city,
        district: form.district,
        address: form.address || null,
        guests: Number(form.guests) || 0,
        delivery_option_id: delivery?.id,
        need_installation: cart.config.needInstallation,
        need_pickup: cart.config.needPickup,
        distance_km: cart.config.distanceKm || 0,
        payment_method: form.paymentMethod,
        notes: form.notes,
      });
      setDone(data);
      cart.clear();
    } catch (error) {
      toast.error(errorMessage(error, t));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="soft p-8 text-center">
          <div
            className="mx-auto grid h-20 w-20 place-items-center rounded-full text-white"
            style={{ background: 'linear-gradient(135deg, var(--ok), #34d399)' }}
          >
            <CheckCircle2 size={38} />
          </div>
          <h1 className="mt-6 text-2xl font-black">{t('checkout.success')}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">{t('checkout.successText')}</p>

          <div className="soft-inset mt-6 space-y-2 p-4 text-left text-sm">
            {done.bookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between gap-3">
                <span className="font-bold">{booking.code}</span>
                <span className="text-muted">{booking.seller.name}</span>
                <span className="font-black">{money(booking.total)}</span>
              </div>
            ))}
            <div className="soft-divider my-2" />
            <div className="flex items-center justify-between font-black">
              <span>{t('common.total')}</span>
              <span style={{ color: 'var(--accent)' }}>{money(done.total)}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link to="/bookings" className="soft-btn-primary flex-1">
              {t('checkout.viewBooking')}
            </Link>
            <Link to="/explore" className="soft-btn flex-1">
              {t('cart.continue')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!cart.items.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-black">{t('cart.empty')}</h1>
        <Link to="/explore" className="soft-btn-primary mt-5 inline-flex">{t('cart.emptyCta')}</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link to="/cart" className="soft-btn-ghost mb-4 !px-0">
        <ArrowLeft size={15} /> {t('checkout.backToCart')}
      </Link>

      <h1 className="mb-6 text-3xl font-extrabold tracking-tight sm:text-4xl">{t('checkout.title')}</h1>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {/* event details */}
          <section className="soft p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold">
              <CalendarDays size={16} style={{ color: 'var(--accent)' }} /> {t('checkout.eventDetails')}
            </h2>

            <div className="mb-4">
              <p className="soft-label">{t('checkout.eventType')}</p>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => set('eventType', type)}
                    className={`soft-chip ${form.eventType === type ? 'soft-chip-active' : ''}`}
                  >
                    {t(`package.${type}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="soft-label">{t('checkout.eventDate')} *</label>
                <input
                  type="date"
                  required
                  value={form.eventDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => set('eventDate', e.target.value)}
                  className="soft-input"
                />
              </div>
              <div>
                <label className="soft-label">{t('checkout.endDate')} ({t('common.optional')})</label>
                <input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className="soft-input" />
              </div>
              <div>
                <label className="soft-label">{t('checkout.guests')}</label>
                <input
                  type="number"
                  min="1"
                  value={form.guests}
                  onChange={(e) => set('guests', Number(e.target.value))}
                  className="soft-input"
                />
              </div>
              <div>
                <label className="soft-label">{t('common.city')} *</label>
                <input
                  type="text"
                  required
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                  className="soft-input"
                />
              </div>
              <div>
                <label className="soft-label">{t('checkout.district')}</label>
                <input type="text" value={form.district} onChange={(e) => set('district', e.target.value)} className="soft-input" />
              </div>
              <div>
                <label className="soft-label">{t('checkout.address')}</label>
                <input type="text" value={form.address} onChange={(e) => set('address', e.target.value)} className="soft-input" />
              </div>
            </div>

            <div className="mt-4">
              <label className="soft-label flex items-center gap-1.5"><FileText size={12} /> {t('checkout.notes')}</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder={t('checkout.notesPlaceholder')}
                className="soft-input resize-none"
              />
            </div>
          </section>

          {/* contact */}
          <section className="soft p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold">
              <Users size={16} style={{ color: 'var(--accent)' }} /> {t('checkout.contact')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="soft-label">{t('checkout.name')} *</label>
                <input required value={form.name} onChange={(e) => set('name', e.target.value)} className="soft-input" />
              </div>
              <div>
                <label className="soft-label">{t('checkout.phone')} *</label>
                <input
                  required
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="soft-input"
                />
              </div>
            </div>
          </section>

          {/* delivery + payment */}
          <section className="soft p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold">
              <Truck size={16} style={{ color: 'var(--accent)' }} /> {t('checkout.delivery')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {options.filter((o) => o.code === 'standard' || o.code === 'express').map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => cart.updateConfig({ deliveryOptionId: option.id })}
                  className="rounded-2xl p-4 text-left transition"
                  style={{
                    boxShadow:
                      delivery?.id === option.id
                        ? 'inset 3px 3px 7px var(--sd), inset -3px -3px 7px var(--sl), 0 0 0 2px var(--accent-glow)'
                        : 'inset 2px 2px 5px var(--sd), inset -2px -2px 5px var(--sl)',
                    color: delivery?.id === option.id ? 'var(--accent)' : 'var(--muted)',
                  }}
                >
                  <p className="text-sm font-bold">{option[`name_${i18n.language}`]}</p>
                  <p className="mt-1 text-xs text-muted">{option.eta_hours} {t('common.hours')}</p>
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => cart.updateConfig({ needInstallation: !cart.config.needInstallation })}
                className="flex items-center gap-3 rounded-2xl p-3 text-left text-xs font-bold transition"
                style={{
                  boxShadow: 'inset 2px 2px 5px var(--sd), inset -2px -2px 5px var(--sl)',
                  color: cart.config.needInstallation ? 'var(--accent)' : 'var(--muted)',
                }}
              >
                <Wrench size={15} /> {t('cart.addInstallation')}
                <span className="ml-auto">+{money(installOption?.installation_fee || 0)}</span>
              </button>
              <button
                type="button"
                onClick={() => cart.updateConfig({ needPickup: !cart.config.needPickup })}
                className="flex items-center gap-3 rounded-2xl p-3 text-left text-xs font-bold transition"
                style={{
                  boxShadow: 'inset 2px 2px 5px var(--sd), inset -2px -2px 5px var(--sl)',
                  color: cart.config.needPickup ? 'var(--accent)' : 'var(--muted)',
                }}
              >
                <PackageCheck size={15} /> {t('cart.pickupAfter')}
                <span className="ml-auto">+{money(pickupOption?.base_fee || 0)}</span>
              </button>
            </div>
          </section>

          <section className="soft p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold">
              <CreditCard size={16} style={{ color: 'var(--accent)' }} /> {t('checkout.payment')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-4">
              {PAYMENTS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => set('paymentMethod', method.value)}
                  className="flex flex-col items-center gap-2 rounded-2xl p-4 text-[11px] font-bold transition"
                  style={{
                    boxShadow:
                      form.paymentMethod === method.value
                        ? 'inset 3px 3px 7px var(--sd), inset -3px -3px 7px var(--sl), 0 0 0 2px var(--accent-glow)'
                        : 'inset 2px 2px 5px var(--sd), inset -2px -2px 5px var(--sl)',
                    color: form.paymentMethod === method.value ? 'var(--accent)' : 'var(--muted)',
                  }}
                >
                  <method.icon size={20} />
                  {t(method.label)}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* summary */}
        <aside>
          <div className="soft sticky top-20 p-5">
            <h2 className="mb-4 text-lg font-extrabold">{t('checkout.summary')}</h2>

            <div className="mb-4 max-h-52 space-y-2 overflow-y-auto pr-1">
              {cart.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate text-muted">
                    {item.name} <span className="font-bold">×{item.quantity}</span>
                  </span>
                  <span className="font-bold">{money(lineTotal(item, Number(form.guests) || cart.config.guests))}</span>
                </div>
              ))}
            </div>

            <div className="soft-divider mb-4" />

            <SummaryRow label={t('common.subtotal')} value={money(subtotal)} />
            <SummaryRow label={`${t('cart.deliveryCost')} (${cart.config.distanceKm} ${t('common.km')})`} value={money(deliveryFee)} />
            <SummaryRow label={t('cart.installationCost')} value={money(installationFee)} />
            <SummaryRow label={t('cart.serviceFee')} value={money(serviceFee)} />

            <div className="soft-divider my-4" />

            <div className="mb-4 flex items-end justify-between">
              <span className="text-sm font-semibold text-muted">{t('common.total')}</span>
              <span className="text-2xl font-black" style={{ color: 'var(--accent)' }}>{money(total)}</span>
            </div>

            <label className="mb-4 flex cursor-pointer items-start gap-2.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[color:var(--accent)]"
              />
              <span>{t('checkout.terms')}</span>
            </label>

            <button type="submit" disabled={submitting || !agreed} className="soft-btn-primary w-full disabled:opacity-50">
              {submitting ? t('checkout.placing') : t('checkout.placeOrder')}
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="mb-2 flex items-center justify-between text-xs">
      <span className="text-muted">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
