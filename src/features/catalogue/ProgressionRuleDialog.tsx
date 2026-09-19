import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Dialog, Field, Input, Switch } from '../../ds';
import { useUpsertProgressionRuleMutation, type ProgressionRule } from '../settings';

interface Props {
  yearId: number;
  /** null edits the year-wide rule that every level without its own falls back to. */
  levelId: number | null;
  levelName: string;
  rule: ProgressionRule | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/**
 * The rules §4.3 decides a student's year by — and, until now, the only inputs
 * to the promotion engine with no way to set them.
 *
 * That mattered: when neither a level's rule nor the year-wide fallback exists,
 * the engine refuses to decide and blocks every enrolment, which left a new
 * academic year unpromotable with nothing in the app to fix it.
 *
 * Every field is sent on every save. The API's schema is strict but not partial
 * and each key carries a default, so a body that omits a field silently resets
 * it — sending a "patch" here would quietly switch the makeup round back on.
 *
 * `failureCountingUnit` is not offered. It is stored and returned, but
 * `rules/promotion.ts` never reads it, so a control for it would promise
 * behaviour that does not happen.
 */
export function ProgressionRuleDialog({ yearId, levelId, levelName, rule, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const [upsert, upsertState] = useUpsertProgressionRuleMutation();

  // Seeded from the API's own defaults (§4.3: carry limit 3, makeup on,
  // carry-forward on, a مادة إلزامية never carried — R17).
  const [maxCarried, setMaxCarried] = useState(String(rule?.maxCarriedSubjects ?? 3));
  const [makeupRound, setMakeupRound] = useState(rule?.makeupRoundEnabled ?? true);
  const [carryForward, setCarryForward] = useState(rule?.carryForwardEnabled ?? true);
  const [mandatoryCarry, setMandatoryCarry] = useState(rule?.mandatoryCanBeCarried ?? false);
  const [error, setError] = useState<string | null>(null);

  const carried = Number(maxCarried);
  const carriedValid = Number.isInteger(carried) && carried >= 0 && carried <= 20;
  const canSubmit = carriedValid && !upsertState.isLoading;

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    try {
      await upsert({
        yearId,
        body: {
          levelId,
          maxCarriedSubjects: carried,
          makeupRoundEnabled: makeupRound,
          carryForwardEnabled: carryForward,
          mandatoryCanBeCarried: mandatoryCarry,
        },
      }).unwrap();
      onSaved(t('catalogue.rules.saved', { name: levelName }));
    } catch {
      setError(t('catalogue.rules.error'));
    }
  }

  return (
    <Dialog
      title={t('catalogue.rules.editTitle', { name: levelName })}
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button variant="primary" onClick={submit} disabled={!canSubmit} loading={upsertState.isLoading}>
            {t('catalogue.save')}
          </Button>
          <Button variant="secondary" onClick={onClose}>{t('catalogue.cancel')}</Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}

        <Field
          label={t('catalogue.rules.maxCarried')}
          hint={t('catalogue.rules.maxCarriedHint')}
          error={carriedValid ? undefined : t('catalogue.rules.maxCarriedInvalid')}
        >
          <Input
            type="number"
            inputMode="numeric"
            className="ef-num"
            invalid={!carriedValid}
            value={maxCarried}
            onChange={(e) => setMaxCarried(e.target.value)}
            aria-label={t('catalogue.rules.maxCarried')}
          />
        </Field>

        <Switch
          label={t('catalogue.rules.makeup')}
          checked={makeupRound}
          onChange={(e) => setMakeupRound(e.target.checked)}
        />
        <Switch
          label={t('catalogue.rules.carryForward')}
          checked={carryForward}
          onChange={(e) => setCarryForward(e.target.checked)}
        />
        <Switch
          label={t('catalogue.rules.mandatoryCarry')}
          checked={mandatoryCarry}
          onChange={(e) => setMandatoryCarry(e.target.checked)}
        />
        <p className="m-0 text-xs leading-[1.6] text-ink-500">{t('catalogue.rules.mandatoryCarryHint')}</p>
      </div>
    </Dialog>
  );
}
