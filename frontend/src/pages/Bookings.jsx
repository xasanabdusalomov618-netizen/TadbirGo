import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useApp, useAuth } from '../store';
import { EmptyState, PhotoField, Spinner, StatusBadge, Stars } from '../components';
import { EVENT_TYPES, STATUS_ORDER, locName } from '../utils';

const isCustomerStage = (s) => ['yangi', 'kutmoqda'].includes(s);

export function BookingsList() {
  const { t, fmtMoney, fmtDate } = useApp();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/api/bookings').then(setData).catch(() => setData({ items: [] }));
  }, []);

  if (!data) return <div className="container page"><Spinner big /></div>;

  return (
    <div className="container page">
      <h1 className="page__title">📦 {t('bookings.title')}</h1>
      {data.items.length === 0 ? (
        <EmptyState icon="📦" title={t('bookings.empty')} text={t('bookings.emptyText')}
          action={<Link to="/katalog" className="btn btn--primary">{t('cart.goCatalog')}</Link>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.items.map((b) => (
            <Link key={b.id} to={`/buyurtma/${b.id}`} className="card booking-card" style={{ marginBottom: 0 }}>
              <div className="booking-card__head">
                <span className="booking-card__code">🧾 {b.code}</span>
                <StatusBadge status={b.status} />
              </div>
              <div className="booking-card__meta">
                <span>🏪 {b.seller_name}</span>
                <span>📅 {fmtDate(b.event_date)}</span>
                <span>🛍 {b.items_count} {t('common.items')}</span>
              </div>
              <div className="row-between">
                <strong style={{ fontSize: 17 }}>{fmtMoney(b.total)}</strong>
                <span className="link-btn">{t('bookings.detail.title')} →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// =================================================================
export function BookingDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { t, lang, fmtMoney, fmtDate, toast } = useApp();
  const { user } = useAuth();
  const [b, setB] = useState(null);
  const [err, setErr] = useState('');
  const [payMethod, setPayMethod] = useState('click');
  const [reviews, setReviews] = useState({});

  const load = useCallback(() => {
    api.get(`/api/bookings/${id}`).then(setB).catch((e) => setErr(e.message));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (params.get('pay') === '1' && b && b.status === 'yangi') {
      document.getElementById('pay-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [b, params]);

  if (err) return <div className="container page"><EmptyState icon="😕" title={t('common.error')} text={err} /></div>;
  if (!b) return <div className="container page"><Spinner big /></div>;

  const isSeller = user?.role === 'seller';
  const isCustomer = user && b.customer_id === user.id;

  const pay = async () => {
    try {
      const d = await api.post(`/api/bookings/${id}/pay`, { method: payMethod });
      setB(d);
      toast(t('checkout.pay.success'));
    } catch (e) { toast(e.message, 'error'); }
  };

  const cancel = async () => {
    if (!window.confirm(t('bookings.cancelConfirm'))) return;
    try {
      await api.post(`/api/bookings/${id}/cancel`);
      load();
      toast(t('common.success'));
    } catch (e) { toast(e.message, 'error'); }
  };

  const setStatus = async (status) => {
    try {
      const d = await api.post(`/api/bookings/${id}/status`, { status });
      setB(d);
      toast(t('common.success'));
    } catch (e) { toast(e.message, 'error'); }
  };

  const submitReview = async (productId, rating, comment, photo = '') => {
    try {
      await api.post('/api/reviews', { booking_id: b.id, product_id: productId, rating, comment, photo_url: photo });
      setReviews((r) => ({ ...r, [productId]: { rating, comment } }));
      toast(t('bookings.review.done'));
      load();
    } catch (e) { toast(e.message, 'error'); }
  };

  const stepIdx = STATUS_ORDER.indexOf(b.status);

  return (
    <div className="container page">
      <Link to="/buyurtmalarim" className="link-btn">← {t('common.back')}</Link>
      <div className="row-between mt" style={{ marginTop: 10 }}>
        <h1 className="page__title" style={{ margin: 0 }}>🧾 {b.code}</h1>
        <StatusBadge status={b.status} />
      </div>

      {/* progress tracker */}
      {b.status !== 'bekor' && (
        <div className="card mt">
          <div className="tracker">
            {STATUS_ORDER.map((s, i) => (
              <span key={s} className={`tracker__dot${i <= stepIdx ? ' done' : ''}`}>
                <i />{t(`status.${s}`)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="panel-grid panel-grid--wide" style={{ marginTop: 14 }}>
        <div>
          {/* items */}
          <div className="card">
            <h3 className="card__title">{t('bookings.detail.items')}</h3>
            {b.items.map((i) => (
              <div key={i.id} className="cart-row">
                <div className="cart-row__img">
                  {i.image ? <img src={i.image} alt="" /> : <div className="img-fallback">🎁</div>}
                </div>
                <div className="cart-row__body">
                  <p className="cart-row__name">{i.name}</p>
                  <div className="cart-row__meta">{fmtMoney(i.price)} × {i.quantity}</div>
                </div>
                <div className="cart-row__right"><strong>{fmtMoney(i.total)}</strong></div>
              </div>
            ))}

            {/* reviews */}
            {b.can_review && (
              <div className="mt">
                <h3 className="card__title">⭐ {t('bookings.review.title')}</h3>
                {b.items.map((i) => {
                  const done = (b.reviewed_products || []).includes(i.product_id) || reviews[i.product_id];
                  if (done) {
                    const r = reviews[i.product_id] || (b.reviews || []).find((x) => x.product_id === i.product_id);
                    return (
                      <div key={i.id} className="muted" style={{ fontSize: 13.5, padding: '6px 0' }}>
                        ✅ {i.name} — <Stars value={r?.rating || 5} />
                      </div>
                    );
                  }
                  return <ReviewForm key={i.id} name={i.name} onSubmit={(rating, comment, photo) => submitReview(i.product_id, rating, comment, photo)} t={t} />;
                })}
              </div>
            )}
          </div>

          {/* payment */}
          {isCustomer && b.status === 'yangi' && (
            <div className="card mt" id="pay-section">
              <h3 className="card__title">💳 {t('checkout.pay.title')}</h3>
              <p className="muted" style={{ fontSize: 14 }}>{t('checkout.payment.hint')}</p>
              <div className="field">
                <label>{t('checkout.pay.method')}</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[['click', '💙 Click'], ['payme', '💚 Payme'], ['naqd', '💵 Naqd']].map(([val, label]) => (
                    <label key={val} className={`radio-card${payMethod === val ? ' selected' : ''}`} style={{ flex: '1 1 120px', marginBottom: 0 }}>
                      <input type="radio" checked={payMethod === val} onChange={() => setPayMethod(val)} />
                      <span className="radio-card__title">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button className="btn btn--primary btn--block btn--lg" onClick={pay}>
                💳 {t('checkout.pay.pay')} — {fmtMoney(b.total)}
              </button>
            </div>
          )}
        </div>

        {/* side info */}
        <div>
          <div className="card">
            <h3 className="card__title">{t('bookings.detail.title')}</h3>
            <div className="summary-row"><span>{t('bookings.eventDate')}</span><strong>{fmtDate(b.event_date)}</strong></div>
            <div className="summary-row"><span>{t('bookings.eventType')}</span><strong>{t(`builder.eventType.${b.event_type}`)}</strong></div>
            <div className="summary-row"><span>{t('common.location')}</span><strong>{b.location}</strong></div>
            {b.guests > 0 && <div className="summary-row"><span>{t('bookings.guests')}</span><strong>{b.guests}</strong></div>}
            <div className="summary-row"><span>{t('bookings.seller')}</span><strong>{b.seller_name}</strong></div>
            <div className="summary-row"><span>{t('bookings.detail.payment')}</span>
              <span className={`tag ${b.payment_status === 'paid' ? 'tag--green' : 'tag--amber'}`}>
                {b.payment_status === 'paid' ? `✅ ${t('bookings.detail.paid')}${b.payment_method ? ` (${b.payment_method})` : ''}` : `⏳ ${t('bookings.detail.pending')}`}
              </span>
            </div>
            <hr className="divider" />
            <div className="summary-row"><span>{t('common.subtotal')}</span><span>{fmtMoney(b.subtotal)}</span></div>
            <div className="summary-row"><span>🚚 {t('bookings.detail.delivery')}</span><span>{fmtMoney(b.delivery_fee)}</span></div>
            <div className="summary-row"><span>🔧 {t('bookings.detail.installation')}</span><span>{fmtMoney(b.installation_fee)}</span></div>
            <div className="summary-row"><span>📦 {t('bookings.detail.pickup')}</span><span>{fmtMoney(b.pickup_fee)}</span></div>
            <div className="summary-row total"><span>{t('common.total')}</span><span>{fmtMoney(b.total)}</span></div>
          </div>

          {/* disputes */}
          {(isCustomer || isSeller) && <DisputePanel b={b} isCustomer={isCustomer} onChange={setB} />}

          {/* actions */}
          <div className="card mt">
            <h3 className="card__title">{t('common.actions')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {isSeller && b.status === 'kutmoqda' && (
                <>
                  <button className="btn btn--success btn--block" onClick={() => setStatus('tasdiqlandi')}>✅ {t('seller.order.accept')}</button>
                  <button className="btn btn--danger btn--block" onClick={() => setStatus('bekor')}>✕ {t('seller.order.reject')}</button>
                </>
              )}
              {isSeller && !['yangi', 'kutmoqda', 'yakunlandi', 'bekor'].includes(b.status) && b.next_statuses.filter((s) => s !== 'bekor').map((s) => (
                <button key={s} className="btn btn--primary btn--block" onClick={() => setStatus(s)}>
                  → {t(`status.${s}`)}
                </button>
              ))}
              {isSeller && !['yangi', 'yakunlandi', 'bekor'].includes(b.status) && b.next_statuses.includes('bekor') && (
                <button className="btn btn--danger btn--block" onClick={() => setStatus('bekor')}>✕ {t('bookings.cancel')}</button>
              )}
              {isCustomer && isCustomerStage(b.status) && b.payment_status === 'paid' && (
                <button className="btn btn--danger btn--block" onClick={cancel}>✕ {t('bookings.cancel')}</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const DISPUTE_REASONS = ['late_delivery', 'no_show', 'damaged', 'wrong_items', 'payment', 'other'];

function DisputePanel({ b, isCustomer, onChange }) {
  const { t, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('late_delivery');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const disputes = b.disputes || [];
  const hasOpen = disputes.some((d) => d.status === 'open');
  const eligible = !['yangi', 'bekor'].includes(b.status);

  const submit = async () => {
    if (description.trim().length < 5) { toast(t('dispute.needDesc'), 'error'); return; }
    setBusy(true);
    try {
      const fresh = await api.post(`/api/bookings/${b.id}/dispute`, { reason, description });
      onChange(fresh);
      setOpen(false);
      setDescription('');
      toast(t('dispute.opened'));
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card mt">
      <div className="row-between">
        <h3 className="card__title" style={{ margin: 0 }}>🛟 {t('dispute.title')}</h3>
        {eligible && !hasOpen && !open && (
          <button className="btn btn--outline btn--sm" onClick={() => setOpen(true)}>⚠️ {t('dispute.open')}</button>
        )}
      </div>

      {disputes.length === 0 && !open && <p className="muted" style={{ fontSize: 13.5, marginTop: 10 }}>{t('dispute.none')}</p>}

      {disputes.map((d) => (
        <div key={d.id} className="dispute-item">
          <div className="row-between">
            <strong>{t(`dispute.reason.${d.reason}`)}</strong>
            <span className={`tag ${d.status === 'open' ? 'tag--amber' : d.status === 'resolved' ? 'tag--green' : ''}`}>
              {t(`dispute.status.${d.status}`)}
            </span>
          </div>
          {d.description && <p className="muted" style={{ fontSize: 13.5, margin: '6px 0 0' }}>{d.description}</p>}
          {d.resolution && <p style={{ fontSize: 13.5, margin: '6px 0 0' }}>✔ {d.resolution}</p>}
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{d.opened_by_name} · {d.created_at}</div>
        </div>
      ))}

      {open && (
        <div className="mt">
          <div className="field">
            <label>{t('dispute.reasonLabel')}</label>
            <select className="select" value={reason} onChange={(e) => setReason(e.target.value)}>
              {DISPUTE_REASONS.map((r) => <option key={r} value={r}>{t(`dispute.reason.${r}`)}</option>)}
            </select>
          </div>
          <div className="field">
            <label>{t('dispute.descLabel')}</label>
            <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder={isCustomer ? t('dispute.phCustomer') : t('dispute.phSeller')} style={{ minHeight: 80 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--primary btn--sm" onClick={submit} disabled={busy}>{t('dispute.submit')}</button>
            <button className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewForm({ name, onSubmit, t }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState('');
  return (
    <div className="card mb" style={{ background: 'var(--card-2)', padding: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{name}</div>
      <div className="star-input mb">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" className={n <= rating ? 'on' : ''} onClick={() => setRating(n)}>★</button>
        ))}
      </div>
      <textarea className="textarea" placeholder={t('bookings.review.text')} value={comment}
        onChange={(e) => setComment(e.target.value)} style={{ minHeight: 60, marginBottom: 8 }} />
      <div className="mb"><PhotoField value={photo} onChange={setPhoto} t={t} label={t('review.addPhoto')} /></div>
      <button className="btn btn--primary btn--sm" onClick={() => onSubmit(rating, comment, photo)}>
        {t('bookings.review.submit')}
      </button>
    </div>
  );
}
