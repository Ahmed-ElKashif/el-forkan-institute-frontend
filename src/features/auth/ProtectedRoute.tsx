import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Skeleton } from '../../ds';
import { useAuth } from './auth-context';

/** Gate for every signed-in route.
 *
 *  While `restore()` is still deciding, it renders a placeholder rather than
 *  the login screen — redirecting first and correcting later would bounce an
 *  already-signed-in user through a sign-in form on every reload.
 *
 *  This is navigation, not security. Authorisation is the API's, and 54 of its
 *  115 routes enforce the head-teacher rule server-side. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (status === 'checking') {
    return (
      <div className="grid min-h-screen place-items-center bg-app p-6">
        <Skeleton rows={3} width={280} aria-label={t('common.loading')} />
      </div>
    );
  }

  if (status === 'anonymous') {
    /* `state.from` lets the login screen send the user back where they were
       aiming once they authenticate. */
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
