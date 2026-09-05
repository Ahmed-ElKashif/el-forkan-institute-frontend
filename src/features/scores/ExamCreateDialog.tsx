import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Dialog,
  Field,
  Input,
  Select,
  type SelectOption,
} from '../../ds';
import { useCurriculumTreeQuery, type CurriculumTreeNode } from '../curriculum';
import { useCreateExamMutation } from './scores.api';

const EXAM_TYPES = ['term_1', 'term_2', 'makeup', 'placement'] as const;
const GENDER_OPTIONS = ['', 'male', 'female'] as const;

/** Examinable rows only — an exam points at one (§4.2). A مادة with فروع is a
 *  container; the exam belongs to the examinable فرع, so children win. */
function examinableRows(tree: CurriculumTreeNode[]): { id: number; subjectNameAr: string }[] {
  const out: { id: number; subjectNameAr: string }[] = [];
  for (const node of tree) {
    if (node.children.length > 0) {
      for (const child of node.children) {
        if (child.isExaminable) out.push({ id: child.id, subjectNameAr: child.subjectNameAr });
      }
    } else if (node.isExaminable) {
      out.push({ id: node.id, subjectNameAr: node.subjectNameAr });
    }
  }
  return out;
}

/** Create & schedule an exam for a section's level and term (§3, both roles).
 *  Max/pass are inherited from the chosen curriculum row, so they are not asked
 *  for here. Section context (branch, level, gender, year) comes from the picker
 *  the dialog opens over. */
export function ExamCreateDialog({
  branchId,
  levelId,
  academicYearId,
  sectionGender,
  termId,
  termNumber,
  onClose,
  onSaved,
}: {
  branchId: number;
  levelId: number;
  academicYearId: number;
  sectionGender: string;
  termId: number;
  termNumber: number;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [create, createState] = useCreateExamMutation();
  const curriculum = useCurriculumTreeQuery({ yearId: academicYearId, levelId, termNumber });

  const subjects = examinableRows(curriculum.data ?? []);

  const [curriculumId, setCurriculumId] = useState<number | null>(null);
  const [examType, setExamType] = useState(termNumber === 1 ? 'term_1' : 'term_2');
  const [gender, setGender] = useState<string>(sectionGender);
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [venue, setVenue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = curriculumId != null && !createState.isLoading;

  async function submit() {
    if (!canSubmit || curriculumId == null) return;
    setError(null);
    try {
      await create({
        branchId,
        termId,
        curriculumId,
        gender: gender === '' ? null : (gender as 'male' | 'female'),
        examType,
        // datetime-local has no zone; toISOString stamps the required offset.
        scheduledAt: scheduledAt === '' ? null : new Date(scheduledAt).toISOString(),
        durationMin: durationMin === '' ? null : Number(durationMin),
        venue: venue.trim() === '' ? null : venue.trim(),
      }).unwrap();
      onSaved(t('scores.create.saved'));
    } catch (cause) {
      setError((cause as { detail?: string })?.detail ?? t('scores.create.error'));
    }
  }

  const subjectOptions: SelectOption[] = subjects.map((s) => ({ value: s.id, label: s.subjectNameAr }));

  return (
    <Dialog
      title={t('scores.create.title')}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="primary" icon="plus" onClick={submit} disabled={!canSubmit} loading={createState.isLoading}>
            {t('scores.create.save')}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t('scores.create.cancel')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}

        <Field
          label={t('scores.create.subject')}
          required
          hint={curriculum.isLoading ? t('scores.create.loadingSubjects') : subjects.length === 0 ? t('scores.create.noSubjects') : undefined}
        >
          <Select
            options={subjectOptions}
            value={curriculumId ?? ''}
            onChange={(e) => setCurriculumId(e.target.value ? Number(e.target.value) : null)}
            placeholder={t('scores.create.subjectPlaceholder')}
            disabled={subjects.length === 0}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('scores.create.type')}>
            <Select
              options={EXAM_TYPES.map((value) => ({ value, label: t(`scores.examType.${value}`) }))}
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
            />
          </Field>
          <Field label={t('scores.create.gender')} hint={t('scores.create.genderHint')}>
            <Select
              options={GENDER_OPTIONS.map((value) => ({
                value,
                label: value === '' ? t('scores.create.genderShared') : t(`students.gender.${value}`),
              }))}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            />
          </Field>
        </div>

        <Field label={t('scores.create.scheduledAt')}>
          <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} aria-label={t('scores.create.scheduledAt')} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('scores.create.duration')} hint={t('scores.create.durationHint')}>
            <Input type="number" min={5} max={600} numeric value={durationMin} onChange={(e) => setDurationMin(e.target.value)} aria-label={t('scores.create.duration')} />
          </Field>
          <Field label={t('scores.create.venue')}>
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} aria-label={t('scores.create.venue')} />
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
