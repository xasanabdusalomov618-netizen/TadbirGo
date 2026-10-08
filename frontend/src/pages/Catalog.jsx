import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useApp, useAuth, useCart } from '../store';
import { EmptyState, Price, ProductCard, ProductImage, QtyInput, Spinner, Stars } from '../components';
import { locCat, locName } from '../utils';

// =================================================================
// EXPLORE
// =================================================================
export function Explore() {
  const { t, lang } = useApp();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [cats, setCats] = useState([]);
  const [locations, setLocations] = useState([]);

  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const location = params.get('location') || '';
  const date = params.get('date') || '';
  const minPrice = params.get('min') || '';
  const maxPrice = params.get('max') || '';
  const sort = params.get('sort') || 'popular';

  useEffect(() => {
    api.get('/api/categories').then((d) => setCats(d.items)).catch(() => {});
    api.get('/api/locations').then((d) => setLocations(d.items)).catch(() => {});
  }, []);

  useEffect(() => {
    setData(null);
    const qs = new URLSearchParams();
    if (q) qs.set('search', q);
    if (category) qs.set('category', category);
    if (location) qs.set('location', location);
    if (date) qs.set('date', date);
    if (minPrice) qs.set('min_price', minPrice);
    if (maxPrice) qs.set('max_price', maxPrice);
    qs.set('sort', sort);
    qs.set('limit', '24');
    api.get(`/api/products?${qs.toString()}`).then(setData).catch(() => setData({ items: [], total: 0 }));
  }, [q, category, location, date, minPrice, maxPrice, sort]);

  const setParam = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  return (
    <div className="container page">
      <div className="page__head">
        <h1 className="page__title">{t('catalog.title')}</h1>
        <p className="page__subtitle">{t('catalog.subtitle')}</p>
      </div>

      <div className="cat-pills">
        <button className={`cat-pill${!category ? ' active' : ''}`} onClick={() => setParam('category', '')}>
          {t('common.all')}
        </button>
        {cats.map((c) => (
          <button key={c.id} className={`cat-pill${category === c.slug ? ' active' : ''}`}
            onClick={() => setParam('category', c.slug)}>
            {c.icon} {locCat(c, lang)}
          </button>
        ))}
      </div>

      <div className="filters-panel mb">
        <div className="filter-bar">
          <select className="select" value={location} onChange={(e) => setParam('location', e.target.value)}>
            <option value="">📍 {t('common.location')}: {t('common.all')}</option>
            {locations.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <input className="input" type="number" placeholder={`${t('common.price')} ${t('common.min').toLowerCase()}`}
            value={minPrice} onChange={(e) => setParam('min', e.target.value)} style={{ maxWidth: 150 }} />
          <span className="muted">—</span>
          <input className="input" type="number" placeholder={t('common.max')}
            value={maxPrice} onChange={(e) => setParam('max', e.target.value)} style={{ maxWidth: 150 }} />
          <div title={t('catalog.dateHint')}>
            <input className="input" type="date" value={date} onChange={(e) => setParam('date', e.target.value)}
              title={t('catalog.dateHint')} />
          </div>
          <select className="select" value={sort} onChange={(e) => setParam('sort', e.target.value)}>
            <option value="popular">{t('catalog.sort')}: {t('catalog.sort.popular')}</option>
            <option value="new">{t('catalog.sort.new')}</option>
            <option value="price_asc">{t('catalog.sort.price_asc')}</option>
            <option value="price_desc">{t('catalog.sort.price_desc')}</option>
            <option value="rating">{t('catalog.sort.rating')}</option>
          </select>
          {(category || location || date || minPrice || maxPrice || q) && (
            <button className="btn btn--ghost btn--sm" onClick={() => setParams({}, { replace: true })}>
              ✕ {t('common.reset')}
            </button>
          )}
        </div>
        {date && <div className="muted" style={{ fontSize: 13 }}>📅 {t('catalog.dateHint')}: <strong>{date}</strong></div>}
      </div>

      {!data ? <Spinner big /> : data.items.length === 0 ? (
        <EmptyState icon="🔍" title={t('catalog.noResults')} />
      ) : (
        <>
          <p className="muted mb" style={{ fontSize: 13.5 }}>{data.total} {t('catalog.found')}</p>
          <div className="products-grid">
            {data.items.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </>
      )}
    </div>
  );
}

// =================================================================
// CATEGORIES
// =================================================================
export function Categories() {
  const { t, lang } = useApp();
  const [cats, setCats] = useState(null);
  useEffect(() => { api.get('/api/categories').then((d) => setCats(d.items)).catch(() => setCats([])); }, []);
  return (
    <div className="container page">
      <div className="page__head">
        <h1 className="page__title">{t('categories.title')}</h1>
        <p className="page__subtitle">{t('categories.subtitle')}</p>
      </div>
      {!cats ? <Spinner big /> : (
        <div className="cat-grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))' }}>
          {cats.map((c) => (
            <Link key={c.id} to={`/katalog?category=${c.slug}`} className="cat-card">
              <div className="cat-card__icon" style={{ background: 'var(--accent-soft)' }}>{c.icon}</div>
              <h3>{locCat(c, lang)}</h3>
              <span>{c.product_count} {t('common.products').toLowerCase()}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// =================================================================
// PRODUCT DETAILS
// =================================================================
export function ProductDetail() {
  const { id } = useParams();
  const { t, lang, toast, fmtMoney } = useApp();
  const { user } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const [p, setP] = useState(null);
  const [err, setErr] = useState('');
  const [imgIdx, setImgIdx] = useState(0);
  const [date, setDate] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setP(null); setErr(''); setImgIdx(0); setDate(''); setQty(1);
    api.get(`/api/products/${id}`).then(setP).catch((e) => setErr(e.message));
    window.scrollTo(0, 0);
  }, [id]);

  const availability = useMemo(() => {
    if (!date || !p) return null;
    return !p.blocked_dates.includes(date);
  }, [date, p]);

  if (err) return <div className="container page"><EmptyState icon="😕" title={t('common.notFound')} text={err} /></div>;
  if (!p) return <div className="container page"><Spinner big /></div>;

  const addToCart = () => {
    if (date && !availability) { toast(t('product.busyOnDate'), 'error'); return; }
    cart.add({ ...p, image: p.images?.[imgIdx] || p.image }, qty);
    toast(t('product.addedToCart'));
  };

  const bookNow = () => {
    if (!user) { navigate('/kirish?next=' + encodeURIComponent(`/mahsulot/${id}`)); return; }
    if (date && !availability) { toast(t('product.busyOnDate'), 'error'); return; }
    cart.add({ ...p, image: p.images?.[imgIdx] || p.image }, qty);
    navigate('/savat');
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="container page">
      <div className="breadcrumbs">
        <Link to="/">{t('nav.home')}</Link> / <Link to="/katalog">{t('nav.catalog')}</Link> /{' '}
        <Link to={`/katalog?category=${p.category.slug}`}>{p.category.icon} {locCat(p.category, lang)}</Link>
      </div>

      <div className="product-layout">
        {/* gallery */}
        <div>
          <div className="gallery">
            <div className="gallery__main">
              {p.images?.length ? (
                <img src={p.images[imgIdx]} alt={p.name} />
              ) : (
                <ProductImage product={p} />
              )}
            </div>
            {p.images?.length > 1 && (
              <div className="gallery__thumbs">
                {p.images.map((u, i) => (
                  <img key={i} src={u} alt="" className={i === imgIdx ? 'active' : ''} onClick={() => setImgIdx(i)} />
                ))}
              </div>
            )}
          </div>

          {/* description */}
          <div className="card mt">
            <h2 className="card__title">{t('product.description')}</h2>
            <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 15 }}>{p.description}</p>
          </div>

          {/* reviews */}
          <div className="card mt">
            <h2 className="card__title">{t('product.reviews')} ({p.reviews.length})</h2>
            {p.reviews.length === 0 ? (
              <p className="muted">{t('product.noReviews')}</p>
            ) : (
              p.reviews.map((r) => (
                <div key={r.id} className="review">
                  <div className="review__head">
                    <span className="avatar">{r.customer_name?.[0]}</span>
                    <span className="review__name">{r.customer_name}</span>
                    <Stars value={r.rating} />
                    <span className="review__date">{new Date(r.created_at.replace(' ', 'T')).toLocaleDateString()}</span>
                  </div>
                  {r.comment && <p className="review__text">{r.comment}</p>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* info panel */}
        <div>
          <div className="card">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {p.featured && <span className="tag tag--amber">{t('product.featuredBadge')}</span>}
              {p.seller.premium && <span className="tag tag--blue">{t('product.premiumBadge')}</span>}
              {!p.available && <span className="tag" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}>{t('product.notAvailable')}</span>}
            </div>
            <h1 style={{ margin: '0 0 8px', fontSize: 24, letterSpacing: '-0.5px' }}>{locName(p, lang)}</h1>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
              <Stars value={p.rating} count={p.rating_count} size="lg" />
              <span className="muted" style={{ fontSize: 13 }}>👁 {p.views} {t('common.views')}</span>
            </div>
            <Price value={p.price} type={p.price_type} className="lg" />
            <hr className="divider" />

            <div className="field">
              <label>📅 {t('product.checkAvailability')}</label>
              <input type="date" className="input" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
              {availability !== null && (
                <div style={{ marginTop: 8, fontWeight: 700, fontSize: 14, color: availability ? 'var(--green)' : 'var(--red)' }}>
                  {availability ? t('product.availableOnDate') : t('product.busyOnDate')}
                </div>
              )}
            </div>

            <div className="field">
              <label>{t('product.qty')} <span className="muted">({p.quantity} {t('product.inStock')})</span></label>
              <QtyInput value={qty} onChange={setQty} max={Math.max(1, p.quantity)} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button className="btn btn--primary" style={{ flex: 1 }} onClick={addToCart} disabled={!p.available}>
                🛒 {t('product.addToCart')}
              </button>
              <button className="btn btn--ghost" style={{ flex: 1 }} onClick={bookNow} disabled={!p.available}>
                ⚡ {user ? t('product.bookNow') : t('product.loginToBook')}
              </button>
            </div>
            <div style={{ marginTop: 14, fontSize: 14, fontWeight: 800 }}>
              {t('common.total')}: {fmtMoney(p.price * qty)}
            </div>
          </div>

          {/* seller */}
          <div className="card mt">
            <h2 className="card__title">{t('product.sellerInfo')}</h2>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
              <span className="avatar" style={{ width: 42, height: 42, fontSize: 18, borderRadius: 12 }}>
                {p.seller.company_name?.[0]}
              </span>
              <div>
                <div style={{ fontWeight: 800 }}>{p.seller.company_name} {p.seller.premium && '💎'}</div>
                <Stars value={p.seller.rating} />
              </div>
            </div>
            <p className="muted" style={{ fontSize: 14, margin: '6px 0' }}>{p.seller.description}</p>
            <div className="muted" style={{ fontSize: 13.5 }}>📍 {t('product.location')}: <strong>{p.location}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
