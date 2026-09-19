import { useTranslation } from 'react-i18next';
import { Checkbox, Field, Input, Select, Textarea, type SelectOption } from '../../ds';
import { useGovernoratesQuery, useMarkazesQuery } from '../../shared/api/reference';
import type { StudentDetail } from './student.model';

// The same rule the API enforces (common/arabic-name.schema.ts): Arabic letters,
// spaces, hyphen and apostrophe only. Mirrored here only for instant feedback;
// the API stays the authority and rejects anything this misses.
const ARABIC_NAME = /^[ء-ي '’-]{2,}$/u;

export function isValidArabicName(name: string): boolean {
  return ARABIC_NAME.test(name.trim());
}

/* `graduated` is deliberately absent: it is written by the promotion run when a
   student clears a terminal level (§4.3), never typed into a form. The profile
   still displays it; only setting it by hand is gone. */
const STATUSES = ['active', 'withdrawn', 'suspended'] as const;

/** The contact/registration fields shared by the create and edit student forms.
 *  Gender, branch and student code are never here (identity / composite-FK
 *  targets, spec §5.1); the caller supplies them for a new record. */
export interface StudentFieldValues {
  fullName: string;
  phone: string;
  whatsappPhone: string;
  birthDate: string;
  governorateId: number | null;
  markazId: number | null;
  address: string;
  nationalId: string;
  notes: string;
  whatsappOptIn: boolean;
  status: string;
}

export function emptyStudentValues(): StudentFieldValues {
  return {
    fullName: '', phone: '', whatsappPhone: '', birthDate: '',
    governorateId: null, markazId: null, address: '', nationalId: '',
    notes: '', whatsappOptIn: true, status: 'active',
  };
}

export function studentValuesFrom(student: StudentDetail): StudentFieldValues {
  return {
    fullName: student.fullName,
    phone: student.phone ?? '',
    whatsappPhone: student.whatsappPhone ?? '',
    birthDate: student.birthDate ?? '',
    governorateId: student.governorateId,
    markazId: student.markazId,
    address: student.address ?? '',
    // Write-only: the current national ID never leaves the server, so a blank
    // field always means "leave unchanged".
    nationalId: '',
    notes: student.notes ?? '',
    whatsappOptIn: student.whatsappOptIn,
    status: student.status,
  };
}

/** The reusable field grid. Presentational: it owns the governorate→markaz
 *  dependency and the name-format error, but the values, the submit and the
 *  mutation live with the caller (create or edit). */
export function StudentFields({
  values,
  onChange,
  showStatus,
  canSeeNationalId,
  nationalIdPlaceholder,
}: {
  values: StudentFieldValues;
  onChange: (values: StudentFieldValues) => void;
  /** The lifecycle status field — shown when editing, hidden when creating
   *  (a new student is always active). */
  showStatus: boolean;
  /** The head teacher may set the (write-only, audited) national ID. */
  canSeeNationalId: boolean;
  nationalIdPlaceholder?: string;
}) {
  const { t } = useTranslation();
  const governorates = useGovernoratesQuery();
  const markazes = useMarkazesQuery(values.governorateId ?? 0, { skip: values.governorateId == null });

  const nameValid = isValidArabicName(values.fullName);
  const set = (patch: Partial<StudentFieldValues>) => onChange({ ...values, ...patch });
  const toOptions = (items: { id: number; nameAr: string }[]): SelectOption[] =>
    items.map((item) => ({ value: item.id, label: item.nameAr }));

  return (
    <>
      <Field
        label={t('students.form.fullName')}
        required
        hint={t('students.form.fullNameHint')}
        error={values.fullName.trim() !== '' && !nameValid ? t('students.form.fullNameInvalid') : undefined}
      >
        <Input
          value={values.fullName}
          onChange={(e) => set({ fullName: e.target.value })}
          invalid={values.fullName.trim() !== '' && !nameValid}
          aria-label={t('students.form.fullName')}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('students.form.phone')}>
          <Input value={values.phone} onChange={(e) => set({ phone: e.target.value })} inputMode="tel" aria-label={t('students.form.phone')} />
        </Field>
        <Field label={t('students.form.whatsapp')}>
          <Input value={values.whatsappPhone} onChange={(e) => set({ whatsappPhone: e.target.value })} inputMode="tel" aria-label={t('students.form.whatsapp')} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('students.form.birthDate')}>
          <Input type="date" value={values.birthDate} onChange={(e) => set({ birthDate: e.target.value })} aria-label={t('students.form.birthDate')} />
        </Field>
        {showStatus ? (
          <Field label={t('students.form.status')}>
            <Select
              options={STATUSES.map((value) => ({ value, label: t(`students.status.${value}`) }))}
              value={values.status}
              onChange={(e) => set({ status: e.target.value })}
              aria-label={t('students.form.status')}
            />
          </Field>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('students.form.governorate')}>
          {/* `Field` only links its <label> when given `htmlFor`, which these do
              not use — so without an aria-label the control has no accessible
              name at all. */}
          <Select
            options={toOptions(governorates.data?.items ?? [])}
            value={values.governorateId ?? ''}
            // A markaz belongs to one governorate, so a change invalidates the choice.
            onChange={(e) => set({ governorateId: e.target.value ? Number(e.target.value) : null, markazId: null })}
            placeholder={t('students.form.governorateNone')}
            aria-label={t('students.form.governorate')}
          />
        </Field>
        <Field label={t('students.form.markaz')} hint={values.governorateId == null ? t('students.form.markazHint') : undefined}>
          <Select
            options={toOptions(markazes.data?.items ?? [])}
            value={values.markazId ?? ''}
            onChange={(e) => set({ markazId: e.target.value ? Number(e.target.value) : null })}
            placeholder={t('students.form.markazNone')}
            disabled={values.governorateId == null}
            aria-label={t('students.form.markaz')}
          />
        </Field>
      </div>

      <Field label={t('students.form.address')}>
        <Input value={values.address} onChange={(e) => set({ address: e.target.value })} aria-label={t('students.form.address')} />
      </Field>

      {canSeeNationalId ? (
        <Field label={t('students.form.nationalId')} headTeacherOnly hint={t('students.form.nationalIdHint')}>
          <Input
            value={values.nationalId}
            onChange={(e) => set({ nationalId: e.target.value })}
            inputMode="numeric"
            numeric
            digits
            maxLength={14}
            placeholder={nationalIdPlaceholder}
            aria-label={t('students.form.nationalId')}
          />
        </Field>
      ) : null}

      <Field label={t('students.form.notes')}>
        <Textarea rows={3} value={values.notes} onChange={(e) => set({ notes: e.target.value })} aria-label={t('students.form.notes')} />
      </Field>

      <Checkbox
        label={t('students.form.whatsappOptIn')}
        checked={values.whatsappOptIn}
        onChange={(e) => set({ whatsappOptIn: e.target.checked })}
      />
    </>
  );
}

/** A cleared text field means "remove this value", i.e. send an explicit null. */
export function emptyToNull(value: string): string | null {
  return value.trim() === '' ? null : value.trim();
}
