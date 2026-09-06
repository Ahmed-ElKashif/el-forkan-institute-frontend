import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Checkbox, Dialog, Field, Input, Select, type SelectOption } from '../../ds';
import { useBranchesQuery } from '../../shared/api/reference';
import { useCreateUserMutation, useUpdateUserMutation } from './users.api';
import type { User } from './user.model';

const ROLES = ['teacher', 'head_teacher'] as const;
const GENDERS = ['male', 'female'] as const;

/** Create or edit a staff account. Username and gender are set only at creation
 *  (identity / composite-FK targets on the API), and the password never lives
 *  here — it has its own reset action. */
export function UserFormDialog({
  user,
  onClose,
  onSaved,
}: {
  user: User | null; // null = create
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useTranslation();
  const isEdit = user != null;
  const branches = useBranchesQuery();
  const [create, createState] = useCreateUserMutation();
  const [update, updateState] = useUpdateUserMutation();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [gender, setGender] = useState(user?.gender ?? 'male');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user?.role ?? 'teacher');
  const [branchId, setBranchId] = useState<number | null>(user?.branchId ?? null);
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const busy = createState.isLoading || updateState.isLoading;
  const canSubmit =
    fullName.trim() !== '' &&
    phone.trim() !== '' &&
    // Email is the login identity (F12), so a new account must have one.
    (isEdit || (username.trim() !== '' && password.trim() !== '' && email.trim() !== '')) &&
    !busy;

  const branchOptions: SelectOption[] = (branches.data?.items ?? []).map((b) => ({ value: b.id, label: b.nameAr }));

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    try {
      if (isEdit) {
        await update({
          id: user.id,
          patch: {
            fullName: fullName.trim(),
            phone: phone.trim(),
            email: email.trim() === '' ? null : email.trim(),
            role,
            branchId,
            isActive,
          },
        }).unwrap();
      } else {
        await create({
          fullName: fullName.trim(),
          username: username.trim(),
          gender,
          phone: phone.trim(),
          email: email.trim(),
          password,
          role,
          branchId,
        }).unwrap();
      }
      onSaved(t(isEdit ? 'users.form.saved' : 'users.form.created', { name: fullName.trim() }));
    } catch {
      setError(t('users.form.error'));
    }
  }

  return (
    <Dialog
      title={t(isEdit ? 'users.form.editTitle' : 'users.form.createTitle')}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="primary" onClick={submit} disabled={!canSubmit} loading={busy}>
            {t('users.form.save')}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t('users.form.cancel')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}

        <Field label={t('users.form.fullName')} required>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} aria-label={t('users.form.fullName')} />
        </Field>

        {!isEdit ? (
          <>
            <Field label={t('users.form.username')} required hint={t('users.form.usernameHint')}>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} aria-label={t('users.form.username')} />
            </Field>
            <Field label={t('users.form.gender')} required>
              <Select
                options={GENDERS.map((value) => ({ value, label: t(`users.gender.${value}`) }))}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              />
            </Field>
            <Field label={t('users.form.password')} required hint={t('users.form.passwordHint')}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-label={t('users.form.password')}
              />
            </Field>
          </>
        ) : null}

        <Field label={t('users.form.phone')} required>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" aria-label={t('users.form.phone')} />
        </Field>

        <Field label={t('users.form.email')} required={!isEdit} hint={isEdit ? undefined : t('users.form.emailHint')}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label={t('users.form.email')} />
        </Field>

        <Field label={t('users.form.role')} required>
          <Select
            options={ROLES.map((value) => ({ value, label: t(`users.role.${value}`) }))}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </Field>

        <Field label={t('users.form.branch')} hint={t('users.form.branchHint')}>
          <Select
            options={branchOptions}
            value={branchId ?? ''}
            onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : null)}
            placeholder={t('users.form.branchNone')}
          />
        </Field>

        {isEdit ? (
          <Checkbox label={t('users.form.active')} checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        ) : null}
      </div>
    </Dialog>
  );
}
