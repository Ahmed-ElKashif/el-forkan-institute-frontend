import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Dialog, Field, Input, Select, Textarea } from '../../ds';
import { useUpdateSessionMutation } from './sessions.api';
import type { Session } from './session.model';

const MODES = ['onsite', 'online', 'hybrid'] as const;
const STATUSES = ['scheduled', 'held', 'cancelled'] as const;
const HHMM = /(\d{2}:\d{2})/;

/** Times may arrive with seconds; the form works in HH:MM. */
function hhmm(value: string): string {
  return HHMM.exec(value)?.[1] ?? value;
}

/** Reschedule or cancel one session. Mirrors the two DDL invariants the API
 *  enforces contextually: an online/hybrid session needs a meeting link (unless
 *  cancelled), and a cancellation needs a reason. */
export function SessionEditDialog({
  session,
  onClose,
  onSaved,
}: {
  session: Session;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [update, updateState] = useUpdateSessionMutation();

  const [date, setDate] = useState(session.sessionDate);
  const [start, setStart] = useState(hhmm(session.startsAt));
  const [end, setEnd] = useState(hhmm(session.endsAt));
  const [mode, setMode] = useState(session.mode);
  const [room, setRoom] = useState(session.room ?? '');
  const [meetingUrl, setMeetingUrl] = useState(session.meetingUrl ?? '');
  const [status, setStatus] = useState(session.status);
  const [cancelReason, setCancelReason] = useState(session.cancelReason ?? '');
  const [error, setError] = useState<string | null>(null);

  const isCancelled = status === 'cancelled';
  const needsMeeting = (mode === 'online' || mode === 'hybrid') && !isCancelled;
  const needsReason = isCancelled;
  const canSubmit =
    date !== '' &&
    start !== '' &&
    end !== '' &&
    end > start &&
    (!needsMeeting || meetingUrl.trim() !== '') &&
    (!needsReason || cancelReason.trim() !== '') &&
    !updateState.isLoading;

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    try {
      await update({
        id: session.id,
        patch: {
          sessionDate: date,
          startsAt: start,
          endsAt: end,
          mode,
          room: room.trim() === '' ? null : room.trim(),
          meetingUrl: meetingUrl.trim() === '' ? null : meetingUrl.trim(),
          status,
          cancelReason: cancelReason.trim() === '' ? null : cancelReason.trim(),
        },
      }).unwrap();
      onSaved(t('sessions.form.saved'));
    } catch (cause) {
      setError((cause as { detail?: string })?.detail ?? t('sessions.form.error'));
    }
  }

  return (
    <Dialog
      title={t('sessions.form.title', { subject: session.subjectNameAr })}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="primary" icon="circle-check" onClick={submit} disabled={!canSubmit} loading={updateState.isLoading}>
            {t('sessions.form.save')}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t('sessions.form.cancel')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}

        <Field label={t('sessions.form.date')}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label={t('sessions.form.date')} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('sessions.form.start')}>
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} aria-label={t('sessions.form.start')} />
          </Field>
          <Field
            label={t('sessions.form.end')}
            error={start !== '' && end !== '' && end <= start ? t('sessions.form.endError') : undefined}
          >
            <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} invalid={end !== '' && end <= start} aria-label={t('sessions.form.end')} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('sessions.form.mode')}>
            <Select options={MODES.map((value) => ({ value, label: t(`sessions.modes.${value}`) }))} value={mode} onChange={(e) => setMode(e.target.value)} />
          </Field>
          <Field label={t('sessions.form.status')}>
            <Select options={STATUSES.map((value) => ({ value, label: t(`sessions.status.${value}`) }))} value={status} onChange={(e) => setStatus(e.target.value)} />
          </Field>
        </div>

        {needsMeeting ? (
          <Field label={t('sessions.form.meetingUrl')} required hint={t('sessions.form.meetingUrlHint')}>
            <Input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} inputMode="url" aria-label={t('sessions.form.meetingUrl')} />
          </Field>
        ) : (
          <Field label={t('sessions.form.room')}>
            <Input value={room} onChange={(e) => setRoom(e.target.value)} aria-label={t('sessions.form.room')} />
          </Field>
        )}

        {needsReason ? (
          <Field label={t('sessions.form.cancelReason')} required hint={t('sessions.form.cancelReasonHint')}>
            <Textarea rows={2} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} aria-label={t('sessions.form.cancelReason')} />
          </Field>
        ) : null}
      </div>
    </Dialog>
  );
}
