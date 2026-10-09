import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Trash2, Truck, Wrench, PackageCheck, ArrowRight, MapPin, Ruler, Zap } from 'lucide-react';

import { api } from '../lib/api.js';
import { useCart, lineTotal } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { EmptyState, QtyStepper, Loader } from '../components/ui.jsx';
import { money } from '../lib/format.js';

const SERVICE_FEE_RATE = 0.03;

export default function Cart() {
  const { t, i18n } = useTranslation();
  const cart = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/delivery-options')
      .then((res) => {
        setOptions(res.items || []);
        if (!res.items?.some((o) => o.id === cart.config.deliveryOptionId)) {
          cart.updateConfig({ deliveryOptionId: res.items?.[0]?.id });
        }
      })
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deliveryOptions = options.filter((o) => o.code === 'standard' || o.code === 'express');
  const installOption = options.find((o) => o.code === 'installation');
  const pickupOption = options.find((o) => o.code === 'pickup');
  const selectedDelivery = deliveryOptions.find((o) => o.id === cart.config.deliveryOptionId) || deliveryOptions[0];

  const deliveryFee = useMemo(() => {
    if (!selectedDelivery || !cart.items.length) return 0;
    return Math.round((selectedDelivery.base_fee + selectedDelivery.per_km_fee * (cart.config.distanceKm || 0)) * selectedDelivery.express_multiplier);
  }, [selectedDelivery, cart.config.distanceKm, cart.items.length]);

  const installationFee = useMemo(() => {
    if (!cart.items.length) return 0;
    return (cart.config.needInstallation ? installOption?.installation_fee || 0 : 0) + (cart.config.needPickup ? pickupOption?.base_fee || 0 : 0);
  }, [cart.config.needInstallation, cart.config.needPickup, cart.items.length, installOption, pickupOption]);

  const subtotal = cart.items.reduce((sum, item) => sum + lineTotal(item, cart.config.guests), 0);
  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
  const total = subtotal + deliveryFee + installationFee + serviceFee;

  const grouped = useMemo(() => {
    const groups = {};
    cart.items.forEach((item) => {
      const key = item.seller_id || 'unknown';
      if (!groups[key]) groups[key] = { name: item.seller_name || t('cart.sellerGroup'), slug: item.seller_slug, items: [] };
      groups[key].items.push(item);
    });
    return Object.values(groups);
  }, [cart.items, t]);

  if (loading) return <Loader />;

  if (!cart.items.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-6 text-3xl font-extrabold">{t('cart.title')}</h1>
        <EmptyState
          icon={ShoppingCart}
          title={t('cart.empty')}
          description={t('home.heroSubtitle')}
          action={
            <Link to="/explore" className="soft-btn-primary mt-3">
              {t('cart.emptyCta')} <ArrowRight size={16} />
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
        {t('cart.title')} <span className="text-muted">({cart.count})</span>
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* items */}
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.slug || group.name} className="soft p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <PackageCheck size={16} style={{ color: 'var(--accent)' }} />
                <p className="text-sm font-bold">{group.name}</p>
              </div>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <div key={item.id} className="soft-flat flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center">
                    <Link to={`/products/${item.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-surface2">
                        {item.image ? (
                          <img src={item.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-white" style={{ background: 'var(--accent)' }}>
                            <PackageCheck size={18} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{item.name}</p>
                        <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                          <MapPin size={10} /> {item.city}
                          <span>· {money(item.price)} {item.price_type === 'hour' ? `/ ${t('common.perHour')}` : item.price_type === 'day' ? `/ ${t('common.perDay')}` : item.price_type === 'person' ? `/ ${t('common.perPerson')}` : `/ ${t('common.perEvent')}`}</span>
                        </p>
                      </div>
                    </Link>

                    <div className="flex items-center gap-3">
                      <QtyStepper value={item.quantity} onChange={(v) => cart.setQty(item.id, v)} min={item.min_order || 1} size="sm" />
                      {(item.price_type === 'day' || item.price_type === 'hour') && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted">{item.price_type === 'hour' ? t('common.hours') : t('common.days')}</span>
                          <QtyStepper value={item.units} onChange={(v) => cart.setUnits(item.id, v)} min={1} size="sm" />
                        </div>
                      )}
                      <span className="w-24 text-right text-sm font-black">{money(lineTotal(item, cart.config.guests))}</span>
                      <button
                        onClick={() => {
                          cart.remove(item.id);
                          toast.info(t('cart.remove'));
                        }}
                        className="soft-icon !h-9 !w-9 text-muted transition hover:text-[color:var(--danger)]"
                        aria-label={t('cart.remove')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* delivery options */}
          <div className="soft p-4 sm:p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold">
              <Truck size={16} style={{ color: 'var(--accent)' }} /> {t('cart.deliveryTitle')}
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              {deliveryOptions.map((option) => {
                const active = selectedDelivery?.id === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => cart.updateConfig({ deliveryOptionId: option.id })}
                    className={`rounded-2xl p-4 text-left transition ${
                      active ? 'text-accent' : 'text-muted hover:text-ink'
                    }`}
                    style={{
                      boxShadow: active
                        ? 'inset 3px 3px 7px var(--sd), inset -3px -3px 7px var(--sl), 0 0 0 2px var(--accent-glow)'
                        : 'inset 2px 2px 5px var(--sd), inset -2px -2px 5px var(--sl)',
                    }}
                  >
                    <p className="flex items-center gap-2 text-sm font-bold">
                      {option.code === 'express' ? <Zap size={14} /> : <Truck size={14} />}
                      {option[`name_${i18n.language}`]}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {money(option.base_fee)} + {money(option.per_km_fee)} / {t('common.km')}
                    </p>
                    {option.express_multiplier > 1 && (
                      <p className="mt-1 text-[11px] font-bold" style={{ color: 'var(--warn)' }}>
                        ×{option.express_multiplier}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="soft-label flex items-center gap-1.5"><Ruler size={12} /> {t('cart.distance')}</p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={cart.config.distanceKm}
                    onChange={(e) => cart.updateConfig({ distanceKm: Number(e.target.value) })}
                    className="flex-1 accent-[color:var(--accent)]"
                  />
                  <span className="w-16 text-right text-xs font-bold">{cart.config.distanceKm} {t('common.km')}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Toggle
                  icon={Wrench}
                  label={t('cart.addInstallation')}
                  price={installOption?.installation_fee || 0}
                  active={cart.config.needInstallation}
                  onChange={(v) => cart.updateConfig({ needInstallation: v })}
                />
                <Toggle
                  icon={PackageCheck}
                  label={t('cart.pickupAfter')}
                  price={pickupOption?.base_fee || 0}
                  active={cart.config.needPickup}
                  onChange={(v) => cart.updateConfig({ needPickup: v })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Link to="/explore" className="soft-btn !py-2.5 !text-xs">
              {t('cart.continue')}
            </Link>
            <button
              onClick={() => {
                cart.clear();
                toast.info(t('cart.clear'));
              }}
              className="soft-btn-danger !py-2.5 !text-xs"
            >
              <Trash2 size={14} /> {t('cart.clear')}
            </button>
          </div>
        </div>

        {/* summary */}
        <aside>
          <div className="soft sticky top-20 p-5">
            <h2 className="mb-4 text-lg font-extrabold">{t('checkout.summary')}</h2>

            <Row label={t('common.subtotal')} value={money(subtotal)} />
            <Row label={t('cart.deliveryCost')} value={deliveryFee ? money(deliveryFee) : t('common.free')} />
            <Row label={t('cart.installationCost')} value={installationFee ? money(installationFee) : '—'} />
            <Row label={t('cart.serviceFee')} value={money(serviceFee)} />

            <div className="soft-divider my-4" />

            <div className="mb-5 flex items-end justify-between">
              <span className="text-sm font-semibold text-muted">{t('cart.total')}</span>
              <span className="text-2xl font-black" style={{ color: 'var(--accent)' }}>{money(total)}</span>
            </div>

            <button onClick={() => navigate('/checkout')} className="soft-btn-primary w-full">
              {t('cart.checkout')} <ArrowRight size={16} />
            </button>

            <p className="mt-3 text-center text-[11px] text-muted">{t('cart.deliveryNote')}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="mb-2.5 flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function Toggle({ icon: Icon, label, price, active, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition"
      style={{
        boxShadow: active
          ? 'inset 3px 3px 7px var(--sd), inset -3px -3px 7px var(--sl)'
          : 'inset 2px 2px 5px var(--sd), inset -2px -2px 5px var(--sl)',
        color: active ? 'var(--accent)' : 'var(--muted)',
      }}
    >
      <Icon size={15} />
      <span className="flex-1 truncate text-xs font-bold">{label}</span>
      <span className="text-[11px] font-bold">+{money(price)}</span>
      <span
        className="grid h-5 w-9 place-items-center rounded-full transition"
        style={{ background: active ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'var(--line)' }}
      >
        <span
          className="h-3.5 w-3.5 rounded-full bg-white transition-transform"
          style={{ transform: active ? 'translateX(9px)' : 'translateX(-9px)' }}
        />
      </span>
    </button>
  );
}
