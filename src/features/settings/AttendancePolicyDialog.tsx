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
  type SelectOption,
} from '../../ds';
import type { Level } from '../catalogue';
import { useUpsertAttendancePolicyMutation } from './settings.api';
import type { AttendancePolicy, ExceedingAction } from './settings.model';

const EXCEEDING_ACTIONS: ExceedingAction[] = ['warn_only', 'block_exam'];

/** Set or edit an absence policy for a year — the default (all levels) or a
 *  per-level override. `maxAbsences` + a `block_exam` action is what makes a
 *  student ineligible on the eligibility screen. Level is fixed when editing
 *  (the upsert is keyed by year+level); new policies pick an uncovered level. */
export function AttendancePolicyDialog({
  yearId,
  policy,
  levels,
  coveredLevelIds,
  hasDefault,
  onClose,
  onSaved,
}: {
  yearId: number;
  /** null = create a new policy. */
  policy: AttendancePolicy | null;
  levels: Level[];
  /** level ids that already have a policy this year (excluded when adding). */
  coveredLevelIds: number[];
  /** whether the year-wide default already exists (excluded when adding). */
  hasDefault: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useTranslation();
  const isEdit = policy != null;
  const [upsert, upsertState] = useUpsertAttendancePolicyMutation();

  const [levelId, setLevelId] = useState<number | null>(policy?.levelId ?? null);
  const [maxAbsences, setMaxAbsences] = useState(String(policy?.maxAbsences ?? 4));
  const [warnAtAbsences, setWarnAtAbsences] = useState(String(policy?.warnAtAbsences ?? 3));
  const [autoWarnEnabled, setAutoWarnEnabled] = useState(policy?.autoWarnEnabled ?? true);
  const [exceedingAction, setExceedingAction] = useState<ExceedingAction>(
    (policy?.exceedingAction as ExceedingAction | undefined) ?? 'warn_only',
  );
  const [error, setError] = useState<string | null>(null);

  const max = Number(maxAbsences);
  const warn = Number(warnAtAbsences);
  // Mirrors the API's refine + column bounds for instant feedback.
  const boundsValid = Number.isInteger(max) && max >= 1 && max <= 60 && Number.isInteger(warn) && warn >= 1;
  const orderValid = warn < max;
  const canSubmit = boundsValid && orderValid && !upsertState.isLoading;

  // When adding: the default (if free) plus every level without its own policy.
  const levelOptions: SelectOption[] = [
    ...(hasDefault ? [] : [{ value: '', label: t('settings.attendance.defaultLevel') }]),
    ...levels
      .filter((level) => !coveredLevelIds.includes(level.id))
      .map((level) => ({ value: level.id, label: level.nameAr })),
  ];

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    try {
      await upsert({
        yearId,
        body: { levelId, maxAbsences: max, warnAtAbsences: warn, autoWarnEnabled, exceedingAction },
      }).unwrap();
      onSaved(t('settings.attendance.saved'));
    } catch (cause) {
      setError((cause as { detail?: string })?.detail ?? t('settings.attendance.error'));
    }
  }

  const levelLabel = isEdit
    ? policy.levelId == null
      ? t('settings.attendance.defaultLevel')
      : (levels.find((l) => l.id === policy.levelId)?.nameAr ?? String(policy.levelId))
    : null;

  return (
    <Dialog
      title={t(isEdit ? 'settings.attendance.editTitle' : 'settings.attendance.addTitle')}
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button variant="primary" icon="circle-check" onClick={submit} disabled={!canSubmit} loading={upsertState.isLoading}>
            {t('settings.attendance.save')}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t('settings.attendance.cancel')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}

        <Field label={t('settings.attendance.level')}>
          {isEdit ? (
            <Input value={levelLabel ?? ''} readOnly aria-label={t('settings.attendance.level')} />
          ) : (
            <Select
              options={levelOptions}
              value={levelId ?? ''}
              onChange={(e) => setLevelId(e.target.value ? Number(e.target.value) : null)}
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t('settings.attendance.maxAbsences')}
            hint={t('settings.attendance.maxAbsencesHint')}
            error={!boundsValid && maxAbsences !== '' ? t('settings.attendance.boundsError') : undefined}
          >
            <Input
              type="number"
              min={1}
              max={60}
              numeric
              value={maxAbsences}
              onChange={(e) => setMaxAbsences(e.target.value)}
              aria-label={t('settings.attendance.maxAbsences')}
            />
          </Field>
          <Field
            label={t('settings.attendance.warnAt')}
            hint={t('settings.attendance.warnAtHint')}
            error={boundsValid && !orderValid ? t('settings.attendance.orderError') : undefined}
          >
            <Input
              type="number"
              min={1}
              max={60}
              numeric
              invalid={boundsValid && !orderValid}
              value={warnAtAbsences}
              onChange={(e) => setWarnAtAbsences(e.target.value)}
              aria-label={t('settings.attendance.warnAt')}
            />
          </Field>
        </div>

        <Field label={t('settings.attendance.action')} hint={t('settings.attendance.actionHint')}>
          <Select
            options={EXCEEDING_ACTIONS.map((value) => ({ value, label: t(`settings.attendance.actions.${value}`) }))}
            value={exceedingAction}
            onChange={(e) => setExceedingAction(e.target.value as ExceedingAction)}
          />
        </Field>

        <Checkbox
          label={t('settings.attendance.autoWarn')}
          checked={autoWarnEnabled}
          onChange={(e) => setAutoWarnEnabled(e.target.checked)}
        />
      </div>
    </Dialog>
  );
}
