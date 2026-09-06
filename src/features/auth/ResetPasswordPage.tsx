import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Field, Input, Logo, OtpInput } from '../../ds';
import { useContainer } from '../../shared/di/DiProvider';
import { authErrorKey } from './auth-error-message';

/** Self-service password reset (F12), proven by an emailed OTP — the same
 *  code-to-email mechanism as login. Three states: request a code, set a new
 *  password with the code, then done. It never opens a session; the user
 *  returns to /login and signs in with the new password. Uses the container's
 *  auth service directly (not AuthContext) since none of this touches session
 *  state. */
export function ResetPasswordPage() {
  const { t } = useTranslation();
  const { auth } = useContainer();
  const navigate = useNavigate();
  const emailId = useId();
  const passwordId = useId();

  const [step, setStep] = useState<'request' | 'confirm' | 'done'>('request');
  const [email, setEmail] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorKey(null);
    setSubmitting(true);
    try {
      const id = await auth.requestPasswordReset({ email: email.trim() });
      setChallengeId(id);
      setStep('confirm');
    } catch (error) {
      setErrorKey(authErrorKey(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (challengeId === null) return;
    setErrorKey(null);
    setSubmitting(true);
    try {
      await auth.confirmPasswordReset({ challengeId, code: code.trim(), newPassword });
      setStep('done');
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
          <h1 className="text-xl">{t('auth.reset.title')}</h1>
          <p className="m-0 mt-1 text-sm text-ink-500">
            {step === 'confirm'
              ? t('auth.reset.confirmSubtitle', { email: email.trim() })
              : t('auth.reset.requestSubtitle')}
          </p>
        </div>

        {errorKey ? (
          <Alert tone="danger" title={t('auth.reset.failed')} className="w-full">
            {t(errorKey)}
          </Alert>
        ) : null}

        {step === 'done' ? (
          <>
            <Alert tone="success" title={t('auth.reset.doneTitle')} className="w-full">
              {t('auth.reset.doneBody')}
            </Alert>
            <Button size="lg" fullWidth icon="log-in" onClick={() => navigate('/login')}>
              {t('auth.reset.toLogin')}
            </Button>
          </>
        ) : step === 'confirm' ? (
          <form className="grid w-full gap-4" onSubmit={handleConfirm} noValidate>
            <Field label={t('auth.login.code')} required hint={t('auth.login.codeHint')}>
              <OtpInput
                value={code}
                onChange={setCode}
                autoFocus
                ariaLabel={t('auth.login.code')}
              />
            </Field>

            <Field label={t('auth.reset.newPassword')} htmlFor={passwordId} required hint={t('auth.reset.newPasswordHint')}>
              <Input
                id={passwordId}
                name="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Field>

            <Button type="submit" size="lg" fullWidth icon="circle-check" loading={submitting}>
              {submitting ? t('auth.reset.saving') : t('auth.reset.save')}
            </Button>
            <Button type="button" variant="secondary" fullWidth onClick={() => navigate('/login')} disabled={submitting}>
              {t('auth.reset.cancel')}
            </Button>
          </form>
        ) : (
          <form className="grid w-full gap-4" onSubmit={handleRequest} noValidate>
            <Field label={t('auth.login.email')} htmlFor={emailId} required hint={t('auth.reset.requestHint')}>
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

            <Button type="submit" size="lg" fullWidth icon="lock-open" loading={submitting}>
              {submitting ? t('auth.reset.sending') : t('auth.reset.send')}
            </Button>
            <Button type="button" variant="secondary" fullWidth onClick={() => navigate('/login')} disabled={submitting}>
              {t('auth.reset.cancel')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
