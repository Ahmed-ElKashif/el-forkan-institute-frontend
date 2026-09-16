import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Field, Input, Select, Toast } from '../../ds';
import { useAuth } from '../auth';
import { useChangeMyPasswordMutation, useUpdateMyProfileMutation } from './profile.api';

const MIN_PASSWORD = 10;
// Mirrors the API's username rule: ASCII letters/digits/dot/underscore/dash.
const USERNAME_RE = /^[a-zA-Z0-9._-]+$/;

type ToastState = { tone: 'success' | 'danger'; message: string };

/** The signed-in user's own account: view their details, edit the ones they may
 *  change, and set a new password. The head teacher edits their name/phone/email
 *  here; a teacher's details are read-only (only the head teacher may change
 *  them), but any user may change their own password. */
export function ProfilePage() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [toast, setToast] = useState<ToastState | null>(null);

  if (!user) return null; // ProtectedRoute guarantees a user; this only narrows.

  const isHeadTeacher = user.role === 'head_teacher';

  return (
    <section className="mx-auto grid max-w-2xl gap-6">
      <header>
        <h1 className="m-0 text-xl font-bold text-ink-900">{user.fullName}</h1>
        <p className="mt-1 mb-0 text-sm text-ink-500">
          {t(`profile.role.${user.role}`)} · <span className="ef-num">{user.username}</span>
        </p>
      </header>

      <DetailsCard user={user} canEdit={isHeadTeacher} onDone={setToast} onNameChanged={refreshUser} />
      <PasswordCard onDone={setToast} />

      {toast ? (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <Toast tone={toast.tone} message={toast.message} onDismiss={() => setToast(null)} />
        </div>
      ) : null}
    </section>
  );
}

function DetailsCard({
  user,
  canEdit,
  onDone,
  onNameChanged,
}: {
  user: { id: string; fullName: string; username: string; email: string | null; phone: string; role: string; gender: string };
  canEdit: boolean;
  onDone: (toast: ToastState) => void;
  onNameChanged: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [update, updateState] = useUpdateMyProfileMutation();
  const [fullName, setFullName] = useState(user.fullName);
  const [username, setUsername] = useState(user.username);
  const [gender, setGender] = useState(user.gender);
  const [phone, setPhone] = useState(user.phone);
  const [email, setEmail] = useState(user.email ?? '');

  const usernameValid = username.trim().length >= 3 && USERNAME_RE.test(username.trim());
  const canSubmit =
    canEdit && fullName.trim().length >= 2 && usernameValid && !updateState.isLoading;

  async function submit() {
    if (!canSubmit) return;
    try {
      await update({
        id: user.id,
        fullName: fullName.trim(),
        username: username.trim(),
        gender: gender === 'female' ? 'female' : 'male',
        phone: phone.trim(),
        email: email.trim() === '' ? null : email.trim(),
      }).unwrap();
      // The name shows in the top bar, so pull the fresh profile into the shell.
      await onNameChanged();
      onDone({ tone: 'success', message: t('profile.saved') });
    } catch {
      onDone({ tone: 'danger', message: t('profile.saveError') });
    }
  }

  return (
    <Card>
      <h2 className="m-0 mb-4 text-base font-bold text-ink-900">{t('profile.info.title')}</h2>
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('profile.fields.fullName')}>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={!canEdit} aria-label={t('profile.fields.fullName')} />
          </Field>
          <Field
            label={t('profile.fields.username')}
            hint={t('profile.fields.usernameHint')}
            error={username.trim() !== '' && !usernameValid ? t('profile.fields.usernameError') : undefined}
          >
            <Input value={username} onChange={(e) => setUsername(e.target.value)} disabled={!canEdit} invalid={username.trim() !== '' && !usernameValid} aria-label={t('profile.fields.username')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('profile.fields.phone')}>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!canEdit} inputMode="tel" aria-label={t('profile.fields.phone')} />
          </Field>
          <Field label={t('profile.fields.email')}>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} disabled={!canEdit} inputMode="email" aria-label={t('profile.fields.email')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('profile.fields.gender')} hint={t('profile.fields.genderHint')}>
            <Select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              disabled={!canEdit}
              aria-label={t('profile.fields.gender')}
              options={[
                { value: 'male', label: t('profile.gender.male') },
                { value: 'female', label: t('profile.gender.female') },
              ]}
            />
          </Field>
        </div>

        {canEdit ? (
          <div className="flex justify-end">
            <Button icon="circle-check" onClick={submit} disabled={!canSubmit} loading={updateState.isLoading}>
              {t('profile.save')}
            </Button>
          </div>
        ) : (
          <Alert tone="info" title={t('profile.readOnlyNote')} />
        )}
      </div>
    </Card>
  );
}

function PasswordCard({ onDone }: { onDone: (toast: ToastState) => void }) {
  const { t } = useTranslation();
  const [change, changeState] = useChangeMyPasswordMutation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const tooShort = next !== '' && next.length < MIN_PASSWORD;
  const mismatch = confirm !== '' && next !== confirm;
  const canSubmit =
    current !== '' &&
    next.length >= MIN_PASSWORD &&
    next === confirm &&
    next !== current &&
    !changeState.isLoading;

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    try {
      await change({ currentPassword: current, newPassword: next }).unwrap();
      setCurrent('');
      setNext('');
      setConfirm('');
      onDone({ tone: 'success', message: t('profile.password.saved') });
    } catch {
      setError(t('profile.password.error'));
    }
  }

  return (
    <Card>
      <h2 className="m-0 mb-4 text-base font-bold text-ink-900">{t('profile.password.title')}</h2>
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}
        <Field label={t('profile.password.current')}>
          <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" aria-label={t('profile.password.current')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('profile.password.new')} hint={t('profile.password.hint')} error={tooShort ? t('profile.password.tooShort') : undefined}>
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} invalid={tooShort} autoComplete="new-password" aria-label={t('profile.password.new')} />
          </Field>
          <Field label={t('profile.password.confirm')} error={mismatch ? t('profile.password.mismatch') : undefined}>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} invalid={mismatch} autoComplete="new-password" aria-label={t('profile.password.confirm')} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button icon="circle-check" onClick={submit} disabled={!canSubmit} loading={changeState.isLoading}>
            {t('profile.password.save')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
