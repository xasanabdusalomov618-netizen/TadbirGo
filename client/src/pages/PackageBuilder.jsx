import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Sparkles, Users, CalendarDays, MapPin, Wallet, ShoppingCart, Save, Trash2, PackageCheck,
  Lightbulb, ArrowRight, Plus, Check,
} from 'lucide-react';

import { api } from '../lib/api.js';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Loader, Chip, QtyStepper, EmptyState, Rating } from '../components/ui.jsx';
import { money, localize, formatDate } from '../lib/format.js';
import { categoryIcon } from '../lib/categoryIcons.js';
import { errorMessage } from '../lib/api.js';

const EVENT_TYPES = ['wedding', 'birthday', 'corporate', 'conference', 'graduation', 'other'];
const CITIES = ['Toshkent', 'Samarqand', 'Andijon', 'Buxoro', "Farg'ona", 'Namangan', 'Xorazm'];
const BUDGET_PRESETS = [10_000_000, 25_000_000, 50_000_000, 100_000_000];

export default function PackageBuilder() {
  const { t, i18n } = useTranslation();
  const cart = useCart();
  const toast = useToast();
  const { isAuthed } = useAuth();

  const [form, setForm] = useState({
    eventType: 'wedding',
    guests: 200,
    eventDate: '',
    city: 'Toshkent',
    budget: 50_000_000,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]); // {product, quantity}
  const [saved, setSaved] = useState([]);

  useEffect(() => {
    if (!isAuthed) return;
    api.get('/packages').then((res) => setSaved(res.items || [])).catch(() => setSaved([]));
  }, [isAuthed]);

  const build = async (event) => {
    event?.preventDefault();
    setLoading(true);
    try {
      const query = new URLSearchParams({
        guests: String(form.guests),
        budget: String(form.budget || 0),
      });
      if (form.city) query.set('city', form.city);
      if (form.eventDate) query.set('event_date', form.eventDate);
      const data = await api.get(`/products/recommendations?${query.toString()}`);
      setResult(data);
      setSelected(
        data.recommended.map((product) => ({
          product,
          quantity: product.suggested_quantity,
        }))
      );
    } catch (error) {
      toast.error(errorMessage(error, t));
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const subtotal = selected.reduce((sum, item) => {
      const price = item.product.price;
      return sum + (item.product.price_type === 'person' ? price * item.quantity : price * item.quantity);
    }, 0);
    return { subtotal, remaining: form.budget ? Math.max(0, form.budget - subtotal) : null };
  }, [selected, form.budget]);

  const setQty = (id, quantity) =>
    setSelected((list) => list.map((item) => (item.product.id === id ? { ...item, quantity: Math.max(1, quantity) } : item)));

  const removeItem = (id) => setSelected((list) => list.filter((item) => item.product.id !== id));

  const addAlternative = (product) => {
    if (selected.some((item) => item.product.id === product.id)) return;
    setSelected((list) => [...list, { product, quantity: product.suggested_quantity }]);
  };

  const addAllToCart = () => {
    selected.forEach((item) => cart.add(item.product, item.quantity, 1));
    cart.updateConfig({
      eventDate: form.eventDate,
      eventType: form.eventType,
      guests: form.guests,
      city: form.city,
    });
    toast.success(`${selected.length} ${t('package.itemsCount')} · ${t('product.added')}`);
  };

  const savePackage = async () => {
    if (!isAuthed) {
      toast.error(t('errors.loginRequiredText'));
      return;
    }
    try {
      await api.post('/packages', {
        name: `${t(`package.${form.eventType}`)} — ${form.guests} ${t('common.guests')}`,
        event_type: form.eventType,
        guests: form.guests,
        event_date: form.eventDate,
        city: form.city,
        budget: form.budget,
        estimate_total: totals.subtotal,
        items: selected.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
      });
      toast.success(t('package.saved'));
      const res = await api.get('/packages');
      setSaved(res.items || []);
    } catch (error) {
      toast.error(errorMessage(error, t));
    }
  };

  const loadSaved = async (pkg) => {
    setForm({
      ...form,
      eventType: pkg.event_type || form.eventType,
      guests: pkg.guests || form.guests,
      eventDate: pkg.event_date || '',
      city: pkg.city || form.city,
      budget: pkg.budget || form.budget,
    });
    setResult(null);
    setSelected([]);
    // fetch each saved product and restore quantities
    const items = await Promise.all(
      pkg.items.map(async (item) => {
        const product = await api.get(`/products/${item.product_id}`).catch(() => null);
        if (!product) return null;
        return { product, quantity: item.quantity };
      })
    );
    setSelected(items.filter(Boolean));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteSaved = async (id) => {
    await api.del(`/packages/${id}`).catch(() => {});
    const res = await api.get('/packages').catch(() => ({ items: [] }));
    setSaved(res.items || []);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* header */}
      <div className="mb-8">
        <span className="soft-chip !text-[11px]">
          <Sparkles size={13} style={{ color: 'var(--accent)' }} /> {t('nav.packages')}
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{t('package.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">{t('package.sub')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
        {/* builder form */}
        <aside>
          <form onSubmit={build} className="soft sticky top-20 space-y-5 p-5">
            <div>
              <p className="soft-label">{t('package.eventType')}</p>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_TYPES.map((type) => (
                  <Chip key={type} active={form.eventType === type} onClick={() => setForm({ ...form, eventType: type })}>
                    {t(`package.${type}`)}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <p className="soft-label flex items-center gap-1.5"><Users size={12} /> {t('package.guests')}</p>
              <input
                type="number"
                min="10"
                max="5000"
                value={form.guests}
                onChange={(e) => setForm({ ...form, guests: Math.max(1, Number(e.target.value) || 1) })}
                className="soft-input"
              />
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={Math.min(form.guests, 1000)}
                onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}
                className="mt-3 w-full accent-[color:var(--accent)]"
              />
            </div>

            <div>
              <p className="soft-label flex items-center gap-1.5"><CalendarDays size={12} /> {t('package.date')}</p>
              <input
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                className="soft-input"
              />
            </div>

            <div>
              <p className="soft-label flex items-center gap-1.5"><MapPin size={12} /> {t('package.city')}</p>
              <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="soft-input">
                <option value="all">{t('common.all')}</option>
                {CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>

            <div>
              <p className="soft-label flex items-center gap-1.5"><Wallet size={12} /> {t('package.budget')}</p>
              <input
                type="number"
                min="0"
                step="1000000"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: Math.max(0, Number(e.target.value) || 0) })}
                className="soft-input"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {BUDGET_PRESETS.map((preset) => (
                  <Chip key={preset} active={form.budget === preset} onClick={() => setForm({ ...form, budget: preset })}>
                    {money(preset, { compact: true })}
                  </Chip>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted">{t('package.budgetHint')}</p>
            </div>

            <button type="submit" disabled={loading} className="soft-btn-primary w-full">
              {loading ? t('package.generating') : (<><Sparkles size={17} /> {t('package.generate')}</>)}
            </button>
          </form>
        </aside>

        {/* results */}
        <section>
          {loading && <Loader label={t('package.generating')} />}

          {!loading && !result && selected.length === 0 && (
            <EmptyState
              icon={PackageCheck}
              title={t('package.title')}
              description={t('package.sub')}
              action={
                <button onClick={build} className="soft-btn-primary mt-3">
                  <Sparkles size={16} /> {t('package.generate')}
                </button>
              }
            />
          )}

          {!loading && selected.length > 0 && (
            <>
              <div className="soft mb-4 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('package.estimate')}</p>
                  <p className="text-3xl font-black" style={{ color: 'var(--accent)' }}>{money(totals.subtotal)}</p>
                  <p className="mt-1 text-xs text-muted">
                    {selected.length} {t('package.itemsCount')}
                    {totals.remaining !== null && (
                      <> · {t('package.remaining')}: <span className="font-bold">{money(totals.remaining)}</span></>
                    )}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button onClick={savePackage} className="soft-btn !py-2.5 !text-xs">
                    <Save size={15} /> {t('package.savePackage')}
                  </button>
                  <button onClick={addAllToCart} className="soft-btn-primary !py-2.5 !text-xs">
                    <ShoppingCart size={15} /> {t('package.addAllToCart')}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {selected.map(({ product, quantity }) => {
                  const Icon = categoryIcon(product.category?.slug);
                  return (
                    <div key={product.id} className="soft flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <Link to={`/products/${product.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="h-16 w-20 shrink-0 overflow-hidden rounded-2xl bg-surface2">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-white" style={{ background: product.category?.accent }}>
                              <Icon size={20} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: product.category?.accent }}>
                            {localize(product.category, 'name', i18n.language)}
                          </p>
                          <p className="truncate text-sm font-bold">{product.name}</p>
                          <div className="mt-1 flex items-center gap-3 text-[11px] text-muted">
                            <Rating value={product.rating} size={10} showValue={false} />
                            <span className="flex items-center gap-1"><MapPin size={10} /> {product.city}</span>
                            <span>{money(product.price)} / {product.price_type === 'person' ? t('common.perPerson') : product.price_type === 'event' ? t('common.perEvent') : t('common.perDay')}</span>
                          </div>
                        </div>
                      </Link>

                      <div className="flex items-center gap-3">
                        <QtyStepper value={quantity} onChange={(v) => setQty(product.id, v)} min={1} max={product.quantity || 999} size="sm" />
                        <span className="w-28 text-right text-sm font-black">{money(product.price * quantity)}</span>
                        <button
                          onClick={() => removeItem(product.id)}
                          className="soft-icon !h-9 !w-9 text-muted transition hover:text-[color:var(--danger)]"
                          aria-label={t('package.removeItem')}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* alternatives */}
              {result?.alternatives?.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-extrabold">{t('package.alternatives')}</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {result.alternatives.map((product) => {
                      const added = selected.some((item) => item.product.id === product.id);
                      return (
                        <div key={product.id} className="soft-sm flex items-center gap-3 p-3">
                          <div className="h-12 w-14 shrink-0 overflow-hidden rounded-xl bg-surface2">
                            {product.images?.[0] && <img src={product.images[0]} alt="" className="h-full w-full object-cover" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold">{product.name}</p>
                            <p className="text-[11px] text-muted">{money(product.price)}</p>
                          </div>
                          <button
                            onClick={() => addAlternative(product)}
                            className="soft-icon !h-8 !w-8"
                            style={{ color: added ? 'var(--ok)' : 'var(--accent)' }}
                            aria-label={t('common.add')}
                          >
                            {added ? <Check size={14} /> : <Plus size={14} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="soft-inset mt-6 flex gap-3 p-4">
                <Lightbulb size={18} className="shrink-0" style={{ color: 'var(--warn)' }} />
                <div>
                  <p className="text-xs font-bold">{t('package.tip')}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{t('package.tipText')}</p>
                </div>
              </div>

              <Link to="/cart" className="soft-btn-primary mt-5 w-full">
                {t('cart.checkout')} <ArrowRight size={16} />
              </Link>
            </>
          )}

          {/* saved packages */}
          {isAuthed && saved.length > 0 && (
            <div className="mt-10">
              <h3 className="mb-3 text-lg font-extrabold">{t('package.savedPackages')}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {saved.map((pkg) => (
                  <div key={pkg.id} className="soft p-4">
                    <p className="truncate text-sm font-bold">{pkg.name || t('package.title')}</p>
                    <p className="mt-1 text-xs text-muted">
                      {pkg.guests} {t('common.guests')} · {pkg.city} · {pkg.items?.length || 0} {t('package.itemsCount')}
                    </p>
                    <p className="mt-2 text-sm font-black" style={{ color: 'var(--accent)' }}>
                      {money(pkg.estimate_total || 0)}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => loadSaved(pkg)} className="soft-btn !py-2 !text-[11px] flex-1">
                        {t('package.openPackage')}
                      </button>
                      <button
                        onClick={() => deleteSaved(pkg.id)}
                        className="soft-icon !h-8 !w-8 text-muted transition hover:text-[color:var(--danger)]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="mt-2 text-[10px] text-muted">{formatDate(pkg.created_at, i18n.language, { short: true })}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
