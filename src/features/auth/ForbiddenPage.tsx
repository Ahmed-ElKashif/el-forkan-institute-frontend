import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, EmptyState } from '../../ds';

/** The 403 a teacher lands on when they reach a head-teacher-only route — by a
 *  stale link, a bookmark, or by typing the URL. Calm copy, the denied face
 *  from the design system, and a way back to the dashboard. Private to the auth
 *  feature; rendered only by `RequireRole`. */
export function ForbiddenPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="grid min-h-full place-items-center p-6">
      <EmptyState
        tone="denied"
        title={t('forbidden.title')}
        description={t('forbidden.description')}
        action={
          <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
            {t('forbidden.back')}
          </Button>
        }
      />
    </div>
  );
}
