import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, ShoppingCart, Check, Crown, Eye } from 'lucide-react';
import { money, priceUnit, localize } from '../lib/format.js';
import { Rating } from './ui.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function ProductCard({ product, onAdd }) {
  const { t, i18n } = useTranslation();
  const cart = useCart();
  const toast = useToast();
  const inCart = cart.has(product.id);
  const image = product.images?.[0] || product.image;
  const accent = product.category?.accent || 'var(--accent)';

  const handleAdd = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (onAdd) return onAdd(product);
    cart.add(product, product.min_order || 1, 1);
    toast.success(t('product.added'));
  };

  return (
    <Link
      to={`/products/${product.id}`}
      className="soft card-hover group flex flex-col overflow-hidden"
      style={{ textDecoration: 'none' }}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-soft bg-surface2">
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className="grid h-full w-full place-items-center text-3xl font-black text-white/80"
            style={{ background: `linear-gradient(135deg, ${accent}, var(--accent-2))` }}
          >
            {product.name?.slice(0, 1)}
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.featured && (
            <span className="soft-badge bg-white/90 text-[10px] text-amber-600">
              <Crown size={11} /> TOP
            </span>
          )}
          {product.seller?.is_premium && (
            <span className="soft-badge bg-white/90 text-[10px]" style={{ color: 'var(--accent)' }}>
              {t('common.premium')}
            </span>
          )}
        </div>

        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/35 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
          <Eye size={11} /> {product.views || 0}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: accent }}>
          {localize(product.category, 'name', i18n.language)}
        </span>

        <h3 className="line-clamp-2 min-h-[2.6rem] text-sm font-bold leading-snug">{product.name}</h3>

        <div className="flex items-center justify-between">
          <Rating value={product.rating} count={product.review_count} size={12} />
          <span className="flex items-center gap-1 text-[11px] text-muted">
            <MapPin size={11} /> {product.city}
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="text-base font-extrabold" style={{ color: 'var(--accent)' }}>
              {money(product.price)}
            </p>
            <p className="text-[11px] text-muted">
              {t('common.per')} {priceUnit(product.price_type, t)}
            </p>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl transition ${
              inCart ? 'text-white' : 'text-muted hover:text-accent'
            }`}
            style={
              inCart
                ? { background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }
                : { boxShadow: 'inset 3px 3px 7px var(--sd), inset -3px -3px 7px var(--sl)' }
            }
            aria-label={t('product.addToCart')}
          >
            {inCart ? <Check size={17} /> : <ShoppingCart size={17} />}
          </button>
        </div>
      </div>
    </Link>
  );
}
