import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  Dialog,
  EmptyState,
  Field,
  IconButton,
  Input,
  SearchInput,
  Select,
  Toast,
  type BadgeProps,
  type Column,
} from '../../ds';
import { useDebouncedValue } from '../../shared/react/useDebouncedValue';
import { PagedList } from '../../shared/react/PagedList';
import { useListUsersQuery, useResetUserPasswordMutation, useSoftDeleteUserMutation } from './users.api';
import { UserFormDialog } from './UserFormDialog';
import type { User } from './user.model';

const ROLE_TONE: Record<string, BadgeProps['tone']> = {
  head_teacher: 'brand',
  teacher: 'neutral',
};

type ToastState = { tone: 'success' | 'danger'; message: string };
/** null = create; a User = edit; undefined = the form is closed. */
type FormTarget = User | null | undefined;

/** Staff accounts (head-teacher only, gated). Search, filter by role and
 *  active state, create/edit, reset a password, and soft-delete with a reason
 *  (R9). Server-paginated and debounced. */
export function UsersPage() {
  const { t } = useTranslation();
  const [term, setTerm] = useState('');
  const [role, setRole] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(term.trim(), 300);

  const [form, setForm] = useState<FormTarget>(undefined);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [reason, setReason] = useState('');
  const [resetting, setResetting] = useState<User | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [remove] = useSoftDeleteUserMutation();
  const query = useListUsersQuery({ page, role, search, includeInactive });
  const list = query.data;

  function resetPaging<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  async function confirmDelete() {
    if (deleting == null) return;
    try {
      await remove({ id: deleting.id, reason: reason.trim() }).unwrap();
      setDeleting(null);
      setReason('');
      setToast({ tone: 'success', message: t('users.deleted', { name: deleting.fullName }) });
    } catch {
      setToast({ tone: 'danger', message: t('users.deleteError') });
    }
  }

  const columns: Column<User>[] = [
    { key: 'name', header: t('users.columns.name'), render: (u) => u.fullName },
    { key: 'username', header: t('users.columns.username'), render: (u) => <span className="ef-num">{u.username}</span> },
    { key: 'role', header: t('users.columns.role'), render: (u) => <Badge tone={ROLE_TONE[u.role] ?? 'neutral'}>{t(`users.role.${u.role}`)}</Badge> },
    { key: 'phone', header: t('users.columns.phone'), render: (u) => <bdi className="ef-num">{u.phone}</bdi> },
    {
      key: 'status',
      header: t('users.columns.status'),
      render: (u) => <Badge tone={u.isActive ? 'success' : 'neutral'}>{t(u.isActive ? 'users.status.active' : 'users.status.inactive')}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      render: (u) => (
        <div className="flex justify-end gap-1">
          <IconButton icon="pencil" label={t('users.edit')} size="sm" onClick={() => setForm(u)} />
          <IconButton icon="lock" label={t('users.reset')} size="sm" onClick={() => setResetting(u)} />
          <IconButton icon="trash" label={t('users.delete')} size="sm" onClick={() => setDeleting(u)} />
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={term} onChange={(e) => resetPaging(setTerm)(e.target.value)} aria-label={t('users.searchPlaceholder')} placeholder={t('users.searchPlaceholder')} />
        <Select
          aria-label={t('users.roleFilter')}
          options={[
            { value: '', label: t('users.allRoles') },
            { value: 'teacher', label: t('users.role.teacher') },
            { value: 'head_teacher', label: t('users.role.head_teacher') },
          ]}
          value={role}
          onChange={(e) => resetPaging(setRole)(e.target.value)}
          wrapperClassName="w-40"
        />
        <Checkbox label={t('users.includeInactive')} checked={includeInactive} onChange={(e) => resetPaging(setIncludeInactive)(e.target.checked)} />
        <Button className="ms-auto" icon="plus" onClick={() => setForm(null)}>
          {t('users.create')}
        </Button>
      </div>

      <PagedList
        data={list}
        isLoading={query.isLoading}
        isError={query.isError}
        isFetching={query.isFetching}
        columns={columns}
        getRowKey={(u) => u.id}
        errorTitle={t('users.error')}
        page={page}
        onPage={setPage}
        empty={<EmptyState icon="user" title={t('users.empty.title')} description={t('users.empty.description')} />}
      />

      {form !== undefined ? (
        <UserFormDialog
          user={form}
          onClose={() => setForm(undefined)}
          onSaved={(message) => {
            setForm(undefined);
            setToast({ tone: 'success', message });
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          tone="danger"
          title={t('users.confirmDelete.title')}
          consequence={t('users.confirmDelete.consequence', { name: deleting.fullName })}
          confirmLabel={t('users.delete')}
          requireReason
          reason={reason}
          onReasonChange={setReason}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleting(null);
            setReason('');
          }}
        />
      ) : null}

      {resetting ? (
        <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} onDone={(message) => { setResetting(null); setToast({ tone: 'success', message }); }} />
      ) : null}

      {toast ? (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <Toast tone={toast.tone} message={toast.message} onDismiss={() => setToast(null)} />
        </div>
      ) : null}
    </section>
  );
}

function ResetPasswordDialog({ user, onClose, onDone }: { user: User; onClose: () => void; onDone: (message: string) => void }) {
  const { t } = useTranslation();
  const [reset, { isLoading }] = useResetUserPasswordMutation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (password.trim() === '') return;
    setError(null);
    try {
      await reset({ id: user.id, newPassword: password }).unwrap();
      onDone(t('users.resetDone', { name: user.fullName }));
    } catch {
      setError(t('users.resetError'));
    }
  }

  return (
    <Dialog
      title={t('users.resetTitle', { name: user.fullName })}
      onClose={onClose}
      width={440}
      footer={
        <>
          <Button variant="primary" onClick={submit} loading={isLoading} disabled={password.trim() === '' || isLoading}>
            {t('users.reset')}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t('users.form.cancel')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}
        <Field label={t('users.form.password')} required hint={t('users.form.passwordHint')}>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} aria-label={t('users.form.password')} />
        </Field>
      </div>
    </Dialog>
  );
}

