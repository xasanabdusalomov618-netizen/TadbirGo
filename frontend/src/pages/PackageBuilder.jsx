import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useApp, useAuth, useCart } from '../store';
import { CITIES, EVENT_TYPES, locName } from '../utils';
import { Calendar, MapPreview, Spinner, Stars } from '../components';

/**
 * Algorithmic package assembly.
 *
 * Every slot describes one kind of item the event needs. A slot is applied when
 * its condition (event type / guest count) holds and its service group was
 * selected by the user. Candidates come from the catalog category; the picker
 * prefers products in the same city and higher ratings, while staying inside
 * the remaining budget. Optional slots are dropped first when the budget runs out.
 */
const HOURS = 4; // default duration for hourly-priced staff and hosts

const SLOTS = [
  // equipment
  { role: 'tables', group: 'equipment', slug: 'stollar', match: 'stol', qty: (g) => Math.max(1, Math.ceil(g / 10)), prio: 1 },
  { role: 'chairs', group: 'equipment', slug: 'stollar', match: 'stul', qty: (g) => Math.max(1, g), prio: 1 },
  { role: 'tent', group: 'equipment', slug: 'chodirlar', qty: () => 1, prio: 2, when: (c) => c.g >= 60 },
  { role: 'audio', group: 'equipment', slug: 'audio', qty: () => 1, prio: 2, sizeSort: true },
  { role: 'tableware', group: 'equipment', slug: 'idish', qty: (g) => Math.max(1, Math.ceil(g / 100)), prio: 3 },
  { role: 'projector', group: 'equipment', slug: 'projektor', qty: () => 1, prio: 3, when: (c) => ['korporativ', 'konferensiya'].includes(c.type) },
  { role: 'lighting', group: 'equipment', slug: 'yoruglik', qty: () => 1, prio: 4, optional: true },
  { role: 'decor', group: 'equipment', slug: 'dekor', qty: () => 1, prio: 5, optional: true, when: (c) => ['toy', 'yubiley', 'tugilgan_kun'].includes(c.type) },
  { role: 'photozone', group: 'equipment', slug: 'fotozona', qty: () => 1, prio: 6, optional: true, when: (c) => ['toy', 'yubiley', 'tugilgan_kun'].includes(c.type) },
  // venue
  { role: 'venue', group: 'venue', slug: 'joylar', qty: () => 1, prio: 2, when: (c) => c.g >= 50 },
  // performers, hosts & staff
  { role: 'mc', group: 'performers', slug: 'boshlovchi', qty: (g, p) => (p.price_type === 'soat' ? HOURS : 1), prio: 1 },
  { role: 'photographer', group: 'performers', slug: 'fotograf', qty: (g, p) => (p.price_type === 'soat' ? HOURS : 1), prio: 3 },
  { role: 'photographer2', group: 'performers', slug: 'fotograf', qty: (g, p) => (p.price_type === 'soat' ? HOURS : 1), prio: 4, optional: true, when: (c) => c.g >= 150 },
  { role: 'videographer', group: 'performers', slug: 'videograf', qty: () => 1, prio: 6, optional: true, when: (c) => ['toy', 'yubiley'].includes(c.type) },
  { role: 'dj', group: 'performers', slug: 'dj', qty: (g, p) => (p.price_type === 'soat' ? HOURS : 1), prio: 4, optional: true, when: (c) => ['toy', 'yubiley', 'tugilgan_kun'].includes(c.type) },
  { role: 'animator', group: 'performers', slug: 'animator', qty: () => 1, prio: 4, optional: true, when: (c) => c.type === 'tugilgan_kun' },
  { role: 'waiters', group: 'performers', slug: 'xizmatchi', match: 'ofitsiant', qty: (g, p) => { const n = Math.max(2, Math.ceil(g / 25)); return p.price_type === 'soat' ? n * HOURS : n; }, prio: 2, when: (c) => c.g >= 30 },
  { role: 'security', group: 'performers', slug: 'xizmatchi', match: 'xavfsizlik', qty: (g, p) => { const n = Math.max(1, Math.ceil(g / 100)); return p.price_type === 'soat' ? n * 6 : n; }, prio: 5, optional: true, when: (c) => c.g >= 150 },
  // catering
  { role: 'catering', group: 'catering', slug: 'catering', qty: (g) => Math.max(1, g), prio: 1 },
  // setup & delivery
  { role: 'delivery', group: 'setup', slug: 'yetkazish', qty: () => 1, prio: 2 },
  { role: 'installation', group: 'setup', slug: 'ornatish', qty: () => 1, prio: 2 },
];

const SERVICES = [
  { key: 'equipment', icon: '🪑' },
  { key: 'venue', icon: '🏛️' },
  { key: 'performers', icon: '🎤' },
  { key: 'catering', icon: '🍢' },
  { key: 'setup', icon: '🔧' },
];

const PRESETS = [5000000, 10000000, 20000000, 50000000];
const GUEST_PRESETS = [50, 100, 200, 500, 1000];
const TIMES = ['10:00', '12:00', '14:00', '16:00', '18:00', '19:00', '20:00'];

/** Pick the best candidate that fits the remaining budget; falls back to cheapest. */
function pickCandidate(cands, qtyOf, remaining, sizeSort, g) {
  const cost = (p) => p.price * qtyOf(p);
  let ordered;
  if (sizeSort) {
    // large audiences get the most powerful (most expensive) rig; small ones the cheapest
    ordered = [...cands].sort((a, b) => (g > 200 ? b.price - a.price : a.price - b.price));
  } else {
    ordered = [...cands].sort((a, b) => (b.rating - a.rating) || (a.price - b.price));
  }
  if (!Number.isFinite(remaining)) return ordered[0];
  const fit = ordered.find((p) => cost(p) <= remaining * 0.45);
  if (fit) return fit;
  return [...cands].sort((a, b) => cost(a) - cost(b))[0];
}

export function assemblePackage({ products, form, city }) {
  const g = Math.max(0, Number(form.guests) || 0);
  const ctx = { g, type: form.event_type };
  const budget = Number(form.budget) || 0;
  const selected = new Set(form.services);
  const pool = products;
  const lines = [];
  const missing = [];
  let spent = 0;
  let dropped = 0;

  const applicable = SLOTS
    .filter((s) => selected.has(s.group))
    .filter((s) => !s.when || s.when(ctx))
    .sort((a, b) => a.prio - b.prio);

  for (const slot of applicable) {
    const cands = pool.filter((p) => p.category.slug === slot.slug
      && (!slot.match || p.name.toLowerCase().includes(slot.match)));
    if (!cands.length) { missing.push(slot.role); continue; }
    // same-city candidates are preferred
    const local = cands.filter((p) => city && p.location === city.name);
    const base = local.length ? local : cands;
    const remaining = budget > 0 ? budget - spent : Infinity;
    const pick = pickCandidate(base, (p) => slot.qty(g, p), remaining, slot.sizeSort, g);
    const qty = slot.qty(g, pick);
    const cost = pick.price * qty;
    if (slot.optional && budget > 0 && spent + cost > budget) { dropped += 1; continue; }
    spent += cost;
    lines.push({ role: slot.role, group: slot.group, product: pick, qty, cost });
  }
  return { lines, total: spent, dropped, missing, budget, over: budget > 0 && spent > budget };
}

export default function PackageBuilder() {
  const { t, lang, fmtMoney, toast } = useApp();
  const { user } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [products, setProducts] = useState(null);
  const [excluded, setExcluded] = useState(() => new Set());
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    event_type: 'toy', guests: 100, event_date: '', event_time: '18:00',
    city: 'toshkent', location: '', budget: 20000000,
    services: ['equipment', 'performers', 'catering', 'setup'],
  });

  useEffect(() => {
    api.get('/api/products?limit=60&sort=rating').then((d) => setProducts(d.items)).catch(() => setProducts([]));
  }, []);

  const city = CITIES.find((c) => c.key === form.city) || null;
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setExcluded(new Set()); };
  const toggleService = (key) => set('services', form.services.includes(key)
    ? form.services.filter((x) => x !== key) : [...form.services, key]);

  const result = useMemo(() => (products ? assemblePackage({ products, form, city }) : null),
    [products, form, city]);

  const visibleLines = result ? result.lines.filter((l) => !excluded.has(l.product.id)) : [];
  const visibleTotal = visibleLines.reduce((s, l) => s + l.cost, 0);
  const pct = form.budget > 0 ? Math.min(100, (visibleTotal / form.budget) * 100) : 0;
  const overBudget = form.budget > 0 && visibleTotal > form.budget;

  const STEPS = [t('builder.step.1'), t('builder.step.2'), t('builder.step.3'), t('builder.step.4')];

  const canNext = () => {
    if (step === 1) return Number(form.guests) >= 1 && form.event_type;
    if (step === 2) return !!form.event_date;
    if (step === 3) return form.services.length > 0;
    return true;
  };

  const addAll = () => {
    if (!visibleLines.length) return;
    visibleLines.forEach((l) => cart.add(l.product, l.qty));
    toast(t('builder.added', { n: visibleLines.length }));
    navigate('/savat');
  };

  const save = async () => {
    if (!user) { navigate('/kirish?next=/paket'); return; }
    setSaving(true);
    try {
      await api.post('/api/packages', {
        name: `${t(`builder.eventType.${form.event_type}`)} · ${form.guests}`,
        event_type: form.event_type, guests: Number(form.guests), event_date: form.event_date,
        location: `${city?.name || ''} ${form.location}`.trim(), budget: Number(form.budget), total: visibleTotal,
        items: visibleLines.map((l) => ({ product_id: l.product.id, quantity: l.qty })),
      });
      toast(t('builder.saved'));
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const GROUP_LABEL = {
    equipment: t('builder.svc.equipment'), venue: t('builder.svc.venue'), performers: t('builder.svc.performers'),
    catering: t('builder.svc.catering'), setup: t('builder.svc.setup'),
  };

  if (!products) return <div className="container page"><Spinner big /></div>;

  return (
    <div className="container page">
      <div className="page__head">
        <h1 className="page__title">🧩 {t('builder.title')}</h1>
        <p className="page__subtitle">{t('builder.subtitle')}</p>
      </div>

      <ol className="stepper stepper--4" aria-label="wizard">
        {STEPS.map((label, i) => (
          <li key={i} className={`stepper__item${step === i + 1 ? ' active' : ''}${step > i + 1 ? ' done' : ''}`}
            onClick={() => step > i + 1 && setStep(i + 1)} style={{ cursor: step > i + 1 ? 'pointer' : 'default' }}>
            <span className="stepper__num">{step > i + 1 ? '✓' : i + 1}</span>
            <span>{label}</span>
          </li>
        ))}
      </ol>

      <div className="card wizard-card">
        {step === 1 && (
          <div className="wizard-step">
            <h2 className="card__title">1. {t('builder.step.1')}</h2>
            <div className="field">
              <label>{t('builder.eventType')}</label>
              <div className="chip-grid">
                {EVENT_TYPES.map((et) => (
                  <button key={et} type="button" className={`choice-chip${form.event_type === et ? ' active' : ''}`}
                    onClick={() => set('event_type', et)}>
                    {({ toy: '💍', yubiley: '🥂', korporativ: '💼', tugilgan_kun: '🎂', konferensiya: '🎤' })[et]} {t(`builder.eventType.${et}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>{t('builder.guests')}: <strong className="grad-text">{form.guests}</strong></label>
              <input type="range" className="range" min="10" max="1500" step="10" value={form.guests}
                onChange={(e) => set('guests', Number(e.target.value))} />
              <div className="chip-grid" style={{ marginTop: 10 }}>
                {GUEST_PRESETS.map((n) => (
                  <button key={n} type="button" className={`choice-chip${Number(form.guests) === n ? ' active' : ''}`}
                    onClick={() => set('guests', n)}>{n}</button>
                ))}
              </div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>{t('builder.guestsHint')}</div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-step">
            <h2 className="card__title">2. {t('builder.step.2')}</h2>
            <div className="grid-2">
              <div>
                <div className="field">
                  <label>{t('builder.date')}</label>
                  <Calendar value={form.event_date} onChange={(d) => set('event_date', d)} lang={lang} t={t} />
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label>{t('builder.time')}</label>
                    <select className="select" value={form.event_time} onChange={(e) => set('event_time', e.target.value)}>
                      {TIMES.map((tm) => <option key={tm} value={tm}>{tm}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>{t('builder.city')}</label>
                    <select className="select" value={form.city} onChange={(e) => set('city', e.target.value)}>
                      {CITIES.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>{t('builder.location')}</label>
                  <input className="input" placeholder={t('builder.locationPh')} value={form.location}
                    onChange={(e) => set('location', e.target.value)} />
                </div>
              </div>
              <div>
                <MapPreview city={city} address={form.location} t={t} />
                <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>{t('builder.dateHint')}</p>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="wizard-step">
            <h2 className="card__title">3. {t('builder.step.3')}</h2>
            <div className="service-grid">
              {SERVICES.map((s) => {
                const on = form.services.includes(s.key);
                return (
                  <button key={s.key} type="button" className={`service-card${on ? ' active' : ''}`}
                    onClick={() => toggleService(s.key)} aria-pressed={on}>
                    <span className="service-card__icon">{s.icon}</span>
                    <strong>{GROUP_LABEL[s.key]}</strong>
                    <span className="service-card__check">{on ? '✓' : '+'}</span>
                  </button>
                );
              })}
            </div>
            <div className="field" style={{ marginTop: 18 }}>
              <label>{t('builder.budget')} (UZS)</label>
              <input type="number" className="input" min="0" step="100000" value={form.budget}
                onChange={(e) => set('budget', Number(e.target.value))} />
              <div className="chip-grid" style={{ marginTop: 10 }}>
                {PRESETS.map((n) => (
                  <button key={n} type="button" className={`choice-chip${Number(form.budget) === n ? ' active' : ''}`}
                    onClick={() => set('budget', n)}>{fmtMoney(n)}</button>
                ))}
                <button type="button" className={`choice-chip${form.budget === 0 ? ' active' : ''}`} onClick={() => set('budget', 0)}>
                  ∞ {t('builder.noLimit')}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 4 && result && (
          <div className="wizard-step">
            <h2 className="card__title">4. {t('builder.result.title')}</h2>

            <div className="budget-box">
              <div className="row-between">
                <span className="muted">{t('builder.result.total')}</span>
                <strong className="budget-box__total">{fmtMoney(visibleTotal)}</strong>
              </div>
              {form.budget > 0 && (
                <>
                  <div className="budget-meter">
                    <div className={`budget-meter__fill${overBudget ? ' over' : ''}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="row-between" style={{ fontSize: 13 }}>
                    <span className="muted">{Math.round((visibleTotal / form.budget) * 100)}% · {t('builder.result.budget')}: {fmtMoney(form.budget)}</span>
                    <span className={overBudget ? 'red-text' : 'muted'}>
                      {overBudget ? `⚠ ${t('builder.result.overText', { amount: fmtMoney(visibleTotal - form.budget) })}`
                        : `${t('builder.result.remaining')}: ${fmtMoney(form.budget - visibleTotal)}`}
                    </span>
                  </div>
                </>
              )}
              {result.dropped > 0 && <div className="warn-line">ℹ️ {t('builder.result.dropped', { n: result.dropped })}</div>}
              {result.missing.length > 0 && <div className="warn-line">ℹ️ {t('builder.result.missing', { n: result.missing.length })}</div>}
            </div>

            {visibleLines.length === 0 ? (
              <p className="muted mt">{t('builder.result.empty')}</p>
            ) : (
              <div className="pkg-lines">
                {visibleLines.map((l) => (
                  <div key={l.product.id} className="pkg-line">
                    <div className="pkg-line__img">
                      {l.product.image ? <img src={l.product.image} alt="" /> : <span>{l.product.category.icon}</span>}
                    </div>
                    <div className="pkg-line__body">
                      <span className="tag tag--blue">{t(`builder.role.${l.role}`)}</span>
                      <strong>{locName(l.product, lang)}</strong>
                      <div className="muted" style={{ fontSize: 12.5 }}>
                        {l.product.seller.company_name} · <Stars value={l.product.rating} />
                      </div>
                    </div>
                    <div className="pkg-line__qty">× {l.qty}</div>
                    <div className="pkg-line__cost">{fmtMoney(l.cost)}</div>
                    <button type="button" className="icon-x" title={t('builder.line.exclude')}
                      onClick={() => setExcluded((x) => new Set([...x, l.product.id]))}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {excluded.size > 0 && (
              <button type="button" className="btn btn--ghost btn--sm mt" onClick={() => setExcluded(new Set())}>
                ↺ {t('builder.line.restore')}
              </button>
            )}
          </div>
        )}

        <div className="wizard-nav">
          <button type="button" className="btn btn--outline" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
            ← {t('common.back')}
          </button>
          {step < 4 ? (
            <button type="button" className="btn btn--primary" disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>
              {step === 3 ? `🧠 ${t('builder.build')}` : t('common.next')} →
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn--outline" onClick={save} disabled={saving || !visibleLines.length}>
                💾 {t('builder.save')}
              </button>
              <button type="button" className="btn btn--primary btn--lg" onClick={addAll} disabled={!visibleLines.length}>
                🛒 {t('builder.addToCart')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
