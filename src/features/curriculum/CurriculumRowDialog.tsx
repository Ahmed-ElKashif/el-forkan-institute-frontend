import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Dialog, Field, Input, Select, Switch, type SelectOption } from '../../ds';
/* A direct file import, not the `../catalogue` barrel: that barrel's
   `CataloguePage` renders this dialog's page, and going through it would make the
   two features a cycle. */
import { SubjectFormDialog } from '../catalogue/SubjectFormDialog';
import type { Subject } from '../catalogue';
import { useCreateCurriculumMutation, useUpdateCurriculumMutation } from './curriculum.api';
import { refusalKey } from './refusal';
import type { AssessmentType, CurriculumRow, GradingMode } from './curriculum.model';

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

/**
 * Add a مادة, add a فرع under one, or edit a row.
 *
 * A مادة has an exam — that is what a مادة is here — so the form does not ask.
 * Being a container is not a property the head teacher sets either; it is the
 * consequence of splitting a مادة into فروع, and the split flow sets it. What is
 * left is what an institute actually decides: which subject, whether it is
 * إلزامية, and its two marks.
 *
 * Everything else the row can carry — الوزن, نمط الدرجات, أسلوب التقويم,
 * ترتيب التدريس — is real but rarely touched, so it sits behind خيارات متقدمة
 * rather than in the way. A container's exam fields are not sent at all: the
 * exam, the mark and the weight belong to its فروع, and posting them anyway was
 * how a container ended up carrying marks nobody could see.
 *
 * «مادة جديدة» opens the registry's own subject form, then selects what it
 * created. The picker used to be a dead end: a subject the institute had not
 * registered yet could only be added from another screen, so planning a term
 * meant leaving the plan and coming back.
 */
export function CurriculumRowDialog({ target, yearId, levelId, termNumber, subjects, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const isEdit = target.mode === 'edit';
  const row = target.mode === 'edit' ? target.row : null;
  const parent = target.mode === 'create' ? target.parent : null;
  /* A container is a row that was split. It keeps its container-ness through an
     edit; only the split flow and the server decide otherwise. */
  const isContainer = row != null && !row.isExaminable;

  const [create, createState] = useCreateCurriculumMutation();
  const [update, updateState] = useUpdateCurriculumMutation();

  const [subjectId, setSubjectId] = useState<number | null>(row?.subjectId ?? null);
  const [isMandatory, setIsMandatory] = useState(row?.isMandatory ?? false);
  const [gradingMode, setGradingMode] = useState<GradingMode>(row?.gradingMode ?? 'score');
  const [assessmentType, setAssessmentType] = useState<AssessmentType>(row?.assessmentType ?? 'written');
  const [maxScore, setMaxScore] = useState(String(row?.maxScore ?? 100));
  const [passScore, setPassScore] = useState(String(row?.passScore ?? 50));
  const [weight, setWeight] = useState(String(row?.weight ?? 1));
  const [teachingOrder, setTeachingOrder] = useState(row?.teachingOrder != null ? String(row.teachingOrder) : '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = createState.isLoading || updateState.isLoading;
  const max = Number(maxScore);
  const pass = Number(passScore);
  /* A pass/fail مادة has no marks to compare, so the rule simply does not apply. */
  const scored = !isContainer && gradingMode === 'score';
  const passOverMax = scored && pass > max;
  const canSubmit = (isEdit || subjectId != null) && !passOverMax && !busy;

  /* A subject created from here is held locally too: the list refetches on the
     `Catalogue` tag, and until it lands the Select would have a value with no
     matching option and render blank. */
  const [justCreated, setJustCreated] = useState<Subject | null>(null);
  const known =
    justCreated && !subjects.some((s) => s.id === justCreated.id) ? [...subjects, justCreated] : subjects;

  const subjectOptions: SelectOption[] = known
    .filter((subject) => subject.isActive || subject.id === row?.subjectId)
    .map((subject) => ({ value: subject.id, label: subject.nameAr }));
  const subjectName = row?.subjectNameAr ?? known.find((s) => s.id === subjectId)?.nameAr ?? '';

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    const shared = {
      isMandatory,
      teachingOrder: teachingOrder.trim() === '' ? null : Number(teachingOrder),
      // A container's marks belong to its فروع; sending them would store numbers
      // no exam will ever read.
      ...(isContainer
        ? { isExaminable: false }
        : {
            isExaminable: true,
            gradingMode,
            assessmentType,
            maxScore: max,
            passScore: pass,
            weight: Number(weight) > 0 ? Number(weight) : 1,
          }),
    };
    try {
      if (target.mode === 'edit') {
        await update({ id: target.row.id, patch: shared }).unwrap();
      } else {
        await create({
          yearId,
          levelId,
          body: {
            subjectId: subjectId as number,
            termNumber,
            parentCurriculumId: target.parent?.id ?? null,
            ...shared,
          },
        }).unwrap();
      }
      onSaved(t(isEdit ? 'curriculum.form.saved' : 'curriculum.form.created', { name: subjectName }));
    } catch (cause) {
      // The server explains its refusals (depth, containers, فروع); say which.
      setError(t(refusalKey(cause)));
    }
  }

  const title = isEdit
    ? t('curriculum.form.editTitle')
    : parent
      ? t('curriculum.form.addChildTitle', { parent: parent.subjectNameAr })
      : t('curriculum.form.addTitle');

  /* Shown *instead of* this form, not inside it. Two open `Dialog`s each add an
     Escape listener on `document`, so one Escape would close both and lose the
     row being filled in; and the outer panel is `overflow-hidden`, which clips a
     nested one while its open animation holds a transform. Returning early keeps
     this component mounted, so every field already filled in is still here when
     the subject form closes. */
  if (creatingSubject) {
    return (
      <SubjectFormDialog
        subject={null}
        onClose={() => setCreatingSubject(false)}
        onSaved={(_message, saved) => {
          setCreatingSubject(false);
          setJustCreated(saved);
          setSubjectId(saved.id);
        }}
      />
    );
  }

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
            <div className="flex gap-2">
              <Select
                className="flex-1"
                options={subjectOptions}
                placeholder={t('curriculum.form.subjectPlaceholder')}
                value={subjectId ?? ''}
                onChange={(e) => setSubjectId(e.target.value === '' ? null : Number(e.target.value))}
                aria-label={t('curriculum.form.subject')}
              />
              <Button variant="secondary" icon="plus" onClick={() => setCreatingSubject(true)}>
                {t('catalogue.subjects.create')}
              </Button>
            </div>
          )}
        </Field>

        <Switch
          label={t('curriculum.form.mandatory')}
          checked={isMandatory}
          onChange={(e) => setIsMandatory(e.target.checked)}
        />

        {isContainer ? (
          <p className="m-0 text-xs leading-[1.6] text-ink-500">{t('curriculum.form.containerHint')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('curriculum.form.maxScore')}>
              <Input
                type="number"
                inputMode="decimal"
                className="ef-num"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                aria-label={t('curriculum.form.maxScore')}
              />
            </Field>
            <Field
              label={t('curriculum.form.passScore')}
              error={passOverMax ? t('curriculum.form.passOverMax') : undefined}
            >
              <Input
                type="number"
                inputMode="decimal"
                invalid={passOverMax}
                className="ef-num"
                value={passScore}
                onChange={(e) => setPassScore(e.target.value)}
                aria-label={t('curriculum.form.passScore')}
              />
            </Field>
          </div>
        )}

        <div>
          <Button variant="ghost" size="sm" onClick={() => setShowAdvanced((open) => !open)}>
            {t('curriculum.advanced')}
          </Button>
        </div>

        {showAdvanced ? (
          <div className="grid gap-4 rounded-md bg-canvas p-3">
            {!isContainer ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                <Field label={t('curriculum.form.weight')}>
                  <Input
                    type="number"
                    inputMode="decimal"
                    className="ef-num"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    aria-label={t('curriculum.form.weight')}
                  />
                </Field>
              </div>
            ) : null}
            <Field label={t('curriculum.form.teachingOrder')} hint={t('curriculum.form.teachingOrderHint')}>
              <Input
                type="number"
                inputMode="numeric"
                className="ef-num"
                value={teachingOrder}
                onChange={(e) => setTeachingOrder(e.target.value)}
                aria-label={t('curriculum.form.teachingOrder')}
              />
            </Field>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
