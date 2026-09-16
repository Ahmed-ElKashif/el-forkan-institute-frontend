import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Dialog,
  Field,
  IconButton,
  Input,
  Select,
  formatClassDate,
  type SelectOption,
} from '../../ds';
import { useSubjectOptionsQuery } from '../catalogue';
import { isPastDate, nextFridayIso } from './class-day-dates';
import { useCreateClassDayMutation } from './sessions.api';
import type { PeriodGenderScope } from './session.model';

const SCOPES: PeriodGenderScope[] = ['both', 'male', 'female'];

interface PeriodDraft {
  subjectId: number | '';
  startsAt: string;
  endsAt: string;
  sheikhName: string;
  genderScope: PeriodGenderScope;
}

function emptyPeriod(): PeriodDraft {
  return { subjectId: '', startsAt: '', endsAt: '', sheikhName: '', genderScope: 'both' };
}

function periodValid(period: PeriodDraft): boolean {
  return (
    period.subjectId !== '' &&
    period.startsAt !== '' &&
    period.endsAt !== '' &&
    period.endsAt > period.startsAt
  );
}

/** Create a class day, or add periods to one that already exists. Each period
 *  names its subject, times, the sheikh who teaches it, and whether it runs for
 *  both cohorts or one — the server fans a `both` period out to boys and girls so
 *  each keeps its own attendance, and merges by (section, date, time) so adding
 *  to an existing day is safe. Level-scoped, so one call schedules the whole
 *  level's day.
 *
 *  `fixedDate` switches it to "add periods to <date>" mode: the date is the
 *  day being extended and the picker is hidden. Without it the date defaults to
 *  the coming Friday but any date is allowed, so a past day can be back-filled. */
export function ClassDayDialog({
  levelId,
  academicYearId,
  fixedDate,
  onClose,
  onSaved,
}: {
  levelId: number;
  academicYearId: number;
  fixedDate?: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useTranslation();
  const subjects = useSubjectOptionsQuery();
  const [create, createState] = useCreateClassDayMutation();

  const [date, setDate] = useState(fixedDate ?? nextFridayIso());
  const [periods, setPeriods] = useState<PeriodDraft[]>([emptyPeriod()]);
  const [error, setError] = useState<string | null>(null);

  const subjectOptions: SelectOption[] = [
    { value: '', label: t('schedule.form.pickSubject') },
    ...(subjects.data ?? []).map((s) => ({ value: s.id, label: s.nameAr })),
  ];
  const scopeOptions: SelectOption[] = SCOPES.map((value) => ({
    value,
    label: t(`schedule.scope.${value}`),
  }));

  const canSubmit =
    date !== '' && periods.length > 0 && periods.every(periodValid) && !createState.isLoading;

  function patchPeriod(index: number, patch: Partial<PeriodDraft>) {
    setPeriods((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    try {
      await create({
        levelId,
        academicYearId,
        sessionDate: date,
        periods: periods.map((p, index) => ({
          subjectId: Number(p.subjectId),
          slotOrder: index + 1,
          startsAt: p.startsAt,
          endsAt: p.endsAt,
          sheikhName: p.sheikhName.trim() === '' ? null : p.sheikhName.trim(),
          genderScope: p.genderScope,
        })),
      }).unwrap();
      onSaved(t('schedule.form.saved'));
    } catch (cause) {
      setError((cause as { detail?: string })?.detail ?? t('schedule.form.error'));
    }
  }

  return (
    <Dialog
      title={fixedDate ? t('schedule.form.addToDay', { date: formatClassDate(fixedDate) }) : t('schedule.form.title')}
      onClose={onClose}
      width={680}
      footer={
        <>
          <Button variant="primary" icon="circle-check" onClick={submit} disabled={!canSubmit} loading={createState.isLoading}>
            {t('schedule.form.save')}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t('schedule.form.cancel')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}

        {fixedDate ? null : (
          <Field
            label={t('schedule.form.date')}
            hint={isPastDate(date) ? t('schedule.form.pastDateNote') : t('schedule.form.dateHint')}
          >
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label={t('schedule.form.date')} />
          </Field>
        )}

        <ul className="m-0 grid list-none gap-3 p-0">
          {periods.map((period, index) => (
            <li key={index} className="rounded-lg border border-subtle p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink-700">
                  {t('schedule.form.period', { n: index + 1 })}
                </span>
                {periods.length > 1 ? (
                  <IconButton
                    icon="trash"
                    variant="ghost"
                    label={t('schedule.form.removePeriod')}
                    onClick={() => setPeriods((prev) => prev.filter((_, i) => i !== index))}
                  />
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t('schedule.form.subject')}>
                  <Select
                    options={subjectOptions}
                    value={period.subjectId}
                    onChange={(e) => patchPeriod(index, { subjectId: e.target.value === '' ? '' : Number(e.target.value) })}
                    aria-label={t('schedule.form.subject')}
                  />
                </Field>
                <Field label={t('schedule.form.scope')}>
                  <Select
                    options={scopeOptions}
                    value={period.genderScope}
                    onChange={(e) => patchPeriod(index, { genderScope: e.target.value as PeriodGenderScope })}
                    aria-label={t('schedule.form.scope')}
                  />
                </Field>
                <Field label={t('schedule.form.start')}>
                  <Input type="time" value={period.startsAt} onChange={(e) => patchPeriod(index, { startsAt: e.target.value })} aria-label={t('schedule.form.start')} />
                </Field>
                <Field
                  label={t('schedule.form.end')}
                  error={period.startsAt !== '' && period.endsAt !== '' && period.endsAt <= period.startsAt ? t('schedule.form.endError') : undefined}
                >
                  <Input type="time" value={period.endsAt} onChange={(e) => patchPeriod(index, { endsAt: e.target.value })} invalid={period.endsAt !== '' && period.endsAt <= period.startsAt} aria-label={t('schedule.form.end')} />
                </Field>
                <Field label={t('schedule.form.sheikh')} className="sm:col-span-2">
                  <Input value={period.sheikhName} onChange={(e) => patchPeriod(index, { sheikhName: e.target.value })} aria-label={t('schedule.form.sheikh')} placeholder={t('schedule.form.sheikhPlaceholder')} />
                </Field>
              </div>
            </li>
          ))}
        </ul>

        {periods.length < 20 ? (
          <div>
            <Button variant="secondary" size="sm" icon="plus" onClick={() => setPeriods((prev) => [...prev, emptyPeriod()])}>
              {t('schedule.form.addPeriod')}
            </Button>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
