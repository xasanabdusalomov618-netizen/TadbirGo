import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight } from 'lucide-react';
import { categoryIcon } from '../lib/categoryIcons.js';
import { localize } from '../lib/format.js';

export default function CategoryCard({ category, compact }) {
  const { i18n } = useTranslation();
  const Icon = categoryIcon(category.slug);
  const accent = category.accent || 'var(--accent)';

  return (
    <Link
      to={`/explore?category=${category.slug}`}
      className="soft card-hover group flex items-center gap-4 p-4"
      style={{ textDecoration: 'none' }}
    >
      <div
        className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white transition-transform group-hover:scale-105"
        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, boxShadow: `0 8px 20px -6px ${accent}` }}
      >
        <Icon size={24} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{localize(category, 'name', i18n.language)}</p>
        {!compact && (
          <p className="mt-0.5 text-xs text-muted">
            {category.product_count} {i18n.language === 'ru' ? 'объявлений' : i18n.language === 'en' ? 'listings' : 'e’lon'}
          </p>
        )}
      </div>
      <ArrowUpRight size={18} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
    </Link>
  );
}
