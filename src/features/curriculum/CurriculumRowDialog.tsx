import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Dialog, Field, Input, Select, Switch, type SelectOption } from '../../ds';
import type { Subject } from '../catalogue';
import { useCreateCurriculumMutation, useUpdateCurriculumMutation } from './curriculum.api';
import type {
  AssessmentType,
  CurriculumRow,
  GradingMode,
} from './curriculum.model';

const GRADING_MODES: GradingMode[] = ['score', 'pass_fail'];
const ASSESSMENT_TYPES: AssessmentType[] = ['written', 'oral', 'memorization', 'research', 'practical'];

export type RowDialogTarget =
  | { mode: 'create'; parent: CurriculumRow | null }
  | { mode: 'edit'; row: CurriculumRow };

interface Props {
  target: RowDialogTarget;
  yearId: number;
  levelId: number;
  termNumber: number;
  subjects: Subject[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** Add a مادة (top-level), add a فرع under one, or edit a row. On edit the
 *  subject and term are the row's identity and shown read-only. The exam fields
 *  (grading, marks, weight) appear only while the row is examinable — a
 *  container's marks live on its children. */
export function CurriculumRowDialog({ target, yearId, levelId, termNumber, subjects, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const isEdit = target.mode === 'edit';
  const row = target.mode === 'edit' ? target.row : null;
  const parent = target.mode === 'create' ? target.parent : null;

  const [create, createState] = useCreateCurriculumMutation();
  const [update, updateState] = useUpdateCurriculumMutation();

  const [subjectId, setSubjectId] = useState<number | null>(row?.subjectId ?? null);
  const [isExaminable, setIsExaminable] = useState(row?.isExaminable ?? true);
  const [isMandatory, setIsMandatory] = useState(row?.isMandatory ?? false);
  const [gradingMode, setGradingMode] = useState<GradingMode>(row?.gradingMode ?? 'score');
  const [assessmentType, setAssessmentType] = useState<AssessmentType>(row?.assessmentType ?? 'written');
  const [maxScore, setMaxScore] = useState(String(row?.maxScore ?? 100));
  const [passScore, setPassScore] = useState(String(row?.passScore ?? 50));
  const [weight, setWeight] = useState(String(row?.weight ?? 1));
  const [teachingOrder, setTeachingOrder] = useState(row?.teachingOrder != null ? String(row.teachingOrder) : '');
  const [error, setError] = useState<string | null>(null);

  const busy = createState.isLoading || updateState.isLoading;
  const max = Number(maxScore);
  const pass = Number(passScore);
  const passOverMax = isExaminable && pass > max;
  const canSubmit = (isEdit || subjectId != null) && Number(weight) > 0 && !passOverMax && !busy;

  const subjectOptions: SelectOption[] = subjects.map((s) => ({ value: s.id, label: s.nameAr }));
  const subjectName = row?.subjectNameAr ?? subjects.find((s) => s.id === subjectId)?.nameAr ?? '';

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    const shared = {
      isExaminable,
      isMandatory,
      gradingMode,
      assessmentType,
      maxScore: max,
      passScore: pass,
      weight: Number(weight),
      teachingOrder: teachingOrder.trim() === '' ? null : Number(teachingOrder),
    };
    try {
      if (target.mode === 'edit') {
        await update({ id: target.row.id, patch: shared }).unwrap();
      } else {
        await create({
          yearId,
          levelId,
          body: { subjectId: subjectId as number, termNumber, parentCurriculumId: target.parent?.id ?? null, ...shared },
        }).unwrap();
      }
      onSaved(t(isEdit ? 'curriculum.form.saved' : 'curriculum.form.created', { name: subjectName }));
    } catch {
      setError(t('curriculum.saveError'));
    }
  }

  const title = isEdit
    ? t('curriculum.form.editTitle')
    : parent
      ? t('curriculum.form.addChildTitle', { parent: parent.subjectNameAr })
      : t('curriculum.form.addTitle');

  return (
    <Dialog
      title={title}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="primary" onClick={submit} disabled={!canSubmit} loading={busy}>
            {t('curriculum.save')}
          </Button>
          <Button variant="secondary" onClick={onClose}>{t('curriculum.cancel')}</Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}

        <Field label={t('curriculum.form.subject')} required={!isEdit}>
          {isEdit ? (
            <Input value={subjectName} readOnly aria-label={t('curriculum.form.subject')} />
          ) : (
            <Select
              options={subjectOptions}
              placeholder={t('curriculum.form.subjectPlaceholder')}
              value={subjectId ?? ''}
              onChange={(e) => setSubjectId(e.target.value === '' ? null : Number(e.target.value))}
              aria-label={t('curriculum.form.subject')}
            />
          )}
        </Field>

        <div className="flex flex-wrap gap-6">
          <Switch label={t('curriculum.form.mandatory')} checked={isMandatory} onChange={(e) => setIsMandatory(e.target.checked)} />
          <Switch label={t('curriculum.form.examinable')} checked={isExaminable} onChange={(e) => setIsExaminable(e.target.checked)} />
        </div>
        {!isExaminable ? (
          <p className="m-0 text-xs leading-[1.6] text-ink-500">{t('curriculum.form.containerHint')}</p>
        ) : null}

        {isExaminable ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('curriculum.form.gradingMode')}>
                <Select
                  options={GRADING_MODES.map((m) => ({ value: m, label: t(`curriculum.gradingModes.${m}`) }))}
                  value={gradingMode}
                  onChange={(e) => setGradingMode(e.target.value as GradingMode)}
                  aria-label={t('curriculum.form.gradingMode')}
                />
              </Field>
              <Field label={t('curriculum.form.assessmentType')}>
                <Select
                  options={ASSESSMENT_TYPES.map((a) => ({ value: a, label: t(`curriculum.assessmentTypes.${a}`) }))}
                  value={assessmentType}
                  onChange={(e) => setAssessmentType(e.target.value as AssessmentType)}
                  aria-label={t('curriculum.form.assessmentType')}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label={t('curriculum.form.maxScore')}>
                <Input type="number" inputMode="decimal" className="ef-num" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} aria-label={t('curriculum.form.maxScore')} />
              </Field>
              <Field label={t('curriculum.form.passScore')} error={passOverMax ? t('curriculum.form.passOverMax') : undefined}>
                <Input type="number" inputMode="decimal" invalid={passOverMax} className="ef-num" value={passScore} onChange={(e) => setPassScore(e.target.value)} aria-label={t('curriculum.form.passScore')} />
              </Field>
              <Field label={t('curriculum.form.weight')}>
                <Input type="number" inputMode="decimal" className="ef-num" value={weight} onChange={(e) => setWeight(e.target.value)} aria-label={t('curriculum.form.weight')} />
              </Field>
            </div>
          </>
        ) : null}

        <Field label={t('curriculum.form.teachingOrder')} hint={t('curriculum.form.teachingOrderHint')}>
          <Input type="number" inputMode="numeric" className="ef-num" value={teachingOrder} onChange={(e) => setTeachingOrder(e.target.value)} aria-label={t('curriculum.form.teachingOrder')} />
        </Field>
      </div>
    </Dialog>
  );
}
