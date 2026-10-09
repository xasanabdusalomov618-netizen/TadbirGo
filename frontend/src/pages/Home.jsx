import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApp } from '../store';
import { ProductCard, Spinner, Stars } from '../components';
import { locCat } from '../utils';

export default function Home() {
  const { t, lang } = useApp();
  const [cats, setCats] = useState(null);
  const [featured, setFeatured] = useState(null);
  const [popular, setPopular] = useState(null);

  useEffect(() => {
    api.get('/api/categories').then((d) => setCats(d.items)).catch(() => setCats([]));
    api.get('/api/products?featured=true&limit=4').then((d) => setFeatured(d.items)).catch(() => setFeatured([]));
    api.get('/api/products?sort=rating&limit=8').then((d) => setPopular(d.items)).catch(() => setPopular([]));
  }, []);

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
          <div className="hero__badge">🇺🇿 {t('home.heroBadge')}</div>
          <h1 className="hero__title">{t('home.heroTitle').split(' ')[0]} <span>{t('home.heroTitle').split(' ').slice(1).join(' ')}</span></h1>
          <p className="hero__subtitle">{t('home.heroSubtitle')}</p>
          <div className="hero__actions">
            <Link to="/katalog" className="btn btn--primary btn--lg">{t('home.ctaStart')} →</Link>
            <Link to="/paket" className="btn btn--outline btn--lg">🧩 {t('home.ctaBuilder')}</Link>
          </div>
          <div className="hero__stats">
            <div className="hero__stat"><strong>20+</strong><span>{t('home.stats.products')}</span></div>
            <div className="hero__stat"><strong>10+</strong><span>{t('home.stats.sellers')}</span></div>
            <div className="hero__stat"><strong>100+</strong><span>{t('home.stats.bookings')}</span></div>
            <div className="hero__stat"><strong>5+</strong><span>{t('home.stats.cities')}</span></div>
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
