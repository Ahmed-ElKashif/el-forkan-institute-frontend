import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Dialog, Field, Input, Select, Textarea } from '../../ds';
import { useOverrideEligibilityMutation } from './eligibility.api';
import type { EligibilityRow } from './eligibility.model';

/** Head-teacher override of one eligibility verdict (§4.6). The reason is
 *  mandatory — it is what the audit log records — and the verdict defaults to
 *  the opposite of the engine's, since flipping it is the reason to open this. */
export function EligibilityOverrideDialog({
  examId,
  row,
  onClose,
  onSaved,
}: {
  examId: string;
  row: EligibilityRow;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [override, overrideState] = useOverrideEligibilityMutation();

  const [isEligible, setIsEligible] = useState(!row.isEligible);
  const [reasonNote, setReasonNote] = useState(row.reasonNote ?? '');
  const [seatNo, setSeatNo] = useState(row.seatNo ?? '');
  const [error, setError] = useState<string | null>(null);

  const reasonValid = reasonNote.trim().length >= 3;
  const canSubmit = reasonValid && !overrideState.isLoading;

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    try {
      await override({
        examId,
        id: row.id,
        isEligible,
        reasonNote: reasonNote.trim(),
        seatNo: seatNo.trim() === '' ? null : seatNo.trim(),
      }).unwrap();
      onSaved(t('eligibility.override.saved'));
    } catch (cause) {
      setError((cause as { detail?: string })?.detail ?? t('eligibility.override.error'));
    }
  }

  return (
    <Dialog
      title={t('eligibility.override.title', { name: row.studentName })}
      onClose={onClose}
      width={480}
      footer={
        <>
          <Button variant="primary" icon="circle-check" onClick={submit} disabled={!canSubmit} loading={overrideState.isLoading}>
            {t('eligibility.override.save')}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t('eligibility.override.cancel')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}

        <Field label={t('eligibility.override.verdict')}>
          <Select
            options={[
              { value: 'true', label: t('eligibility.eligible') },
              { value: 'false', label: t('eligibility.ineligible') },
            ]}
            value={String(isEligible)}
            onChange={(e) => setIsEligible(e.target.value === 'true')}
          />
        </Field>

        <Field
          label={t('eligibility.override.reason')}
          required
          hint={t('eligibility.override.reasonHint')}
        >
          <Textarea
            rows={3}
            value={reasonNote}
            onChange={(e) => setReasonNote(e.target.value)}
            aria-label={t('eligibility.override.reason')}
          />
        </Field>

        <Field label={t('eligibility.override.seat')} hint={t('eligibility.override.seatHint')}>
          <Input value={seatNo} onChange={(e) => setSeatNo(e.target.value)} aria-label={t('eligibility.override.seat')} />
        </Field>
      </div>
    </Dialog>
  );
}
