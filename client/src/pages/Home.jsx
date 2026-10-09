import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight, Sparkles, Search, ShieldCheck, Package, Truck, Wrench, Star,
  ChevronRight, BadgeCheck, Zap, Crown,
} from 'lucide-react';

import { api } from '../lib/api.js';
import { compactNumber, localize } from '../lib/format.js';
import { categoryIcon } from '../lib/categoryIcons.js';
import ProductCard from '../components/ProductCard.jsx';
import { Loader, SectionTitle, Rating, SkeletonCard } from '../components/ui.jsx';

const ADVANTAGES = [
  { icon: ShieldCheck, title: 'home.adv1', desc: 'home.adv1Desc', color: '#16a34a' },
  { icon: Package, title: 'home.adv2', desc: 'home.adv2Desc', color: '#6366f1' },
  { icon: Truck, title: 'home.adv3', desc: 'home.adv3Desc', color: '#0ea5e9' },
  { icon: Wrench, title: 'home.adv4', desc: 'home.adv4Desc', color: '#f59e0b' },
  { icon: Star, title: 'home.adv5', desc: 'home.adv5Desc', color: '#ec4899' },
];

const STEPS = [
  { key: '1', title: 'home.step1Title', desc: 'home.step1Desc', icon: Search, color: '#6366f1' },
  { key: '2', title: 'home.step2Title', desc: 'home.step2Desc', icon: BadgeCheck, color: '#8b5cf6' },
  { key: '3', title: 'home.step3Title', desc: 'home.step3Desc', icon: Sparkles, color: '#ec4899' },
];

export default function Home() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    Promise.all([api.get('/analytics/home'), api.get('/categories'), api.get('/sellers')])
      .then(([home, cats, sellerList]) => {
        setData(home);
        setCategories(cats.items || []);
        setSellers((sellerList.items || []).slice(0, 4));
      })
      .catch(() => setData({ counters: {}, featured: [], ads: [] }))
      .finally(() => setLoading(false));
  }, []);

  const search = (event) => {
    event.preventDefault();
    navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
  };

  const counters = data?.counters || {};
  const stats = [
    { label: t('home.statListings'), value: compactNumber(counters.listings || 0) },
    { label: t('home.statSellers'), value: compactNumber(counters.sellers || 0) },
    { label: t('home.statBookings'), value: compactNumber(counters.bookings || 0) },
    { label: t('home.statCities'), value: `${counters.cities || 5}` },
  ];

  return (
    <div>
      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl animate-float"
          style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute -left-32 top-40 h-[380px] w-[380px] rounded-full opacity-30 blur-3xl animate-float"
          style={{ background: 'radial-gradient(circle, var(--accent-2) 0%, transparent 70%)', animationDelay: '2s' }}
        />

        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6 sm:pt-16 lg:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="soft-chip !text-[11px] animate-fade-in">
              <Sparkles size={13} style={{ color: 'var(--accent)' }} />
              {t('app.tagline')}
            </span>

            <h1 className="mt-6 text-balance text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              <span className="gradient-text">{t('home.heroTitle')}</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-balance text-base leading-relaxed text-muted sm:text-lg">
              {t('home.heroSubtitle')}
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/explore" className="soft-btn-primary w-full sm:w-auto">
                {t('home.ctaStart')}
                <ArrowRight size={17} />
              </Link>
              <Link to="/package-builder" className="soft-btn w-full sm:w-auto">
                <Sparkles size={17} style={{ color: 'var(--accent)' }} />
                {t('home.ctaPackage')}
              </Link>
            </div>

            <form onSubmit={search} className="mt-10">
              <div className="soft-inset mx-auto flex max-w-2xl items-center gap-2 p-2">
                <Search size={18} className="ml-3 shrink-0 text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('home.searchPlaceholder')}
                  className="w-full bg-transparent px-1 py-2 text-sm outline-none"
                  aria-label={t('common.search')}
                />
                <button type="submit" className="soft-btn-primary shrink-0 !py-2.5">
                  {t('common.search')}
                </button>
              </div>
            </form>
          </div>

          {/* stats */}
          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="soft px-4 py-5 text-center">
                <p className="text-2xl font-extrabold" style={{ color: 'var(--accent)' }}>{stat.value}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- categories */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <SectionTitle
          title={t('home.popularCats')}
          subtitle={t('home.popularCatsSub')}
          action={
            <Link to="/categories" className="soft-btn-ghost">
              {t('common.viewAll')} <ChevronRight size={15} />
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(loading ? Array.from({ length: 10 }) : categories.slice(0, 10)).map((category, index) =>
            category ? (
              <CategoryTile key={category.id} category={category} lang={i18n.language} />
            ) : (
              <SkeletonCard key={index} />
            )
          )}
        </div>
      </section>

      {/* --------------------------------------------------------- featured */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <SectionTitle
          title={t('home.featuredTitle')}
          subtitle={t('home.featuredSub')}
          action={
            <Link to="/explore?sort=popular" className="soft-btn-ghost">
              {t('common.viewAll')} <ChevronRight size={15} />
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(loading ? Array.from({ length: 8 }) : data?.featured || []).map((product, index) =>
            product ? <ProductCard key={product.id} product={product} /> : <SkeletonCard key={index} />
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------- ads */}
      {data?.ads?.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {data.ads.slice(0, 2).map((ad) => (
              <Link key={ad.id} to={ad.link || '/explore'} className="soft-lg group relative overflow-hidden">
                <div className="flex items-center gap-5 p-4">
                  {ad.image_url && (
                    <img src={ad.image_url} alt={ad.title} className="h-24 w-24 shrink-0 rounded-2xl object-cover" />
                  )}
                  <div className="min-w-0">
                    <span className="soft-badge mb-2" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      {t('home.adLabel')}
                    </span>
                    <h3 className="truncate text-base font-bold">{ad.title}</h3>
                    <p className="mt-1 truncate text-xs text-muted">{ad.clicks} ta o‘tish · {ad.impressions} ko‘rish</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------ how it works */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <SectionTitle title={t('home.howTitle')} subtitle={t('home.howSub')} center />
        <div className="relative mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.key} className="soft relative p-6">
              <div
                className="mb-5 grid h-14 w-14 place-items-center rounded-2xl text-white"
                style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}aa)`, boxShadow: `0 10px 24px -8px ${step.color}` }}
              >
                <step.icon size={24} />
              </div>
              <span className="absolute right-5 top-5 text-4xl font-black opacity-[0.07]">{index + 1}</span>
              <h3 className="text-lg font-bold">{t(step.title)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(step.desc)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- advantages */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="soft-lg p-6 sm:p-10">
          <SectionTitle title={t('home.advTitle')} subtitle={t('home.advSub')} center />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ADVANTAGES.map((adv) => (
              <div key={adv.title} className="soft-flat flex gap-4 rounded-2xl p-4">
                <div
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white"
                  style={{ background: `linear-gradient(135deg, ${adv.color}, ${adv.color}bb)` }}
                >
                  <adv.icon size={19} />
                </div>
                <div>
                  <p className="text-sm font-bold">{t(adv.title)}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{t(adv.desc)}</p>
                </div>
              </div>
            ))}
            <div className="soft-flat flex flex-col justify-center rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}>
              <p className="text-2xl font-black text-white">10 daqiqa</p>
              <p className="mt-1 text-xs text-white/85">{t('home.ctaDesc')}</p>
              <Link to="/package-builder" className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-2 text-xs font-bold text-white backdrop-blur transition hover:bg-white/30">
                <Zap size={13} /> {t('home.ctaPackage')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- sellers */}
      {sellers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <SectionTitle
            title={t('home.topSellers')}
            subtitle={t('home.topSellersSub')}
            action={
              <Link to="/explore" className="soft-btn-ghost">
                {t('common.viewAll')} <ChevronRight size={15} />
              </Link>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sellers.map((seller) => (
              <Link
                key={seller.id}
                to={`/explore?seller=${seller.slug}`}
                className="soft card-hover flex items-center gap-4 p-4"
                style={{ textDecoration: 'none' }}
              >
                <div className="relative">
                  <img
                    src={seller.logo_url}
                    alt={seller.business_name}
                    className="h-14 w-14 rounded-2xl object-cover"
                  />
                  {seller.is_premium && (
                    <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full text-white" style={{ background: 'var(--warn)' }}>
                      <Crown size={11} />
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{seller.business_name}</p>
                  <Rating value={seller.rating} count={seller.review_count} size={11} />
                  <p className="mt-0.5 truncate text-[11px] text-muted">{seller.city}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* --------------------------------------------------------------- cta */}
      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <div
          className="soft-lg relative overflow-hidden p-8 text-center sm:p-14"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-52 w-52 rounded-full bg-black/10 blur-2xl" />
          <h2 className="relative text-balance text-2xl font-black text-white sm:text-4xl">{t('home.ctaTitle')}</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-sm text-white/85">{t('home.ctaDesc')}</p>
          <div className="relative mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold shadow-lg transition hover:scale-[1.02]"
              style={{ color: 'var(--accent)' }}
            >
              {t('home.ctaBtn')} <ArrowRight size={16} />
            </Link>
            <Link
              to="/register?role=seller"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/40 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              {t('footer.becomeSeller')}
            </Link>
          </div>
          <p className="relative mt-6 text-xs text-white/70">0 so'm · {t('common.free')}</p>
        </div>
      </section>
    </div>
  );
}

function CategoryTile({ category, lang }) {
  const Icon = categoryIcon(category.slug);
  return (
    <Link
      to={`/explore?category=${category.slug}`}
      className="soft card-hover group flex flex-col items-center gap-3 p-5 text-center"
      style={{ textDecoration: 'none' }}
    >
      <div
        className="grid h-14 w-14 place-items-center rounded-2xl text-white transition-transform group-hover:scale-110"
        style={{ background: `linear-gradient(135deg, ${category.accent}, ${category.accent}aa)`, boxShadow: `0 10px 22px -8px ${category.accent}` }}
      >
        <Icon size={23} />
      </div>
      <p className="text-xs font-bold leading-tight">{localize(category, 'name', lang)}</p>
      <p className="text-[10px] text-muted">{category.product_count}</p>
    </Link>
  );
}
