import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

import { api } from '../lib/api.js';
import { Loader, SkeletonCard } from '../components/ui.jsx';
import { categoryIcon } from '../lib/categoryIcons.js';
import { localize } from '../lib/format.js';

export default function Categories() {
  const { t, i18n } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/categories')
      .then((res) => setCategories(res.items || []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  const total = categories.reduce((sum, c) => sum + (c.product_count || 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('nav.categories')}</h1>
        <p className="mt-1.5 text-sm text-muted">
          {categories.length} {t('nav.categories').toLowerCase()} · {total} e’lon
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const Icon = categoryIcon(category.slug);
            return (
              <Link
                key={category.id}
                to={`/explore?category=${category.slug}`}
                className="soft card-hover group flex items-center gap-5 p-5"
                style={{ textDecoration: 'none' }}
              >
                <div
                  className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-white transition-transform group-hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${category.accent}, ${category.accent}aa)`,
                    boxShadow: `0 12px 26px -10px ${category.accent}`,
                  }}
                >
                  <Icon size={27} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-bold">{localize(category, 'name', i18n.language)}</h2>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                    {localize(category, 'description', i18n.language)}
                  </p>
                  <p className="mt-2 text-xs font-bold" style={{ color: category.accent }}>
                    {category.product_count} e’lon
                  </p>
                </div>
                <ArrowRight size={18} className="shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-accent" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
