import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone, Mail, MapPin, Instagram, Send } from 'lucide-react';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const columns = [
    {
      title: t('footer.catalog'),
      links: [
        { to: '/explore', label: t('nav.explore') },
        { to: '/categories', label: t('nav.categories') },
        { to: '/package-builder', label: t('nav.packages') },
        { to: '/', label: t('footer.howItWorks') },
      ],
    },
    {
      title: t('footer.forSellers'),
      links: [
        { to: '/register?role=seller', label: t('footer.becomeSeller') },
        { to: '/seller/products/new', label: t('footer.addProduct') },
        { to: '/seller', label: t('nav.dashboard') },
        { to: '/seller/earnings', label: t('nav.earnings') },
      ],
    },
    {
      title: t('footer.support'),
      links: [
        { to: '/bookings', label: t('nav.bookings') },
        { to: '/profile', label: t('nav.profile') },
        { to: '/login', label: t('nav.login') },
        { to: '/admin', label: t('nav.admin') },
      ],
    },
  ];

  return (
    <footer className="mt-16 border-t border-line/60 bg-surface2/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-10 w-10 place-items-center rounded-2xl text-white"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }}
            >
              <span className="text-lg font-black">E</span>
            </span>
            <span className="text-lg font-extrabold">
              Event<span className="gradient-text">Box</span> UZ
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">{t('footer.aboutText')}</p>
          <div className="mt-5 flex flex-col gap-2 text-sm text-muted">
            <a href="tel:+998712000000" className="flex items-center gap-2 transition hover:text-accent">
              <Phone size={15} /> +998 71 200 00 00
            </a>
            <a href="mailto:info@eventbox.uz" className="flex items-center gap-2 transition hover:text-accent">
              <Mail size={15} /> info@eventbox.uz
            </a>
            <span className="flex items-center gap-2">
              <MapPin size={15} /> Toshkent, O‘zbekiston
            </span>
          </div>
          <div className="mt-5 flex gap-2">
            <a
              href="https://t.me/eventbox_uz"
              target="_blank"
              rel="noreferrer"
              className="soft-icon !h-10 !w-10 text-muted transition hover:text-accent"
              aria-label="Telegram"
            >
              <Send size={16} />
            </a>
            <a
              href="https://instagram.com/eventbox.uz"
              target="_blank"
              rel="noreferrer"
              className="soft-icon !h-10 !w-10 text-muted transition hover:text-accent"
              aria-label="Instagram"
            >
              <Instagram size={16} />
            </a>
            <a
              href="mailto:info@eventbox.uz"
              className="soft-icon !h-10 !w-10 text-muted transition hover:text-accent"
              aria-label="Email"
            >
              <Mail size={16} />
            </a>
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="mb-4 text-sm font-extrabold">{col.title}</h4>
            <ul className="space-y-2.5">
              {col.links.map((link) => (
                <li key={link.to + link.label}>
                  <Link to={link.to} className="text-sm text-muted transition hover:text-accent">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-line/60 px-4 py-5 pb-24 sm:px-6 lg:pb-5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-xs text-muted sm:flex-row">
          <p>© {year} EventBox UZ. {t('footer.rights')}</p>
          <p className="flex items-center gap-3">
            <span>{t('footer.madeIn')} ❤️</span>
            <Link to="/" className="transition hover:text-accent">{t('footer.privacy')}</Link>
            <Link to="/" className="transition hover:text-accent">{t('footer.terms')}</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
