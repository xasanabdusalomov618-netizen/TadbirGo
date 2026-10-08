import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MapPin, ShoppingCart, ShieldCheck, Phone, Send, Star, CalendarDays, Clock, Package,
  ChevronLeft, ChevronRight, Crown, Eye, Wallet, Sparkles, CheckCircle2, XCircle,
} from 'lucide-react';

import { api } from '../lib/api.js';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { Loader, Rating, QtyStepper, Breadcrumbs, Skeleton } from '../components/ui.jsx';
import { money, priceUnit, formatDate, localize } from '../lib/format.js';
import { categoryIcon } from '../lib/categoryIcons.js';

export default function ProductDetails() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const cart = useCart();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [units, setUnits] = useState(1);
  const [checkDate, setCheckDate] = useState('');
  const [dateState, setDateState] = useState(null); // {available:bool}
  const [tab, setTab] = useState('description');

  useEffect(() => {
    setLoading(true);
    setActiveImage(0);
    setDateState(null);
    api
      .get(`/products/${id}`)
      .then((data) => {
        setProduct(data);
        setQuantity(data.min_order || 1);
        if (data.category?.slug) {
          api.get(`/products?category=${data.category.slug}&limit=5`).then((res) => {
            setSimilar((res.items || []).filter((p) => p.id !== data.id).slice(0, 4));
          }).catch(() => setSimilar([]));
        }
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  const total = useMemo(() => {
    if (!product) return 0;
    const qty = Math.max(1, quantity);
    if (product.price_type === 'event' || product.price_type === 'set') return product.price * qty;
    if (product.price_type === 'person') return product.price * qty;
    return product.price * qty * Math.max(1, units);
  }, [product, quantity, units]);

  const checkAvailability = () => {
    if (!checkDate) return;
    const blocked = (product.availability || []).find((row) => row.date === checkDate && row.status !== 'available');
    setDateState({ available: !blocked, date: checkDate });
  };

  const addToCart = () => {
    if (dateState && !dateState.available) {
      toast.error(t('product.notAvailableOnDate'));
      return;
    }
    cart.add(product, quantity, units);
    if (checkDate) cart.updateConfig({ eventDate: checkDate, city: product.city });
    toast.success(t('product.added'));
  };

  if (loading) return <Loader />;
  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">{t('common.notFound')}</h1>
        <Link to="/explore" className="soft-btn-primary mt-5 inline-flex">{t('nav.explore')}</Link>
      </div>
    );
  }

  const Icon = categoryIcon(product.category?.slug);
  const images = product.images?.length ? product.images : [null];
  const blockedDates = (product.availability || []).filter((a) => a.status !== 'available');

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Breadcrumbs
        items={[
          { to: '/', label: t('nav.home') },
          { to: '/explore', label: t('nav.explore') },
          { to: `/explore?category=${product.category?.slug}`, label: localize(product.category, 'name', i18n.language) },
          { label: product.name },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        {/* gallery */}
        <div>
          <div className="soft overflow-hidden">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface2">
              {images[activeImage] ? (
                <img src={images[activeImage]} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="grid h-full w-full place-items-center text-white"
                  style={{ background: `linear-gradient(135deg, ${product.category?.accent}, var(--accent-2))` }}
                >
                  <Icon size={72} strokeWidth={1.4} />
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImage((i) => (i - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink shadow-md transition hover:bg-white"
                    aria-label="prev"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setActiveImage((i) => (i + 1) % images.length)}
                    className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink shadow-md transition hover:bg-white"
                    aria-label="next"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}

              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                {product.featured && (
                  <span className="soft-badge bg-white/90 text-amber-600"><Crown size={11} /> TOP</span>
                )}
                {product.seller?.is_premium && (
                  <span className="soft-badge bg-white/90" style={{ color: 'var(--accent)' }}>{t('common.premium')}</span>
                )}
              </div>

              <span className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur">
                <Eye size={12} /> {product.views || 0}
              </span>
            </div>

            {images.length > 1 && (
              <div className="flex gap-3 p-3">
                {images.map((src, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImage(index)}
                    className={`h-20 w-24 shrink-0 overflow-hidden rounded-2xl transition ${
                      index === activeImage ? 'ring-2' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={index === activeImage ? { boxShadow: '0 0 0 2px var(--accent)' } : undefined}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* seller card */}
          <Link to={`/explore?seller=${product.seller?.slug}`} className="soft mt-4 flex items-center gap-4 p-4" style={{ textDecoration: 'none' }}>
            <img src={product.seller?.logo_url} alt="" className="h-14 w-14 rounded-2xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-bold">
                {product.seller?.name}
                <ShieldCheck size={14} style={{ color: 'var(--ok)' }} />
              </p>
              <Rating value={product.seller?.rating} count={product.seller?.review_count} size={12} />
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                <Clock size={11} /> {product.seller?.response_hours} {t('common.hours')}
              </p>
            </div>
            <span className="soft-chip !text-[11px]">{t('product.viewSeller')}</span>
          </Link>
        </div>

        {/* info + booking box */}
        <div className="space-y-4">
          <div className="soft p-5 sm:p-6">
            <span
              className="soft-badge mb-3"
              style={{ background: `${product.category?.accent}1f`, color: product.category?.accent }}
            >
              <Icon size={12} /> {localize(product.category, 'name', i18n.language)}
            </span>

            <h1 className="text-balance text-2xl font-extrabold leading-tight sm:text-3xl">{product.name}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <Rating value={product.rating} count={product.review_count} />
              <span className="flex items-center gap-1 text-muted">
                <MapPin size={14} /> {product.city}
                {product.district ? `, ${product.district}` : ''}
              </span>
              <span className="flex items-center gap-1 text-muted">
                <Package size={14} /> {product.quantity} {t('product.inStock')}
              </span>
            </div>

            <div className="soft-divider my-5" />

            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-black" style={{ color: 'var(--accent)' }}>{money(product.price)}</p>
                <p className="mt-1 text-xs text-muted">
                  {t('common.per')} {priceUnit(product.price_type, t)}
                  {product.unit_note ? ` · ${product.unit_note}` : ''}
                </p>
              </div>
              {product.deposit > 0 && (
                <div className="text-right">
                  <p className="text-xs text-muted">{t('product.deposit')}</p>
                  <p className="text-sm font-bold">{money(product.deposit)}</p>
                </div>
              )}
            </div>

            {/* availability check */}
            <div className="soft-inset mt-5 p-4">
              <p className="soft-label flex items-center gap-1.5"><CalendarDays size={12} /> {t('product.checkAvailability')}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="date"
                  value={checkDate}
                  onChange={(e) => {
                    setCheckDate(e.target.value);
                    setDateState(null);
                  }}
                  className="soft-input !py-2.5 !text-xs"
                />
                <button onClick={checkAvailability} className="soft-btn !py-2.5 !text-xs whitespace-nowrap">
                  {t('product.checkAvailability')}
                </button>
              </div>
              {dateState && (
                <p
                  className="mt-3 flex items-center gap-2 text-xs font-semibold"
                  style={{ color: dateState.available ? 'var(--ok)' : 'var(--danger)' }}
                >
                  {dateState.available ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  {dateState.available
                    ? `${t('product.availableOnDate')} (${formatDate(dateState.date, i18n.language)})`
                    : t('product.notAvailableOnDate')}
                </p>
              )}
              {blockedDates.length > 0 && (
                <p className="mt-2 text-[11px] text-muted">
                  {t('product.blockedDates')}: {blockedDates.slice(0, 4).map((d) => formatDate(d.date, i18n.language, { short: true })).join(', ')}
                  {blockedDates.length > 4 ? '…' : ''}
                </p>
              )}
            </div>

            {/* quantity */}
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <p className="soft-label">{t('product.qtyLabel')}</p>
                <QtyStepper value={quantity} onChange={setQuantity} min={product.min_order || 1} max={product.quantity || 999} />
                {product.min_order > 1 && (
                  <p className="mt-1.5 text-[11px] text-muted">
                    {t('product.minOrder')}: {product.min_order}
                  </p>
                )}
              </div>
              {(product.price_type === 'day' || product.price_type === 'hour') && (
                <div>
                  <p className="soft-label">
                    {product.price_type === 'hour' ? t('product.hoursLabel') : t('product.daysLabel')}
                  </p>
                  <QtyStepper value={units} onChange={setUnits} min={1} max={60} />
                </div>
              )}
            </div>

            <div className="soft-flat mt-5 flex items-center justify-between rounded-2xl p-4">
              <span className="text-sm font-semibold text-muted">{t('product.calcTotal')}</span>
              <span className="text-xl font-black" style={{ color: 'var(--accent)' }}>{money(total)}</span>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button onClick={addToCart} className="soft-btn-primary flex-1">
                <ShoppingCart size={17} /> {t('product.addToCart')}
              </button>
              <Link to="/cart" className="soft-btn flex-1">
                {t('nav.cart')}
              </Link>
            </div>

            <div className="mt-4 grid gap-2 text-xs text-muted sm:grid-cols-2">
              <p className="flex items-center gap-1.5"><ShieldCheck size={13} style={{ color: 'var(--ok)' }} /> {t('home.adv1')}</p>
              <p className="flex items-center gap-1.5"><Wallet size={13} style={{ color: 'var(--accent)' }} /> {t('checkout.payCash')}</p>
            </div>
          </div>

          {/* tabs */}
          <div className="soft p-5 sm:p-6">
            <div className="mb-4 flex gap-1">
              {[
                { key: 'description', label: t('common.description') },
                { key: 'reviews', label: `${t('product.reviewsTitle')} (${product.reviews?.length || 0})` },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`rounded-2xl px-4 py-2 text-xs font-bold transition ${
                    tab === item.key ? 'text-accent' : 'text-muted hover:text-ink'
                  }`}
                  style={tab === item.key ? { boxShadow: 'inset 3px 3px 7px var(--sd), inset -3px -3px 7px var(--sl)' } : undefined}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {tab === 'description' ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
                {product.description || '—'}
              </p>
            ) : (
              <div className="space-y-3">
                {(product.reviews || []).length === 0 ? (
                  <p className="text-sm text-muted">{t('product.noReviews')}</p>
                ) : (
                  product.reviews.map((review) => (
                    <div key={review.id} className="soft-flat rounded-2xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}>
                          {(review.customer_name || 'U').slice(0, 1)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold">{review.customer_name}</p>
                          <Rating value={review.rating} size={11} showValue={false} />
                        </div>
                        <span className="text-[11px] text-muted">{formatDate(review.created_at, i18n.language, { short: true })}</span>
                      </div>
                      <p className="mt-2.5 text-sm leading-relaxed text-muted">{review.comment}</p>
                      {review.seller_reply && (
                        <p className="mt-2.5 rounded-xl bg-surface p-3 text-xs italic text-muted">
                          <Star size={11} className="mr-1 inline" /> {review.seller_reply}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* seller contacts */}
          <div className="soft p-5">
            <p className="mb-3 text-sm font-bold">{t('product.contactSeller')}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <a href={`tel:${product.seller?.phone || ''}`} className="soft-btn !py-2.5 !text-xs">
                <Phone size={14} /> {t('common.phone')}
              </a>
              <button
                onClick={() => toast.info(t('product.askQuestion'))}
                className="soft-btn !py-2.5 !text-xs"
              >
                <Send size={14} /> {t('product.askQuestion')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* similar */}
      {similar.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-extrabold">{t('product.similar')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((item) => <ProductCard key={item.id} product={item} />)}
          </div>
        </section>
      )}
    </div>
  );
}
