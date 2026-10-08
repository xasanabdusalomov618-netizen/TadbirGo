import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Loader, EmptyState } from './ui.jsx';

export default function ProtectedRoute({ children, roles, sellerOnly = false }) {
  const { t } = useTranslation();
  const { user, loading, seller } = useAuth();
  const location = useLocation();

  if (loading) return <Loader />;

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          icon={ShieldAlert}
          title={t('errors.forbidden')}
          description={t('errors.forbiddenText')}
        />
      </div>
    );
  }

  if (sellerOnly && user.role !== 'admin' && !seller) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          icon={ShieldAlert}
          title={t('errors.sellerOnly')}
          description={t('errors.sellerOnlyText')}
        />
      </div>
    );
  }

  return children;
}
