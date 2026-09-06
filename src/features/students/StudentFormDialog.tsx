import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  Field,
  Input,
  Select,
  Textarea,
  type SelectOption,
} from '../../ds';
import { useAuth } from '../auth';
import {
  useGovernoratesQuery,
  useMarkazesQuery,
} from '../../shared/api/reference';
import { useUpdateStudentMutation } from './students.api';
import type { StudentDetail, StudentPatch } from './student.model';

const STATUSES = ['active', 'graduated', 'withdrawn', 'suspended'] as const;

// The same rule the API enforces (common/arabic-name.schema.ts): Arabic letters,
// spaces, hyphen and apostrophe only. Duplicated here only for instant feedback;
// the API stays the authority and rejects anything this misses.
const ARABIC_NAME = /^[ء-ي '’-]{2,}$/u;

/** Edit a student's record. Every field maps to `PATCH /students/:id`; gender,
 *  branch and student code are deliberately not here (identity / composite-FK
 *  targets). The national ID is head-teacher only and write-only — its current
 *  value never leaves the server, so a blank field means "leave unchanged". */
export function StudentFormDialog({
  student,
  onClose,
  onSaved,
}: {
  student: StudentDetail;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [update, updateState] = useUpdateStudentMutation();

  const [fullName, setFullName] = useState(student.fullName);
  const [phone, setPhone] = useState(student.phone ?? '');
  const [whatsappPhone, setWhatsappPhone] = useState(student.whatsappPhone ?? '');
  const [birthDate, setBirthDate] = useState(student.birthDate ?? '');
  const [governorateId, setGovernorateId] = useState<number | null>(student.governorateId);
  const [markazId, setMarkazId] = useState<number | null>(student.markazId);
  const [address, setAddress] = useState(student.address ?? '');
  const [nationalId, setNationalId] = useState('');
  const [notes, setNotes] = useState(student.notes ?? '');
  const [whatsappOptIn, setWhatsappOptIn] = useState(student.whatsappOptIn);
  const [status, setStatus] = useState(student.status);
  const [error, setError] = useState<string | null>(null);

  const governorates = useGovernoratesQuery();
  const markazes = useMarkazesQuery(governorateId ?? 0, { skip: governorateId == null });

  const nameValid = ARABIC_NAME.test(fullName.trim());
  const busy = updateState.isLoading;
  const canSubmit = nameValid && !busy;

  const toOptions = (items: { id: number; nameAr: string }[]): SelectOption[] =>
    items.map((item) => ({ value: item.id, label: item.nameAr }));

  function chooseGovernorate(next: number | null) {
    setGovernorateId(next);
    // A markaz belongs to one governorate, so a change invalidates the choice.
    setMarkazId(null);
  }

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    const patch: StudentPatch = {
      fullName: fullName.trim(),
      phone: emptyToNull(phone),
      whatsappPhone: emptyToNull(whatsappPhone),
      birthDate: emptyToNull(birthDate),
      governorateId,
      markazId,
      address: emptyToNull(address),
      notes: emptyToNull(notes),
      whatsappOptIn,
      status,
    };
    // Write-only: only sent when the head teacher actually entered one.
    if (nationalId.trim() !== '') patch.nationalId = nationalId.trim();

    try {
      await update({ id: student.id, patch }).unwrap();
      onSaved(t('students.form.saved'));
    } catch (cause) {
      setError((cause as { detail?: string })?.detail ?? t('students.form.error'));
    }
  }

  return (
    <Dialog
      title={t('students.form.editTitle')}
      onClose={onClose}
      width={620}
      footer={
        <>
          <Button variant="primary" icon="circle-check" onClick={submit} disabled={!canSubmit} loading={busy}>
            {t('students.form.save')}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t('students.form.cancel')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}

        <Field
          label={t('students.form.fullName')}
          required
          hint={t('students.form.fullNameHint')}
          error={fullName.trim() !== '' && !nameValid ? t('students.form.fullNameInvalid') : undefined}
        >
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            invalid={fullName.trim() !== '' && !nameValid}
            aria-label={t('students.form.fullName')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('students.form.phone')}>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" aria-label={t('students.form.phone')} />
          </Field>
          <Field label={t('students.form.whatsapp')}>
            <Input value={whatsappPhone} onChange={(e) => setWhatsappPhone(e.target.value)} inputMode="tel" aria-label={t('students.form.whatsapp')} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('students.form.birthDate')}>
            <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} aria-label={t('students.form.birthDate')} />
          </Field>
          <Field label={t('students.form.status')}>
            <Select
              options={STATUSES.map((value) => ({ value, label: t(`students.status.${value}`) }))}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('students.form.governorate')}>
            <Select
              options={toOptions(governorates.data?.items ?? [])}
              value={governorateId ?? ''}
              onChange={(e) => chooseGovernorate(e.target.value ? Number(e.target.value) : null)}
              placeholder={t('students.form.governorateNone')}
            />
          </Field>
          <Field label={t('students.form.markaz')} hint={governorateId == null ? t('students.form.markazHint') : undefined}>
            <Select
              options={toOptions(markazes.data?.items ?? [])}
              value={markazId ?? ''}
              onChange={(e) => setMarkazId(e.target.value ? Number(e.target.value) : null)}
              placeholder={t('students.form.markazNone')}
              disabled={governorateId == null}
            />
          </Field>
        </div>

        <Field label={t('students.form.address')}>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} aria-label={t('students.form.address')} />
        </Field>

        {user?.role === 'head_teacher' ? (
          <Field label={t('students.form.nationalId')} headTeacherOnly hint={t('students.form.nationalIdHint')}>
            <Input
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              inputMode="numeric"
              numeric
              maxLength={14}
              placeholder={student.hasNationalId ? t('students.form.nationalIdOnFile') : undefined}
              aria-label={t('students.form.nationalId')}
            />
          </Field>
        ) : null}

        <Field label={t('students.form.notes')}>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} aria-label={t('students.form.notes')} />
        </Field>

        <Checkbox
          label={t('students.form.whatsappOptIn')}
          checked={whatsappOptIn}
          onChange={(e) => setWhatsappOptIn(e.target.checked)}
        />
      </div>
    </Dialog>
  );
}

/** A cleared text field means "remove this value", i.e. send an explicit null. */
function emptyToNull(value: string): string | null {
  return value.trim() === '' ? null : value.trim();
}
