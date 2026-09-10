import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Dialog, Field, Select, Textarea, type SelectOption } from '../../ds';
import { useOverridePromotionMutation } from './promotion.api';
import type { PromotionDecision, PromotionRow } from './promotion.model';

/* The five verdicts §4.3 can reach. `withdrawn` is deliberately absent: it is an
   enrolment status, not a promotion outcome, and offering it here would let a
   run mark a student withdrawn without anyone withdrawing them. */
const DECISIONS: PromotionDecision[] = [
  'promote',
  'promote_with_carry',
  'repeat',
  'makeup_required',
  'graduate',
];

/** Records a human disagreeing with the promotion engine (§4.3).
 *
 *  Modelled on `EligibilityOverrideDialog`, and for the same reason: a reason of
 *  at least three characters gates the save, because the reason is what the
 *  audit log records and what an auditor reads a year later.
 *
 *  The engine's verdict is shown, not hidden — the head teacher is disagreeing
 *  with something specific, and the screen should say what. */
export function PromotionDecisionDialog({
  row,
  afterMakeup,
  onClose,
  onSaved,
}: {
  row: PromotionRow;
  afterMakeup: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [override, state] = useOverridePromotionMutation();

  const [decision, setDecision] = useState<PromotionDecision>(row.decision);
  const [reason, setReason] = useState(row.override?.reason ?? '');
  const [error, setError] = useState<string | null>(null);

  const reasonValid = reason.trim().length >= 3;
  const canSubmit = reasonValid && !state.isLoading;

  const options: SelectOption[] = DECISIONS.map((value) => ({
    value,
    label: t(`promotion.decision.${value}`),
  }));

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    try {
      await override({
        enrollmentId: row.enrollmentId,
        decision,
        afterMakeup,
        reason: reason.trim(),
      }).unwrap();
      onSaved(t('promotion.override.saved'));
    } catch (cause) {
      setError((cause as { detail?: string })?.detail ?? t('promotion.override.error'));
    }
  }

  return (
    <Dialog
      title={t('promotion.override.title')}
      description={row.studentName}
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button
            variant="primary"
            icon="circle-check"
            onClick={submit}
            disabled={!canSubmit}
            loading={state.isLoading}
          >
            {t('promotion.override.save')}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t('promotion.override.cancel')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}

        <Alert tone="info" title={t('promotion.override.computed')}>
          {t(`promotion.decision.${row.computedDecision}`)}
        </Alert>

        <Field label={t('promotion.override.decision')} required>
          <Select
            options={options}
            value={decision}
            onChange={(e) => setDecision(e.target.value as PromotionDecision)}
          />
        </Field>

        <Field
          label={t('promotion.override.reason')}
          required
          hint={t('promotion.override.reasonHint')}
        >
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('promotion.override.reasonPlaceholder')}
            aria-label={t('promotion.override.reason')}
          />
        </Field>
      </div>
    </Dialog>
  );
}
