import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Dialog, Field, Input, Select } from '../../ds';
import { useFixImportRowMutation } from './import.api';
import type { FixRowPatch, ImportRow } from './import.model';

const ACTIONS = ['create', 'update', 'skip'] as const;

/** Correct one preview row before commit (§6.3): fix the name or phone the
 *  parser flagged, or force the row's action (e.g. skip a row that cannot be
 *  resolved). The API re-validates on save, so the row's status changes to match
 *  the correction. */
export function FixRowDialog({
  row,
  onClose,
  onSaved,
}: {
  row: ImportRow;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [fix, { isLoading }] = useFixImportRowMutation();

  const fields = row.parsed ?? row.raw;
  const [fullName, setFullName] = useState(fields.fullName ?? '');
  const [phone, setPhone] = useState(fields.phone ?? '');
  // Empty = leave the action for the API to re-decide from the corrected data.
  const [action, setAction] = useState('');
  const [failed, setFailed] = useState(false);

  async function submit() {
    setFailed(false);
    const patch: FixRowPatch = { phone: phone.trim() === '' ? null : phone.trim() };
    if (fullName.trim() !== '') patch.fullName = fullName.trim();
    if (action !== '') patch.action = action as FixRowPatch['action'];
    try {
      await fix({ rowId: row.id, patch }).unwrap();
      onSaved(t('import.fix.saved', { row: row.rowNumber }));
    } catch {
      setFailed(true);
    }
  }

  return (
    <Dialog
      title={t('import.fix.title', { row: row.rowNumber })}
      description={row.errorMessage ?? undefined}
      onClose={onClose}
      footer={
        <>
          <Button variant="primary" onClick={submit} loading={isLoading} disabled={isLoading}>
            {t('import.fix.save')}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t('import.fix.cancel')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {failed ? <Alert tone="danger" title={t('import.fix.failed')} /> : null}

        <Field label={t('import.fix.name')}>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} aria-label={t('import.fix.name')} />
        </Field>

        <Field label={t('import.fix.phone')}>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            aria-label={t('import.fix.phone')}
          />
        </Field>

        <Field label={t('import.fix.action')} hint={t('import.fix.actionHint')}>
          <Select
            options={ACTIONS.map((value) => ({ value, label: t(`import.action.${value}`) }))}
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder={t('import.fix.actionAuto')}
          />
        </Field>
      </div>
    </Dialog>
  );
}
