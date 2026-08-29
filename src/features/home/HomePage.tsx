import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, TopBar } from '../../ds';
import { useAuth } from '../auth/auth-context';

/** Placeholder shell for F0b.
 *
 *  The real frame — SideNav, role-scoped navigation, breadcrumbs — is F0c, and
 *  the screens behind it are F1 onward. This page exists to prove the session
 *  works end to end: sign in, survive a reload, sign out. */
export function HomePage() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-app">
      <TopBar
        title={t('home.title')}
        subtitle={t('home.subtitle')}
        user={user ? { name: user.fullName, role: user.role } : undefined}
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon="log-out"
            iconMirror
            loading={signingOut}
            onClick={handleSignOut}
          >
            {t('common.signOut')}
          </Button>
        }
      />

      <div className="mx-auto grid max-w-[1200px] gap-6 p-6">
        <Alert tone="info" title={t('home.subtitle')}>
          {t('home.note')}
        </Alert>

        {user ? (
          <Card title={t('home.signedInAs')}>
            <dl className="grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6">
              <dt className="text-ink-500">{t('auth.login.username')}</dt>
              <dd className="ef-num m-0 text-ink-900">{user.username}</dd>
              <dt className="text-ink-500">{t('home.fullName')}</dt>
              <dd className="m-0 text-ink-900">{user.fullName}</dd>
              <dt className="text-ink-500">{t('common.role')}</dt>
              <dd className="m-0 text-ink-900">{t(`common.roles.${user.role}`)}</dd>
            </dl>
          </Card>
        ) : null}

        <div>
          <Link to="/ds" className="text-sm">
            {t('home.designSystem')}
          </Link>
        </div>
      </div>
    </div>
  );
}
