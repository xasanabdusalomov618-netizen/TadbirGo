import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, X, Search, MapPin, CalendarDays, Sparkles, Store } from 'lucide-react';

import { api } from '../lib/api.js';
import ProductCard from '../components/ProductCard.jsx';
import { Loader, EmptyState, Pagination, Chip, SkeletonCard, Rating } from '../components/ui.jsx';
import { localize, money } from '../lib/format.js';
import { categoryIcon } from '../lib/categoryIcons.js';

const SORTS = [
  { value: 'popular', label: 'common.sortPopular' },
  { value: 'newest', label: 'common.sortNew' },
  { value: 'price_asc', label: 'common.sortPriceAsc' },
  { value: 'price_desc', label: 'common.sortPriceDesc' },
  { value: 'rating', label: 'common.sortRating' },
];

const CITIES = ['Toshkent', 'Samarqand', 'Andijon', 'Buxoro', "Farg'ona", 'Namangan', 'Xorazm'];

export default function Explore() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [sellerInfo, setSellerInfo] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const q = params.get('q') || '';
  const sellerSlug = params.get('seller') || '';
  const category = params.get('category') || '';
  const city = params.get('city') || '';
  const sort = params.get('sort') || 'popular';
  const date = params.get('date') || '';
  const minPrice = params.get('min_price') || '';
  const maxPrice = params.get('max_price') || '';
  const page = Number(params.get('page') || 1);

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.items || [])).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!sellerSlug) {
      setSellerInfo(null);
      return;
    }
    api
      .get(`/sellers/${sellerSlug}`)
      .then((res) => setSellerInfo(res.seller || null))
      .catch(() => setSellerInfo(null));
  }, [sellerSlug]);

  useEffect(() => {
    setLoading(true);
    const query = new URLSearchParams();
    if (q) query.set('q', q);
    if (category) query.set('category', category);
    if (city) query.set('city', city);
    query.set('sort', sort);
    if (date) query.set('date', date);
    if (sellerInfo?.id) query.set('seller_id', sellerInfo.id);
    if (minPrice) query.set('min_price', minPrice);
    if (maxPrice) query.set('max_price', maxPrice);
    query.set('page', String(page));
    query.set('limit', '12');

    api
      .get(`/products?${query.toString()}`)
      .then((res) => {
        setItems(res.items || []);
        setTotal(res.total || 0);
        setPages(res.pages || 1);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [q, category, city, sort, date, minPrice, maxPrice, page, sellerInfo]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const clearAll = () => setParams(new URLSearchParams());

  const activeFilters = useMemo(
    () => [q && { key: 'q', label: q }, category && { key: 'category', label: localize(categories.find((c) => c.slug === category), 'name', i18n.language) }, city && { key: 'city', label: city }, date && { key: 'date', label: date }, minPrice && { key: 'min_price', label: `min ${money(minPrice)}` }, maxPrice && { key: 'max_price', label: `max ${money(maxPrice)}` }].filter(Boolean),
    [q, category, city, date, minPrice, maxPrice, categories, i18n.language]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('explore.title')}</h1>
        <p className="mt-1.5 text-sm text-muted">{t('explore.sub')}</p>
      </div>

      {/* search + sort bar */}
      <div className="soft mb-5 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="soft-inset-sm flex flex-1 items-center gap-2 px-3">
          <Search size={17} className="shrink-0 text-muted" />
          <input
            defaultValue={q}
            onKeyDown={(e) => e.key === 'Enter' && update('q', e.target.value)}
            onBlur={(e) => e.target.value !== q && update('q', e.target.value)}
            placeholder={t('explore.keyword')}
            className="w-full bg-transparent py-2.5 text-sm outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => update('sort', e.target.value)}
            className="soft-input !py-2.5 !text-xs"
            aria-label={t('explore.sortBy')}
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>{t(option.label)}</option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`soft-btn !py-2.5 !text-xs lg:hidden ${showFilters ? 'text-accent' : ''}`}
          >
            <SlidersHorizontal size={15} /> {t('common.filters')}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* filters */}
        <aside className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
          <div className="soft sticky top-20 space-y-5 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold">{t('explore.filterTitle')}</h2>
              {activeFilters.length > 0 && (
                <button onClick={clearAll} className="text-xs font-semibold text-muted transition hover:text-[color:var(--danger)]">
                  {t('explore.clear')}
                </button>
              )}
            </div>

            <div>
              <p className="soft-label">{t('common.category')}</p>
              <div className="flex flex-wrap gap-1.5">
                <Chip active={!category} onClick={() => update('category', '')}>{t('common.all')}</Chip>
                {categories.map((cat) => (
                  <Chip key={cat.id} active={category === cat.slug} onClick={() => update('category', cat.slug)}>
                    {localize(cat, 'name', i18n.language)}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <p className="soft-label flex items-center gap-1.5"><MapPin size={12} /> {t('common.city')}</p>
              <div className="flex flex-wrap gap-1.5">
                <Chip active={!city} onClick={() => update('city', '')}>{t('common.all')}</Chip>
                {CITIES.map((item) => (
                  <Chip key={item} active={city === item} onClick={() => update('city', item)}>{item}</Chip>
                ))}
              </div>
            </div>

            <div>
              <p className="soft-label">{t('explore.priceRange')}</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  defaultValue={minPrice}
                  onBlur={(e) => update('min_price', e.target.value)}
                  placeholder={t('common.min')}
                  className="soft-input !py-2.5 !text-xs"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  defaultValue={maxPrice}
                  onBlur={(e) => update('max_price', e.target.value)}
                  placeholder={t('common.max')}
                  className="soft-input !py-2.5 !text-xs"
                />
              </div>
            </div>

            <div className="soft-divider" />

            <div>
              <p className="soft-label flex items-center gap-1.5"><CalendarDays size={12} /> {t('explore.availableOn')}</p>
              <input
                type="date"
                value={date}
                onChange={(e) => update('date', e.target.value)}
                className="soft-input !py-2.5 !text-xs"
              />
              <p className="mt-2 text-[11px] leading-relaxed text-muted">{t('explore.dateHint')}</p>
            </div>

            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeFilters.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => update(filter.key, '')}
                    className="soft-chip !py-1.5 !text-[11px]"
                  >
                    {filter.label} <X size={11} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* results */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted">
                <span className="font-bold text-ink">{total}</span> {t('explore.found')}
              </p>
              {sellerInfo && (
                <button onClick={() => update('seller', '')} className="soft-chip !py-1.5 !text-[11px]">
                  <Store size={11} /> {sellerInfo.business_name} <X size={11} />
                </button>
              )}
            </div>
            {date && (
              <span className="soft-chip !text-[11px]" style={{ color: 'var(--accent)' }}>
                <Sparkles size={11} /> {date}
              </span>
            )}
          </div>

          {sellerInfo && (
            <div className="soft mb-4 flex flex-wrap items-center gap-4 p-4">
              <img src={sellerInfo.logo_url} alt="" className="h-14 w-14 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-base font-bold">
                  {sellerInfo.business_name}
                  {sellerInfo.is_premium && (
                    <span className="soft-badge" style={{ background: 'color-mix(in srgb, var(--warn) 16%, transparent)', color: 'var(--warn)' }}>
                      {t('common.premium')}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">{sellerInfo.city} · {sellerInfo.description}</p>
              </div>
              <div className="text-right">
                <Rating value={sellerInfo.rating} count={sellerInfo.review_count} size={12} />
                <p className="mt-1 text-[11px] text-muted">{sellerInfo.telegram}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title={t('common.noResults')}
              description={t('explore.dateHint')}
              action={<button onClick={clearAll} className="soft-btn-primary mt-2">{t('explore.clear')}</button>}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <Pagination page={page} pages={pages} onChange={(p) => update('page', String(p))} />
        </section>
      </div>
    </div>
  );
}
