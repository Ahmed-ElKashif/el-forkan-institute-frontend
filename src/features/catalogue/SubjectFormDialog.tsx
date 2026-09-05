import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Checkbox, Dialog, Field, Input } from '../../ds';
import { useCreateSubjectMutation, useUpdateSubjectMutation } from './catalogue.api';
import type { Subject } from './catalogue.model';

/** Create or edit a subject. `code` is set only at creation — seeds and imports
 *  resolve against it, so renaming it would break alias matching. */
export function SubjectFormDialog({ subject, onClose, onSaved }: { subject: Subject | null; onClose: () => void; onSaved: (message: string) => void }) {
  const { t } = useTranslation();
  const isEdit = subject != null;
  const [create, createState] = useCreateSubjectMutation();
  const [update, updateState] = useUpdateSubjectMutation();

  const [code, setCode] = useState(subject?.code ?? '');
  const [nameAr, setNameAr] = useState(subject?.nameAr ?? '');
  const [shortNameAr, setShortNameAr] = useState(subject?.shortNameAr ?? '');
  const [nameEn, setNameEn] = useState(subject?.nameEn ?? '');
  const [isActive, setIsActive] = useState(subject?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const busy = createState.isLoading || updateState.isLoading;
  const canSubmit = nameAr.trim() !== '' && (isEdit || code.trim() !== '') && !busy;

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    const short = shortNameAr.trim() === '' ? undefined : shortNameAr.trim();
    const en = nameEn.trim() === '' ? undefined : nameEn.trim();
    try {
      if (isEdit) {
        await update({ id: subject.id, patch: { nameAr: nameAr.trim(), shortNameAr: short, nameEn: en, isActive } }).unwrap();
      } else {
        await create({ code: code.trim(), nameAr: nameAr.trim(), shortNameAr: short, nameEn: en }).unwrap();
      }
      onSaved(t(isEdit ? 'catalogue.subjects.saved' : 'catalogue.subjects.created', { name: nameAr.trim() }));
    } catch {
      setError(t('catalogue.saveError'));
    }
  }

  return (
    <Dialog
      title={t(isEdit ? 'catalogue.subjects.editTitle' : 'catalogue.subjects.createTitle')}
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button variant="primary" onClick={submit} disabled={!canSubmit} loading={busy}>
            {t('catalogue.save')}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t('catalogue.cancel')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}
        {!isEdit ? (
          <Field label={t('catalogue.subjects.code')} required hint={t('catalogue.subjects.codeHint')}>
            <Input value={code} onChange={(e) => setCode(e.target.value)} aria-label={t('catalogue.subjects.code')} />
          </Field>
        ) : null}
        <Field label={t('catalogue.subjects.nameAr')} required>
          <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} aria-label={t('catalogue.subjects.nameAr')} />
        </Field>
        <Field label={t('catalogue.subjects.shortNameAr')}>
          <Input value={shortNameAr} onChange={(e) => setShortNameAr(e.target.value)} aria-label={t('catalogue.subjects.shortNameAr')} />
        </Field>
        <Field label={t('catalogue.subjects.nameEn')}>
          <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} aria-label={t('catalogue.subjects.nameEn')} />
        </Field>
        {isEdit ? <Checkbox label={t('catalogue.active')} checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> : null}
      </div>
    </Dialog>
  );
}
