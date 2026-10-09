import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useApp, useAuth, useCart } from '../store';
import { Spinner } from '../components';
import { EVENT_TYPES, locName } from '../utils';

/**
 * Package templates: ordered slots per event type.
 * qty(g) — quantity as a function of guest count.
 * match — optional keyword filter inside the category.
 */
const TEMPLATES = {
  toy: [
    { slug: 'stollar', match: 'stol', qty: (g) => Math.max(1, Math.ceil(g / 10)) },
    { slug: 'stollar', match: 'stul', qty: (g) => Math.max(1, g) },
    { slug: 'chodirlar', qty: () => 1 },
    { slug: 'dekor', qty: () => 1 },
    { slug: 'fotozona', qty: () => 1 },
    { slug: 'audio', qty: () => 1 },
    { slug: 'yoruglik', qty: () => 1 },
    { slug: 'idish', qty: (g) => Math.max(1, Math.ceil(g / 100)) },
    { slug: 'catering', qty: (g) => Math.max(1, g) },
    { slug: 'fotograf', qty: () => 1 },
    { slug: 'videograf', qty: () => 1, optional: true },
    { slug: 'dj', qty: () => 1, optional: true },
    { slug: 'ornatish', qty: () => 1 },
    { slug: 'yetkazish', qty: () => 1 },
  ],
  tugilgan_kun: [
    { slug: 'dekor', qty: () => 1 },
    { slug: 'fotozona', qty: () => 1 },
    { slug: 'stollar', match: 'stol', qty: (g) => Math.max(1, Math.ceil(g / 10)) },
    { slug: 'stollar', match: 'stul', qty: (g) => Math.max(1, g) },
    { slug: 'audio', qty: () => 1 },
    { slug: 'yoruglik', qty: () => 1, optional: true },
    { slug: 'catering', qty: (g) => Math.max(1, g) },
    { slug: 'idish', qty: (g) => Math.max(1, Math.ceil(g / 100)) },
    { slug: 'dj', qty: () => 1, optional: true },
    { slug: 'yetkazish', qty: () => 1 },
  ],
  korporativ: [
    { slug: 'joylar', qty: () => 1, optional: true },
    { slug: 'projektor', qty: () => 1 },
    { slug: 'audio', qty: () => 1 },
    { slug: 'yoruglik', qty: () => 1, optional: true },
    { slug: 'catering', qty: (g) => Math.max(1, g) },
    { slug: 'fotozona', qty: () => 1, optional: true },
    { slug: 'fotograf', qty: () => 1, optional: true },
    { slug: 'yetkazish', qty: () => 1 },
  ],
  bitiruv: [
    { slug: 'joylar', qty: () => 1, optional: true },
    { slug: 'audio', qty: () => 1 },
    { slug: 'yoruglik', qty: () => 1 },
    { slug: 'fotozona', qty: () => 1 },
    { slug: 'catering', qty: (g) => Math.max(1, g) },
    { slug: 'dj', qty: () => 1, optional: true },
    { slug: 'fotograf', qty: () => 1, optional: true },
  ],
  boshqa: [
    { slug: 'dekor', qty: () => 1, optional: true },
    { slug: 'audio', qty: () => 1 },
    { slug: 'fotozona', qty: () => 1, optional: true },
    { slug: 'catering', qty: (g) => Math.max(1, g) },
    { slug: 'yetkazish', qty: () => 1, optional: true },
  ],
};

export default function PackageBuilder() {
  const { t, lang, fmtMoney, toast } = useApp();
  const { user } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    event_type: 'toy', guests: 100, event_date: '', location: '', budget: 20000000,
  });
  const [pool, setPool] = useState(null);
  const [lines, setLines] = useState(null);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const generate = async () => {
    setLines(null);
    try {
      const qs = new URLSearchParams({ limit: '60' });
      if (form.event_date) qs.set('date', form.event_date);
      const d = await api.get(`/api/products?${qs.toString()}`);
      setPool(d.items);
      setLines(buildPackage(d.items, form));
    } catch {
      toast(t('common.error'), 'error');
    }
  };

  function buildPackage(products, f) {
    const template = TEMPLATES[f.event_type] || TEMPLATES.boshqa;
    const g = Math.max(1, Number(f.guests) || 1);
    const budget = Number(f.budget) || 0;
    const result = [];
    let spent = 0;

    for (const slot of template) {
      const qty = slot.qty(g);
      let candidates = products.filter((p) => p.category?.slug === slot.slug && p.available);
      if (slot.match) {
        candidates = candidates.filter((p) =>
          `${p.name} ${p.name_ru} ${p.name_en}`.toLowerCase().includes(slot.match));
      }
      if (!candidates.length) continue;
      candidates = [...candidates].sort((a, b) => a.price - b.price);

      // pick the cheapest first; upgrade to best-rated if budget allows
      let pick = candidates[0];
      for (const c of [...candidates].sort((a, b) => b.rating - a.rating)) {
        const delta = (c.price - pick.price) * qty;
        if (budget === 0 || spent + pick.price * qty + delta <= budget) { pick = c; break; }
      }
      const cost = pick.price * qty;
      if (budget > 0 && spent + cost > budget && slot.optional) continue; // skip optional overflow
      spent += cost;
      result.push({ slot, product: pick, candidates, quantity: qty, cost });
    }
    return result;
  }

  const total = useMemo(() => (lines || []).reduce((s, l) => s + l.cost, 0), [lines]);
  const overBudget = form.budget > 0 && total > Number(form.budget);
  const pct = form.budget > 0 ? Math.min(100, (total / Number(form.budget)) * 100) : 0;

  const swapLine = (idx, productId) => {
    setLines((prev) => prev.map((l, i) => {
      if (i !== idx) return l;
      const product = l.candidates.find((c) => c.id === Number(productId));
      if (!product) return l;
      return { ...l, product, cost: product.price * l.quantity };
    }));
  };

  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const addAllToCart = () => {
    cart.addMany(lines.map((l) => ({ product: l.product, quantity: l.quantity })));
    toast(t('product.addedToCart'));
    navigate('/savat');
  };

  const savePackage = async () => {
    if (!user) { toast(t('builder.loginToSave'), 'error'); navigate('/kirish?next=/paket'); return; }
    setSaving(true);
    try {
      await api.post('/api/packages', {
        event_type: form.event_type,
        guests: Number(form.guests),
        event_date: form.event_date,
        location: form.location,
        budget: Number(form.budget),
        total,
        items: lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
      });
      toast(t('builder.saved'));
    } catch {
      toast(t('common.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container page">
      <div className="page__head">
        <h1 className="page__title">🧩 {t('builder.title')}</h1>
        <p className="page__subtitle">{t('builder.subtitle')}</p>
      </div>

      <div className="panel-grid panel-grid--wide">
        {/* form */}
        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="field">
            <label>{t('builder.eventType')}</label>
            <select className="select" value={form.event_type} onChange={(e) => set('event_type', e.target.value)}>
              {EVENT_TYPES.map((et) => <option key={et} value={et}>{t(`builder.eventType.${et}`)}</option>)}
            </select>
          </div>
          <div className="field">
            <label>{t('builder.guests')}</label>
            <input type="number" className="input" min="1" value={form.guests}
              onChange={(e) => set('guests', e.target.value)} />
          </div>
          <div className="field">
            <label>{t('builder.date')}</label>
            <input type="date" className="input" min={today} value={form.event_date}
              onChange={(e) => set('event_date', e.target.value)} />
          </div>
          <div className="field">
            <label>{t('builder.location')}</label>
            <input type="text" className="input" placeholder={t('builder.locationPh')}
              value={form.location} onChange={(e) => set('location', e.target.value)} />
          </div>
          <div className="field">
            <label>{t('builder.budget')}</label>
            <input type="number" className="input" min="0" step="100000" value={form.budget}
              onChange={(e) => set('budget', e.target.value)} />
          </div>
          <button className="btn btn--primary btn--block btn--lg" onClick={generate}>
            ⚡ {t('builder.generate')}
          </button>
        </div>

        {/* results */}
        <div>
          {!lines && !pool && (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 52 }}>🎪</div>
              <p className="muted">{t('builder.subtitle')}</p>
            </div>
          )}
          {pool && !lines && <Spinner big />}
          {lines && (
            <div className="card">
              <div className="row-between mb">
                <h2 className="card__title" style={{ margin: 0 }}>{t('builder.result.title')}</h2>
                <span className="tag">{lines.length} {t('builder.result.items')} · {form.guests} {t('builder.result.guestsHint')}</span>
              </div>

              {form.budget > 0 && (
                <div className="mb">
                  <div className="row-between" style={{ fontSize: 13.5 }}>
                    <span className="muted">{t('builder.result.budget')}: <strong>{fmtMoney(Number(form.budget))}</strong></span>
                    <span style={{ fontWeight: 800, color: overBudget ? 'var(--red)' : 'var(--green)' }}>
                      {overBudget ? `⚠ ${t('builder.result.over')}` : t('builder.result.within')}
                    </span>
                  </div>
                  <div className="budget-meter">
                    <div className={`budget-meter__fill${overBudget ? ' over' : ''}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="row-between" style={{ fontSize: 13.5 }}>
                    <span className="muted">{t('builder.result.total')}: <strong>{fmtMoney(total)}</strong></span>
                    {!overBudget && (
                      <span className="muted">{t('builder.result.remaining')}: <strong>{fmtMoney(Number(form.budget) - total)}</strong></span>
                    )}
                  </div>
                </div>
              )}

              {lines.map((l, idx) => (
                <div key={idx} className="builder-line">
                  <div className="builder-line__img">
                    {l.product.image
                      ? <img src={l.product.image} alt="" />
                      : <div className="img-fallback" style={{ fontSize: 20 }}>{l.product.category?.icon}</div>}
                  </div>
                  <div className="builder-line__body">
                    <p className="builder-line__name">{locName(l.product, lang)}</p>
                    <div className="builder-line__meta">
                      {fmtMoney(l.product.price)} × {l.quantity} {t('builder.qty')}
                    </div>
                    {l.candidates.length > 1 && (
                      <select className="select" style={{ marginTop: 6, padding: '6px 10px', fontSize: 12.5, maxWidth: 240 }}
                        value={l.product.id} onChange={(e) => swapLine(idx, e.target.value)}>
                        {l.candidates.map((c) => (
                          <option key={c.id} value={c.id}>{locName(c, lang)} — {fmtMoney(c.price)}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="builder-line__right">
                    <strong>{fmtMoney(l.cost)}</strong>
                    <div><button className="link-btn" onClick={() => removeLine(idx)}>✕ {t('builder.remove')}</button></div>
                  </div>
                </div>
              ))}

              <hr className="divider" />
              <div className="summary-row total">
                <span>{t('common.total')}</span>
                <span>{fmtMoney(total)}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                <button className="btn btn--primary" style={{ flex: 1 }} onClick={addAllToCart}>
                  🛒 {t('builder.addAll')}
                </button>
                <button className="btn btn--outline" style={{ flex: 1 }} onClick={savePackage} disabled={saving}>
                  💾 {saving ? '...' : t('builder.savePackage')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
