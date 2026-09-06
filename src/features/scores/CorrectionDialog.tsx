import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, Dialog, Field, ScoreInput, Textarea, formatScore } from '../../ds';
import { useCorrectScoreMutation } from './scores.api';
import type { ScoreRow } from './score.model';

const MIN_REASON = 3;

/** Correct one already-entered grade after the exam is locked (R8). Only the
 *  head teacher reaches this; the reason is mandatory because it is what
 *  `grade_changes` records for the auditor. The row always has a `resultId` —
 *  the caller only offers correction for rows that have one. */
export function CorrectionDialog({
  row,
  maxScore,
  onClose,
  onSaved,
}: {
  row: ScoreRow;
  maxScore: number;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [correct, { isLoading }] = useCorrectScoreMutation();

  const [score, setScore] = useState(row.score != null ? String(row.score) : '');
  const [isAbsent, setIsAbsent] = useState(row.isAbsent);
  const [reason, setReason] = useState('');
  const [failed, setFailed] = useState(false);

  const overMax = !isAbsent && score !== '' && Number(score) > maxScore;
  const reasonTooShort = reason.trim().length < MIN_REASON;
  const canSave = !overMax && !reasonTooShort && !isLoading;

  async function submit() {
    if (!canSave || row.resultId == null) return;
    setFailed(false);
    try {
      await correct({
        resultId: row.resultId,
        payload: {
          score: isAbsent || score === '' ? null : Number(score),
          isAbsent,
          reason: reason.trim(),
        },
      }).unwrap();
      onSaved(t('scores.correction.saved', { name: row.studentName }));
    } catch {
      setFailed(true);
    }
  }

  return (
    <Dialog
      title={t('scores.correction.title')}
      description={row.studentName}
      onClose={onClose}
      footer={
        <>
          <Button variant="primary" onClick={submit} disabled={!canSave} loading={isLoading}>
            {t('scores.correction.save')}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t('scores.correction.cancel')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field
          label={t('scores.correction.scoreLabel')}
          hint={t('scores.maxHint', { max: formatScore(maxScore) })}
          error={overMax ? t('scores.overMax', { max: formatScore(maxScore) }) : undefined}
        >
          <ScoreInput
            value={score}
            max={maxScore}
            absent={isAbsent}
            onChange={(e) => setScore(e.target.value)}
          />
        </Field>

        <Checkbox
          label={t('scores.correction.absent')}
          checked={isAbsent}
          onChange={(e) => setIsAbsent(e.target.checked)}
        />

        <Field
          label={t('scores.correction.reasonLabel')}
          required
          error={failed ? t('scores.correction.failed') : undefined}
        >
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            invalid={failed}
            placeholder={t('scores.correction.reasonPlaceholder')}
          />
        </Field>
      </div>
    </Dialog>
  );
}
