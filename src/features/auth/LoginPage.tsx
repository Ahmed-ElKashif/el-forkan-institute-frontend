import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';
import { Alert, Button, Field, Input, Logo } from '../../ds';
import { authErrorKey } from './auth-error-message';
import { useAuth } from './auth-context';

interface LocationState {
  from?: string;
}

export function LoginPage() {
  const { t } = useTranslation();
  const { status, signIn } = useAuth();
  const location = useLocation();
  const usernameId = useId();
  const passwordId = useId();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') {
    const from = (location.state as LocationState | null)?.from;
    return <Navigate to={from ?? '/'} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorKey(null);
    setSubmitting(true);
    try {
      await signIn({ username: username.trim(), password });
    } catch (error) {
      setErrorKey(authErrorKey(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-teal-800 p-6">
      <div className="grid w-full max-w-105 justify-items-center gap-6 rounded-xl bg-surface p-8 shadow-modal">
        <Logo variant="full" height={104} />

        <div className="text-center">
          <h1 className="text-xl">{t('auth.login.title')}</h1>
          <p className="m-0 mt-1 text-sm text-ink-500">{t('auth.login.subtitle')}</p>
        </div>

        {errorKey ? (
          <Alert tone="danger" title={t('auth.login.failed')} className="w-full">
            {t(errorKey)}
          </Alert>
        ) : null}

        <form className="grid w-full gap-4" onSubmit={handleSubmit} noValidate>
          {/* The API authenticates on `username`, not email — `users.email` is
              nullable and is not a credential. */}
          <Field label={t('auth.login.username')} htmlFor={usernameId} required hint={t('auth.login.usernameHint')}>
            <Input
              id={usernameId}
              name="username"
              autoComplete="username"
              autoFocus
              required
              maxLength={50}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>

          <Field label={t('auth.login.password')} htmlFor={passwordId} required>
            <Input
              id={passwordId}
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          <Button type="submit" size="lg" fullWidth icon="log-in" loading={submitting}>
            {submitting ? t('auth.login.submitting') : t('auth.login.submit')}
          </Button>
        </form>
      </div>
    </div>
  );
}
