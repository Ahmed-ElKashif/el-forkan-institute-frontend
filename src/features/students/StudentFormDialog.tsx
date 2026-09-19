import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Dialog } from '../../ds';
import { useAuth } from '../auth';
import { useUpdateStudentMutation } from './students.api';
import type { StudentDetail, StudentPatch } from './student.model';
import {
  StudentFields,
  emptyToNull,
  isValidArabicName,
  studentValuesFrom,
  type StudentFieldValues,
} from './StudentFields';

/** Edit a student's record. Every field maps to `PATCH /students/:id`; gender and
 *  branch are deliberately not here (identity / composite-FK targets). The
 *  national ID is head-teacher only and write-only — its current value never
 *  leaves the server, so a blank field means "leave unchanged". */
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
  const [values, setValues] = useState<StudentFieldValues>(() => studentValuesFrom(student));
  const [error, setError] = useState<string | null>(null);

  const busy = updateState.isLoading;
  const canSubmit = isValidArabicName(values.fullName) && !busy;

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    const patch: StudentPatch = {
      fullName: values.fullName.trim(),
      phone: emptyToNull(values.phone),
      whatsappPhone: emptyToNull(values.whatsappPhone),
      birthDate: emptyToNull(values.birthDate),
      governorateId: values.governorateId,
      markazId: values.markazId,
      address: emptyToNull(values.address),
      notes: emptyToNull(values.notes),
      whatsappOptIn: values.whatsappOptIn,
      status: values.status,
    };
    // Write-only: only sent when the head teacher actually entered one.
    if (values.nationalId.trim() !== '') patch.nationalId = values.nationalId.trim();

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
        <StudentFields
          values={values}
          onChange={setValues}
          showStatus
          canSeeNationalId={user?.role === 'head_teacher'}
          nationalIdPlaceholder={student.hasNationalId ? t('students.form.nationalIdOnFile') : undefined}
        />
      </div>
    </Dialog>
  );
}
