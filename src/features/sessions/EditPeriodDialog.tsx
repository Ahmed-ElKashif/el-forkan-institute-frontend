import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Dialog, Field, Input, Select, type SelectOption } from '../../ds';
import { useSubjectOptionsQuery } from '../catalogue';
import { useUpdateSessionMutation } from './sessions.api';
import type { Session } from './session.model';

const HHMM = /(\d{2}:\d{2})/;
function hhmm(value: string): string {
  return HHMM.exec(value)?.[1] ?? value;
}

/** Edit one period of an upcoming class day: its subject, times, and sheikh.
 *  Only reachable for a day that has not passed. Gender scope is fixed at
 *  creation (it decides which cohorts hold the period), so it is not edited here;
 *  this edits the single displayed cohort's session. */
export function EditPeriodDialog({
  session,
  onClose,
  onSaved,
}: {
  session: Session;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useTranslation();
  const subjects = useSubjectOptionsQuery();
  const [update, updateState] = useUpdateSessionMutation();

  const [subjectId, setSubjectId] = useState<number>(session.subjectId);
  const [start, setStart] = useState(hhmm(session.startsAt));
  const [end, setEnd] = useState(hhmm(session.endsAt));
  const [sheikhName, setSheikhName] = useState(session.sheikhName ?? '');
  const [error, setError] = useState<string | null>(null);

  const subjectOptions: SelectOption[] = (subjects.data ?? []).map((s) => ({ value: s.id, label: s.nameAr }));
  const canSubmit = start !== '' && end !== '' && end > start && !updateState.isLoading;

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    try {
      await update({
        id: session.id,
        patch: {
          subjectId,
          startsAt: start,
          endsAt: end,
          sheikhName: sheikhName.trim() === '' ? null : sheikhName.trim(),
        },
      }).unwrap();
      onSaved(t('schedule.editSaved'));
    } catch (cause) {
      setError((cause as { detail?: string })?.detail ?? t('schedule.editError'));
    }
  }

  return (
    <Dialog
      title={t('schedule.edit.title')}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="primary" icon="circle-check" onClick={submit} disabled={!canSubmit} loading={updateState.isLoading}>
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

        <Field label={t('schedule.form.subject')}>
          <Select options={subjectOptions} value={subjectId} onChange={(e) => setSubjectId(Number(e.target.value))} aria-label={t('schedule.form.subject')} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('schedule.form.start')}>
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} aria-label={t('schedule.form.start')} />
          </Field>
          <Field label={t('schedule.form.end')} error={start !== '' && end !== '' && end <= start ? t('schedule.form.endError') : undefined}>
            <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} invalid={end !== '' && end <= start} aria-label={t('schedule.form.end')} />
          </Field>
        </div>

        <Field label={t('schedule.form.sheikh')}>
          <Input value={sheikhName} onChange={(e) => setSheikhName(e.target.value)} aria-label={t('schedule.form.sheikh')} placeholder={t('schedule.form.sheikhPlaceholder')} />
        </Field>
      </div>
    </Dialog>
  );
}
