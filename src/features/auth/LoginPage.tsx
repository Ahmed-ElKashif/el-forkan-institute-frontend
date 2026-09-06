import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Field, Input, Logo, OtpInput } from '../../ds';
import { authErrorKey } from './auth-error-message';
import { useAuth } from './auth-context';

interface LocationState {
  from?: string;
}

/** Two-factor sign-in (F12): email + password first, then the six-digit code
 *  emailed to the staff member. The session opens only on the second step, so
 *  `status` stays `anonymous` between them and the redirect below fires only
 *  once the code is verified. */
export function LoginPage() {
  const { t } = useTranslation();
  const { status, beginSignIn, verifyOtp } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') {
    const from = (location.state as LocationState | null)?.from;
    return <Navigate to={from ?? '/'} replace />;
  }

  async function handleCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorKey(null);
    setSubmitting(true);
    try {
      const id = await beginSignIn({ email: email.trim(), password });
      setChallengeId(id);
      setCode('');
    } catch (error) {
      setErrorKey(authErrorKey(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (challengeId === null) return;
    setErrorKey(null);
    setSubmitting(true);
    try {
      await verifyOtp({ challengeId, code: code.trim() });
    } catch (error) {
      setErrorKey(authErrorKey(error));
    } finally {
      setSubmitting(false);
    }
  }

  function backToCredentials() {
    setChallengeId(null);
    setCode('');
    setErrorKey(null);
  }

  const onCodeStep = challengeId !== null;

  return (
    <div className="grid min-h-screen place-items-center bg-teal-800 p-6">
      <div className="grid w-full max-w-105 justify-items-center gap-6 rounded-xl bg-surface p-8 shadow-modal">
        <Logo variant="full" height={104} />

        <div className="text-center">
          <h1 className="text-xl">
            {t(onCodeStep ? 'auth.login.otpTitle' : 'auth.login.title')}
          </h1>
          <p className="m-0 mt-1 text-sm text-ink-500">
            {onCodeStep
              ? t('auth.login.otpSubtitle', { email: email.trim() })
              : t('auth.login.subtitle')}
          </p>
        </div>

        {errorKey ? (
          <Alert tone="danger" title={t('auth.login.failed')} className="w-full">
            {t(errorKey)}
          </Alert>
        ) : null}

        {onCodeStep ? (
          <form className="grid w-full gap-4" onSubmit={handleVerify} noValidate>
            <Field label={t('auth.login.code')} required hint={t('auth.login.codeHint')}>
              <OtpInput
                value={code}
                onChange={setCode}
                autoFocus
                ariaLabel={t('auth.login.code')}
              />
            </Field>

            <Button type="submit" size="lg" fullWidth icon="log-in" loading={submitting}>
              {submitting ? t('auth.login.verifying') : t('auth.login.verify')}
            </Button>
            <Button type="button" variant="secondary" fullWidth onClick={backToCredentials} disabled={submitting}>
              {t('auth.login.back')}
            </Button>
          </form>
        ) : (
          <form className="grid w-full gap-4" onSubmit={handleCredentials} noValidate>
            <Field label={t('auth.login.email')} htmlFor={emailId} required hint={t('auth.login.emailHint')}>
              <Input
                id={emailId}
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
            <Button type="button" variant="secondary" fullWidth onClick={() => navigate('/reset-password')} disabled={submitting}>
              {t('auth.login.forgot')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
