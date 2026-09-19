import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Dialog, EmptyState, SearchInput, Skeleton } from '../../ds';
import { useAuth } from '../auth';
import { useDebouncedValue } from '../../shared/react/useDebouncedValue';
import { useAssignEnrollmentMutation, useCreateStudentMutation, useListStudentsQuery } from './students.api';
import {
  StudentFields,
  emptyStudentValues,
  emptyToNull,
  isValidArabicName,
  type StudentFieldValues,
} from './StudentFields';

/** Add a student to a class — the roster's front door for both "someone
 *  returning after a year off" and "a brand-new registration".
 *
 *  Search runs institute-wide (gender-scoped to this class, so only enrollable
 *  students show), which is how a returning student is found and re-enrolled
 *  without a separate directory. "Add new" registers them, then enrols. Create +
 *  enrol are two calls (the API has no combined route); if the enrol fails after
 *  create, the new student exists un-enrolled and is found by this same search to
 *  place — surfaced as an error rather than lost. */
export function AddToClassDialog({
  sectionId,
  sectionGender,
  sectionBranchId,
  onClose,
  onDone,
}: {
  sectionId: string;
  sectionGender: 'male' | 'female';
  sectionBranchId: number | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'search' | 'create'>('search');

  return (
    <Dialog
      title={mode === 'search' ? t('sections.detail.roster.addTitle') : t('sections.detail.roster.createTitle')}
      onClose={onClose}
      width={620}
    >
      {mode === 'search' ? (
        <SearchExisting
          sectionId={sectionId}
          sectionGender={sectionGender}
          onDone={onDone}
          onCreateNew={() => setMode('create')}
        />
      ) : (
        <CreateNew
          sectionId={sectionId}
          sectionGender={sectionGender}
          sectionBranchId={sectionBranchId}
          onDone={onDone}
          onBack={() => setMode('search')}
        />
      )}
    </Dialog>
  );
}

function SearchExisting({
  sectionId,
  sectionGender,
  onDone,
  onCreateNew,
}: {
  sectionId: string;
  sectionGender: 'male' | 'female';
  onDone: (message: string) => void;
  onCreateNew: () => void;
}) {
  const { t } = useTranslation();
  const [term, setTerm] = useState('');
  const search = useDebouncedValue(term.trim(), 300);
  const results = useListStudentsQuery({ page: 1, search, gender: sectionGender }, { skip: search.length < 2 });
  const [enroll, enrollState] = useAssignEnrollmentMutation();
  const [error, setError] = useState<string | null>(null);

  async function add(studentId: string) {
    setError(null);
    try {
      await enroll({ studentId, sectionId }).unwrap();
      onDone(t('sections.detail.roster.enrolled'));
    } catch {
      setError(t('sections.detail.roster.enrollError'));
    }
  }

  const items = results.data?.items ?? [];

  return (
    <div className="grid gap-4">
      {error ? <Alert tone="danger" title={error} /> : null}
      <SearchInput
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        aria-label={t('sections.detail.roster.searchExisting')}
        placeholder={t('sections.detail.roster.searchExisting')}
      />

      {search.length < 2 ? (
        <p className="m-0 text-sm text-ink-500">{t('sections.detail.roster.searchHint')}</p>
      ) : results.isLoading ? (
        <Skeleton rows={4} height={40} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="search"
          title={t('sections.detail.roster.noMatches')}
          description={t('sections.detail.roster.searchHint')}
        />
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0">
          {items.map((student) => (
            <li key={student.id} className="flex items-center gap-3 rounded-md border border-subtle px-3 py-2 text-sm">
              <span className="flex-1">
                <span className="font-semibold text-ink-900">{student.fullName}</span>
                {student.levelName ? <span className="text-ink-400"> · {student.levelName}</span> : null}
              </span>
              <Button
                size="sm"
                variant="secondary"
                icon="plus"
                onClick={() => add(student.id)}
                loading={enrollState.isLoading}
              >
                {t('sections.detail.roster.enroll')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end border-t border-subtle pt-3">
        <Button variant="ghost" icon="plus" onClick={onCreateNew}>
          {t('sections.detail.roster.addNew')}
        </Button>
      </div>
    </div>
  );
}

function CreateNew({
  sectionId,
  sectionGender,
  sectionBranchId,
  onDone,
  onBack,
}: {
  sectionId: string;
  sectionGender: 'male' | 'female';
  sectionBranchId: number | null;
  onDone: (message: string) => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [create, createState] = useCreateStudentMutation();
  const [enroll, enrollState] = useAssignEnrollmentMutation();
  const [values, setValues] = useState<StudentFieldValues>(() => emptyStudentValues());
  const [error, setError] = useState<string | null>(null);

  const busy = createState.isLoading || enrollState.isLoading;
  const canSubmit = isValidArabicName(values.fullName) && !busy;

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    try {
      const student = await create({
        fullName: values.fullName.trim(),
        gender: sectionGender,
        branchId: sectionBranchId,
        phone: emptyToNull(values.phone),
        whatsappPhone: emptyToNull(values.whatsappPhone),
        birthDate: emptyToNull(values.birthDate),
        governorateId: values.governorateId,
        markazId: values.markazId,
        address: emptyToNull(values.address),
        nationalId: values.nationalId.trim() === '' ? undefined : values.nationalId.trim(),
        notes: emptyToNull(values.notes),
        whatsappOptIn: values.whatsappOptIn,
      }).unwrap();
      await enroll({ studentId: student.id, sectionId }).unwrap();
      onDone(t('sections.detail.roster.enrolled'));
    } catch (cause) {
      setError((cause as { detail?: string })?.detail ?? t('students.form.error'));
    }
  }

  return (
    <div className="grid gap-4">
      {error ? <Alert tone="danger" title={error} /> : null}
      <StudentFields
        values={values}
        onChange={setValues}
        showStatus={false}
        canSeeNationalId={user?.role === 'head_teacher'}
      />
      <div className="flex justify-end gap-2 border-t border-subtle pt-3">
        <Button variant="primary" icon="circle-check" onClick={submit} disabled={!canSubmit} loading={busy}>
          {t('sections.detail.roster.createSave')}
        </Button>
        <Button variant="secondary" onClick={onBack}>
          {t('sections.detail.roster.backToSearch')}
        </Button>
      </div>
    </div>
  );
}
