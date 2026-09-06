import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Dialog, EmptyState, Field, Select, type SelectOption } from '../../ds';
import { useCurrentAcademicYearQuery } from '../../shared/api/calendar';
import { useLevelsQuery } from '../catalogue';
import { useListSectionsQuery } from '../sections';
import { useAssignEnrollmentMutation, useTransferEnrollmentMutation } from './students.api';

/** Set or correct a student's study year for the current academic year by
 *  placing them in a section of the right level (§5). Sections are scoped to the
 *  student's group (gender), so the year and the gender segregation are set
 *  together. With no `enrollmentId` this enrolls a student who arrived with no
 *  year (legacy import); with one it *transfers* an existing enrollment to fix a
 *  wrong year. */
export function AssignYearDialog({
  studentId,
  gender,
  enrollmentId,
  onClose,
  onSaved,
}: {
  studentId: string;
  gender: string;
  /** Present when correcting an existing year → transfer instead of create. */
  enrollmentId?: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useTranslation();
  const year = useCurrentAcademicYearQuery();
  const yearId = year.data?.id ?? 0;
  const sections = useListSectionsQuery(
    { academicYearId: yearId, page: 1, pageSize: 100 },
    { skip: year.data == null },
  );
  const levels = useLevelsQuery();
  const [assign, assignState] = useAssignEnrollmentMutation();
  const [transfer, transferState] = useTransferEnrollmentMutation();

  const isTransfer = enrollmentId != null;
  const busy = assignState.isLoading || transferState.isLoading;
  const [sectionId, setSectionId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const levelName = (levelId: number): string =>
    levels.data?.find((l) => l.id === levelId)?.nameAr ?? String(levelId);

  // Only the student's own group; a section carries the level, so its label is
  // "level — section" and picking it sets the study year.
  const options: SelectOption[] = (sections.data?.items ?? [])
    .filter((s) => s.gender === gender)
    .map((s) => ({ value: s.id, label: `${levelName(s.levelId)} — ${s.name}` }));

  async function submit() {
    if (sectionId === '' || busy) return;
    setError(null);
    try {
      if (isTransfer) {
        await transfer({ enrollmentId, sectionId, studentId }).unwrap();
      } else {
        await assign({ studentId, sectionId }).unwrap();
      }
      onSaved(t(isTransfer ? 'students.profile.assignYear.transferred' : 'students.profile.assignYear.saved'));
    } catch (cause) {
      setError((cause as { detail?: string })?.detail ?? t('students.profile.assignYear.error'));
    }
  }

  return (
    <Dialog
      title={t(isTransfer ? 'students.profile.assignYear.transferTitle' : 'students.profile.assignYear.title')}
      onClose={onClose}
      width={480}
      footer={
        <>
          <Button
            variant="primary"
            icon="circle-check"
            onClick={submit}
            disabled={sectionId === '' || busy}
            loading={busy}
          >
            {t('students.profile.assignYear.save')}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t('students.profile.assignYear.cancel')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}
        {year.data == null ? (
          <EmptyState icon="calendar-days" title={t('students.profile.assignYear.noYear')} />
        ) : options.length === 0 ? (
          <EmptyState icon="book-open" title={t('students.profile.assignYear.noSections')} />
        ) : (
          <Field label={t('students.profile.assignYear.section')} hint={t('students.profile.assignYear.hint')}>
            <Select
              options={options}
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              placeholder={t('students.profile.assignYear.placeholder')}
            />
          </Field>
        )}
      </div>
    </Dialog>
  );
}
