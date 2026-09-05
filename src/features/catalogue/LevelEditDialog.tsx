import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Dialog, Switch } from '../../ds';
import { useUpdateLevelMutation } from './catalogue.api';
import type { Level, LevelFlags } from './catalogue.model';

const FLAG_KEYS = ['isOptional', 'isTerminal', 'allowsCarry', 'grantsCertificate', 'requiresCleanEntry'] as const;

/** Edit a level's progression flags (R1/R15/R20). Levels themselves are fixed
 *  rows — only these booleans change. */
export function LevelEditDialog({ level, onClose, onSaved }: { level: Level; onClose: () => void; onSaved: (message: string) => void }) {
  const { t } = useTranslation();
  const [update, { isLoading }] = useUpdateLevelMutation();
  const [flags, setFlags] = useState<LevelFlags>({
    isOptional: level.isOptional,
    isTerminal: level.isTerminal,
    allowsCarry: level.allowsCarry,
    grantsCertificate: level.grantsCertificate,
    requiresCleanEntry: level.requiresCleanEntry,
  });
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      await update({ id: level.id, flags }).unwrap();
      onSaved(t('catalogue.levels.saved', { name: level.nameAr }));
    } catch {
      setError(t('catalogue.saveError'));
    }
  }

  return (
    <Dialog
      title={t('catalogue.levels.editTitle', { name: level.nameAr })}
      onClose={onClose}
      width={460}
      footer={
        <>
          <Button variant="primary" onClick={submit} loading={isLoading} disabled={isLoading}>
            {t('catalogue.save')}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t('catalogue.cancel')}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        {error ? <Alert tone="danger" title={error} /> : null}
        {FLAG_KEYS.map((key) => (
          <Switch
            key={key}
            label={t(`catalogue.levels.flags.${key}`)}
            checked={flags[key]}
            onChange={(e) => setFlags((prev) => ({ ...prev, [key]: e.target.checked }))}
          />
        ))}
      </div>
    </Dialog>
  );
}
