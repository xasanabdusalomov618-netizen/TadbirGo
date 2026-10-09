import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useApp } from '../store';
import { CountUp, ProductCard, Spinner, Stars } from '../components';
import { locCat, locName } from '../utils';

const PEOPLE_SLUGS = ['boshlovchi', 'dj', 'fotograf', 'videograf', 'animator', 'xizmatchi'];

export default function Home() {
  const { t, lang, fmtMoney } = useApp();
  const navigate = useNavigate();
  const [cats, setCats] = useState(null);
  const [featured, setFeatured] = useState(null);
  const [popular, setPopular] = useState(null);
  const [people, setPeople] = useState(null);
  const [stats, setStats] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    api.get('/api/categories').then((d) => setCats(d.items)).catch(() => setCats([]));
    api.get('/api/products?featured=true&limit=4').then((d) => setFeatured(d.items)).catch(() => setFeatured([]));
    api.get('/api/products?sort=rating&limit=8').then((d) => setPopular(d.items)).catch(() => setPopular([]));
    api.get('/api/products?sort=rating&limit=60').then((d) =>
      setPeople(d.items.filter((p) => PEOPLE_SLUGS.includes(p.category.slug)).slice(0, 4))).catch(() => setPeople([]));
    api.get('/api/stats/public').then(setStats).catch(() => setStats({}));
  }, []);

  const onSearch = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/katalog?q=${encodeURIComponent(q.trim())}` : '/katalog');
  };

  const advantages = [
    { icon: '🛡️', ...adv('adv1') },
    { icon: '🧾', ...adv('adv2') },
    { icon: '🚚', ...adv('adv3') },
    { icon: '🔧', ...adv('adv4') },
    { icon: '⭐', ...adv('adv5') },
  ];
  function adv(n) { return { title: t(`home.${n}.title`), text: t(`home.${n}.text`) }; }

  const steps = [
    { icon: '1', ...step('how1') },
    { icon: '2', ...step('how2') },
    { icon: '3', ...step('how3') },
  ];
  function step(n) { return { title: t(`home.${n}.title`), text: t(`home.${n}.text`) }; }

  return (
    <div>
      {/* HERO */}
      <section className="hero">
        <div className="container">
          <div className="hero__grid">
            <div className="hero__copy">
              <div className="hero__badge">🇺🇿 {t('home.heroBadge')}</div>
              <h1 className="hero__title">{t('home.heroTitle').split(' ')[0]} <span>{t('home.heroTitle').split(' ').slice(1).join(' ')}</span></h1>
              <p className="hero__subtitle">{t('home.heroSubtitle')}</p>
              <form className="hero__search" onSubmit={onSearch}>
                <span aria-hidden>🔍</span>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('home.searchPlaceholder')} />
                <button className="btn btn--primary btn--sm" type="submit">{t('common.search')}</button>
              </form>
              <div className="hero__actions">
                <Link to="/katalog" className="btn btn--primary btn--lg">{t('home.ctaStart')} →</Link>
                <Link to="/paket" className="btn btn--outline btn--lg">🧩 {t('home.ctaBuilder')}</Link>
              </div>
            </div>
            <div className="hero__visual" aria-hidden>
              <div className="hero-card">
                <div className="hero-card__head"><span className="hero-card__dot" />{t('home.visual.title')}</div>
                {[['🪑', t('home.visual.row1'), 1200000], ['🎤', t('home.visual.row2'), 3000000],
                  ['🔊', t('home.visual.row3'), 700000], ['📷', t('home.visual.row4'), 2000000]].map(([ic, label, val]) => (
                  <div key={label} className="hero-card__row"><span>{ic} {label}</span><strong>{fmtMoney(val)}</strong></div>
                ))}
                <div className="hero-card__bar"><div /></div>
                <div className="hero-card__foot">{t('home.visual.foot')}</div>
              </div>
            </div>
          </div>
          <div className="hero__stats">
            <div className="hero__stat"><strong>{stats ? <CountUp value={stats.products || 0} /> : '—'}</strong><span>{t('home.stats.products')}</span></div>
            <div className="hero__stat"><strong>{stats ? <CountUp value={stats.sellers || 0} /> : '—'}</strong><span>{t('home.stats.sellers')}</span></div>
            <div className="hero__stat"><strong>{stats ? <CountUp value={stats.bookings || 0} /> : '—'}</strong><span>{t('home.stats.bookings')}</span></div>
            <div className="hero__stat"><strong>{stats ? <CountUp value={stats.cities || 0} /> : '—'}</strong><span>{t('home.stats.cities')}</span></div>
          </div>
        </div>
      </section>

      {/* POPULAR CATEGORIES */}
      <section className="section">
        <div className="container">
          <div className="section__head">
            <h2 className="section__title">{t('home.popularCategories')}</h2>
            <Link to="/kategoriyalar" className="link-btn">{t('common.showAll')} →</Link>
          </div>
          {!cats ? <Spinner /> : (
            <div className="cat-grid">
              {cats.slice(0, 10).map((c) => (
                <Link key={c.id} to={`/katalog?category=${c.slug}`} className="cat-card">
                  <div className="cat-card__icon" style={{ background: 'var(--accent-soft)' }}>{c.icon}</div>
                  <h3>{locCat(c, lang)}</h3>
                  <span>{c.product_count} {t('common.products').toLowerCase()}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* TOP HOSTS & PERFORMERS */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section__head">
            <h2 className="section__title">🎤 {t('home.topPeople')}</h2>
            <Link to="/katalog?category=boshlovchi" className="link-btn">{t('common.showAll')} →</Link>
          </div>
          {!people ? <Spinner /> : (
            <div className="people-grid">
              {people.map((p) => (
                <Link key={p.id} to={`/mahsulot/${p.id}`} className="person-card">
                  <div className="person-card__avatar" style={{ background: 'var(--dual-grad)' }}>{p.category.icon}</div>
                  <div className="person-card__body">
                    <strong>{locName(p, lang)}</strong>
                    <span className="muted person-card__company">{p.seller.company_name}</span>
                    <div className="person-card__meta"><Stars value={p.rating} /> <span>{fmtMoney(p.price)}</span></div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FEATURED */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section__head">
            <h2 className="section__title">⭐ {t('home.featuredProducts')}</h2>
            <Link to="/katalog" className="link-btn">{t('common.showAll')} →</Link>
          </div>
          {!featured ? <Spinner /> : (
            <div className="products-grid">
              {featured.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section__head"><h2 className="section__title">{t('home.howTitle')}</h2></div>
          <div className="steps">
            {steps.map((s, i) => (
              <div key={i} className="step">
                <div className="step__num">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ADVANTAGES */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section__head"><h2 className="section__title">{t('home.advTitle')}</h2></div>
          <div className="adv-grid">
            {advantages.map((a, i) => (
              <div key={i} className="adv">
                <div className="adv__icon">{a.icon}</div>
                <h4>{a.title}</h4>
                <p>{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TOP RATED */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section__head">
            <h2 className="section__title">🏆 {t('catalog.sort.rating')}</h2>
          </div>
          {!popular ? <Spinner /> : (
            <div className="products-grid">
              {popular.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="cta-banner">
            <div>
              <h2>{t('home.ctaBanner.title')}</h2>
              <p>{t('home.ctaBanner.text')}</p>
            </div>
            <Link to="/paket" className="btn btn--lg">🧩 {t('home.ctaBanner.btn')}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
