import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass, ArrowRight } from 'lucide-react';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <p className="text-8xl font-black gradient-text">404</p>
      <h1 className="mt-4 text-2xl font-extrabold">{t('errors.notFound')}</h1>
      <p className="mt-2 max-w-md text-sm text-muted">{t('errors.notFoundText')}</p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Link to="/" className="soft-btn-primary">
          {t('errors.goHome')} <ArrowRight size={16} />
        </Link>
        <Link to="/explore" className="soft-btn">
          <Compass size={16} /> {t('nav.explore')}
        </Link>
      </div>
    </div>
  );
}
