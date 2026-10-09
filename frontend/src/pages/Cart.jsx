import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useApp, useAuth, useCart } from '../store';
import { EmptyState, MapPreview, QtyInput } from '../components';
import { CITIES, EVENT_TYPES, locDelivery, locName } from '../utils';

function DeliveryOptions({ compact }) {
  const { t, lang, fmtMoney } = useApp();
  const cart = useCart();
  const deliveryOpts = cart.options.filter((o) => o.kind === 'delivery');
  const installation = cart.options.find((o) => o.slug === 'installation');
  const pickup = cart.options.find((o) => o.slug === 'pickup');

  return (
    <div>
      <h3 className="card__title">🚚 {t('cart.delivery')}</h3>
      <label className={`radio-card${cart.delivery === 'none' ? ' selected' : ''}`}>
        <input type="radio" name="delivery" checked={cart.delivery === 'none'}
          onChange={() => cart.setDelivery('none')} />
        <div>
          <div className="radio-card__title">{t('cart.delivery.none')}</div>
        </div>
        <span className="radio-card__price">{t('common.free')}</span>
      </label>
      {deliveryOpts.map((o) => (
        <label key={o.id} className={`radio-card${cart.delivery === o.slug ? ' selected' : ''}`}>
          <input type="radio" name="delivery" checked={cart.delivery === o.slug}
            onChange={() => cart.setDelivery(o.slug)} />
          <div>
            <div className="radio-card__title">{o.slug === 'express' ? '⚡' : '🚚'} {locDelivery(o, lang)}</div>
          </div>
          <span className="radio-card__price">{fmtMoney(o.price)}</span>
        </label>
      ))}
      <label className={`radio-card${cart.installation ? ' selected' : ''}`}>
        <input type="checkbox" checked={cart.installation} onChange={(e) => cart.setInstallation(e.target.checked)} />
        <div>
          <div className="radio-card__title">🔧 {t('cart.installation')}</div>
          <div className="radio-card__hint">{t('cart.installationHint')}</div>
        </div>
        <span className="radio-card__price">{installation ? fmtMoney(installation.price) : ''}</span>
      </label>
      <label className={`radio-card${cart.pickup ? ' selected' : ''}`}>
        <input type="checkbox" checked={cart.pickup} onChange={(e) => cart.setPickup(e.target.checked)} />
        <div>
          <div className="radio-card__title">📦 {t('cart.pickup')}</div>
          <div className="radio-card__hint">{t('cart.pickupHint')}</div>
        </div>
        <span className="radio-card__price">{pickup ? fmtMoney(pickup.price) : ''}</span>
      </label>
    </div>
  );
}

function CartSummary({ children }) {
  const { t, fmtMoney } = useApp();
  const cart = useCart();
  return (
    <div className="card" style={{ position: 'sticky', top: 80 }}>
      <h3 className="card__title">{t('checkout.summary')}</h3>
      <div className="summary-row"><span>{t('common.subtotal')}</span><span>{fmtMoney(cart.subtotal)}</span></div>
      <div className="summary-row"><span>🚚 {t('cart.deliveryFee')}</span><span>{fmtMoney(cart.fees.delivery)}</span></div>
      <div className="summary-row"><span>🔧 {t('cart.installationFee')}</span><span>{fmtMoney(cart.fees.installation)}</span></div>
      <div className="summary-row"><span>📦 {t('cart.pickupFee')}</span><span>{fmtMoney(cart.fees.pickup)}</span></div>
      <div className="summary-row total"><span>{t('cart.total')}</span><span>{fmtMoney(cart.total)}</span></div>
      {children}
    </div>
  );
}

// =================================================================
export function Cart() {
  const { t, lang, fmtMoney } = useApp();
  const cart = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (cart.items.length === 0) {
    return (
      <div className="container page">
        <h1 className="page__title">🛒 {t('cart.title')}</h1>
        <EmptyState icon="🛒" title={t('cart.empty')} text={t('cart.emptyText')}
          action={
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/katalog" className="btn btn--primary">{t('cart.goCatalog')}</Link>
              <Link to="/paket" className="btn btn--outline">🧩 {t('nav.builder')}</Link>
            </div>
          } />
      </div>
    );
  }

  return (
    <div className="container page">
      <h1 className="page__title">🛒 {t('cart.title')}</h1>
      <div className="panel-grid panel-grid--wide">
        <div>
          <div className="card">
            {cart.items.map((i) => (
              <div key={i.product_id} className="cart-row">
                <Link to={`/mahsulot/${i.product_id}`} className="cart-row__img">
                  {i.image ? <img src={i.image} alt="" /> : <div className="img-fallback">{i.category_icon}</div>}
                </Link>
                <div className="cart-row__body">
                  <Link to={`/mahsulot/${i.product_id}`}>
                    <p className="cart-row__name">{locName(i, lang)}</p>
                  </Link>
                  <div className="cart-row__meta">🏪 {i.seller_name} · {fmtMoney(i.price)}</div>
                  <div style={{ marginTop: 8 }}>
                    <QtyInput value={i.quantity} onChange={(v) => cart.setQty(i.product_id, v)} max={i.max} />
                  </div>
                </div>
                <div className="cart-row__right">
                  <strong>{fmtMoney(i.price * i.quantity)}</strong>
                  <button className="link-btn" style={{ color: 'var(--red)' }} onClick={() => cart.remove(i.product_id)}>
                    ✕ {t('common.delete')}
                  </button>
                </div>
              </div>
            ))}
            <p className="muted" style={{ fontSize: 12.5, margin: '12px 0 0' }}>ℹ️ {t('checkout.sellerSplit')}</p>
          </div>
        </div>
        <div>
          <div className="card mb"><DeliveryOptions /></div>
          <CartSummary>
            <button className="btn btn--primary btn--block btn--lg mt"
              onClick={() => navigate(user ? '/checkout' : '/kirish?next=/checkout')}>
              {t('cart.checkout')} →
            </button>
          </CartSummary>
        </div>
      </div>
    </div>
  );
}

// =================================================================
export function Checkout() {
  const { t, lang, fmtMoney, fmtDate } = useApp();
  const { user, setUser } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    event_date: '', event_type: 'toy', guests: 100,
    name: user?.name || '', phone: user?.phone || '',
    city: 'toshkent', address: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const city = CITIES.find((c) => c.key === form.city) || null;

  if (cart.items.length === 0) {
    return (
      <div className="container page">
        <EmptyState icon="🛒" title={t('cart.empty')} text={t('cart.emptyText')}
          action={<Link to="/katalog" className="btn btn--primary">{t('cart.goCatalog')}</Link>} />
      </div>
    );
  }

  const STEPS = [
    { n: 1, label: t('checkout.step1') },
    { n: 2, label: t('checkout.step2') },
    { n: 3, label: t('checkout.step3') },
  ];

  const next = () => {
    setError('');
    if (step === 1) {
      if (!form.event_date || form.event_date < today) { setError(t('checkout.err.date')); return; }
      if (Number(form.guests) < 0) { setError(t('checkout.err.guests')); return; }
    }
    if (step === 2) {
      if (!form.name.trim() || form.name.trim().length < 2) { setError(t('checkout.err.name')); return; }
      if (form.address.trim().length < 3) { setError(t('checkout.err.address')); return; }
    }
    setStep((x) => Math.min(3, x + 1));
  };

  const submit = async () => {
    setError('');
    const location = `${city?.name || ''}, ${form.address.trim()}`;
    setSubmitting(true);
    try {
      if (user && (form.name.trim() !== user.name || (form.phone || '') !== (user.phone || ''))) {
        try {
          const updated = await api.put('/api/auth/me', { name: form.name.trim(), phone: form.phone.trim() });
          setUser?.(updated);
        } catch { /* contact update is optional */ }
      }
      const d = await api.post('/api/checkout', {
        items: cart.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        event_date: form.event_date,
        event_type: form.event_type,
        location,
        guests: Number(form.guests) || 0,
        delivery: cart.delivery,
        installation: cart.installation,
        pickup: cart.pickup,
      });
      cart.clear();
      navigate('/checkout/muvaffaqiyat', { state: { bookings: d.bookings, total: d.total } });
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="container page">
      <h1 className="page__title">📋 {t('checkout.title')}</h1>

      <ol className="stepper" aria-label="steps">
        {STEPS.map((s) => (
          <li key={s.n} className={`stepper__item${step === s.n ? ' active' : ''}${step > s.n ? ' done' : ''}`}>
            <span className="stepper__num">{step > s.n ? '✓' : s.n}</span>
            <span>{s.label}</span>
          </li>
        ))}
      </ol>

      <div className="panel-grid panel-grid--wide">
        <div>
          {error && <div className="form-error mb">{error}</div>}

          {step === 1 && (
            <div className="card mb">
              <h3 className="card__title">🎉 {t('checkout.eventInfo')}</h3>
              <div className="form-grid">
                <div className="field">
                  <label>{t('checkout.eventDate')} *</label>
                  <input type="date" className="input" min={today} value={form.event_date} onChange={set('event_date')} />
                </div>
                <div className="field">
                  <label>{t('checkout.eventType')}</label>
                  <select className="select" value={form.event_type} onChange={set('event_type')}>
                    {EVENT_TYPES.map((et) => <option key={et} value={et}>{t(`builder.eventType.${et}`)}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>{t('checkout.guests')}</label>
                  <input type="number" className="input" min="0" value={form.guests} onChange={set('guests')} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card mb">
              <h3 className="card__title">📍 {t('checkout.contactLocation')}</h3>
              <div className="form-grid">
                <div className="field">
                  <label>{t('checkout.contactName')} *</label>
                  <input className="input" value={form.name} onChange={set('name')} />
                </div>
                <div className="field">
                  <label>{t('checkout.contactPhone')}</label>
                  <input className="input" placeholder="+998 __ ___ __ __" value={form.phone} onChange={set('phone')} />
                </div>
                <div className="field">
                  <label>{t('checkout.city')} *</label>
                  <select className="select" value={form.city} onChange={set('city')}>
                    {CITIES.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>{t('checkout.location')} *</label>
                  <input className="input" placeholder={t('builder.locationPh')} value={form.address} onChange={set('address')} />
                </div>
              </div>
              <div className="mt">
                <MapPreview city={city} address={form.address} t={t} />
              </div>
            </div>
          )}

          {step === 3 && (
            <>
              <div className="card mb">
                <h3 className="card__title">✅ {t('checkout.review')}</h3>
                <div className="review-grid">
                  <div><span className="muted">{t('checkout.eventDate')}</span><strong>{fmtDate(form.event_date)}</strong></div>
                  <div><span className="muted">{t('checkout.eventType')}</span><strong>{t(`builder.eventType.${form.event_type}`)}</strong></div>
                  <div><span className="muted">{t('checkout.guests')}</span><strong>{form.guests}</strong></div>
                  <div><span className="muted">{t('checkout.contactName')}</span><strong>{form.name} {form.phone && `· ${form.phone}`}</strong></div>
                  <div className="span-2"><span className="muted">{t('checkout.location')}</span><strong>{city?.name}, {form.address}</strong></div>
                </div>
                <div className="mt"><MapPreview city={city} address={form.address} t={t} /></div>
              </div>
              <div className="card mb"><DeliveryOptions /></div>
            </>
          )}

          <div className="wizard-nav">
            <button className="btn btn--outline" disabled={step === 1} onClick={() => { setError(''); setStep((x) => Math.max(1, x - 1)); }}>
              ← {t('common.back')}
            </button>
            {step < 3 ? (
              <button className="btn btn--primary" onClick={next}>{t('common.next')} →</button>
            ) : (
              <button className="btn btn--primary" onClick={submit} disabled={submitting}>
                {submitting ? t('checkout.placing') : `✅ ${t('checkout.place')}`}
              </button>
            )}
          </div>
        </div>

        <div>
          <CartSummary>
            <div className="muted" style={{ fontSize: 12.5, margin: '8px 0' }}>💳 {t('checkout.payment.hint')}</div>
          </CartSummary>
          <div className="card mt">
            <h3 className="card__title">{t('bookings.detail.items')}</h3>
            {cart.items.map((i) => (
              <div key={i.product_id} className="summary-row" style={{ fontSize: 13.5 }}>
                <span>{locName(i, lang)} × {i.quantity}</span>
                <span>{fmtMoney(i.price * i.quantity)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CheckoutSuccess() {
  const { t, fmtMoney } = useApp();
  const navigate = useNavigate();
  const state = window.history.state?.usr || {};
  const bookings = state.bookings || [];

  return (
    <div className="container page" style={{ maxWidth: 640 }}>
      <div className="card" style={{ textAlign: 'center', padding: '40px 26px' }}>
        <div style={{ fontSize: 56 }}>🎉</div>
        <h1 style={{ margin: '12px 0 8px', letterSpacing: '-0.5px' }}>{t('checkout.success.title')}</h1>
        <p className="muted">{t('checkout.success.text')}</p>
        <div style={{ margin: '20px 0', textAlign: 'left' }}>
          {bookings.map((b) => (
            <div key={b.id} className="card" style={{ marginBottom: 10, padding: 14 }}>
              <div className="row-between">
                <div>
                  <strong>{b.code}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>{b.seller_name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>{fmtMoney(b.total)}</strong>
                  <div>
                    <button className="btn btn--primary btn--sm mt" style={{ marginTop: 6 }}
                      onClick={() => navigate(`/buyurtma/${b.id}?pay=1`)}>
                      💳 {t('checkout.success.payNow')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/buyurtmalarim" className="btn btn--primary">{t('checkout.success.toBookings')}</Link>
          <Link to="/katalog" className="btn btn--outline">{t('cart.goCatalog')}</Link>
        </div>
      </div>
    </div>
  );
}
