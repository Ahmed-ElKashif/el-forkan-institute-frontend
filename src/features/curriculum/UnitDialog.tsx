import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Dialog, Field, Input, Select, Textarea, type SelectOption } from '../../ds';
import type { Book } from '../catalogue';
import { useAddCurriculumUnitMutation, useUpdateCurriculumUnitMutation } from './curriculum.api';
import type { CurriculumUnit } from './curriculum.model';

interface Props {
  curriculumId: number;
  unit: CurriculumUnit | null;
  books: Book[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** Add or edit a unit under a curriculum row: the scope of study (required),
 *  and optionally the book it maps to, a label, and an alternative-group number
 *  that ties «أو» book choices together on the printed syllabus. */
export function UnitDialog({ curriculumId, unit, books, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const isEdit = unit != null;
  const [add, addState] = useAddCurriculumUnitMutation();
  const [update, updateState] = useUpdateCurriculumUnitMutation();

  const [scope, setScope] = useState(unit?.syllabusScopeAr ?? '');
  const [bookId, setBookId] = useState<number | null>(unit?.bookId ?? null);
  const [label, setLabel] = useState(unit?.unitLabel ?? '');
  const [altGroup, setAltGroup] = useState(unit?.alternativeGroup != null ? String(unit.alternativeGroup) : '');
  const [sortOrder, setSortOrder] = useState(String(unit?.sortOrder ?? 1));
  const [error, setError] = useState<string | null>(null);

  const busy = addState.isLoading || updateState.isLoading;
  const canSubmit = scope.trim() !== '' && !busy;

  const bookOptions: SelectOption[] = books.map((b) => ({ value: b.id, label: b.titleAr }));

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    const body = {
      bookId,
      unitLabel: label.trim() === '' ? null : label.trim(),
      syllabusScopeAr: scope.trim(),
      alternativeGroup: altGroup.trim() === '' ? null : Number(altGroup),
      sortOrder: Number(sortOrder),
    };
    try {
      if (isEdit) {
        await update({ id: unit.id, patch: body }).unwrap();
      } else {
        await add({ curriculumId, body }).unwrap();
      }
      onSaved(t(isEdit ? 'curriculum.units.saved' : 'curriculum.units.added'));
    } catch {
      setError(t('curriculum.saveError'));
    }
  }

  return (
    <Dialog
      title={t(isEdit ? 'curriculum.units.editTitle' : 'curriculum.units.addTitle')}
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button variant="primary" onClick={submit} disabled={!canSubmit} loading={busy}>
            {t('curriculum.save')}
          </Button>
          <Button variant="secondary" onClick={onClose}>{t('curriculum.cancel')}</Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}
        <Field label={t('curriculum.units.scope')} required>
          <Textarea rows={3} value={scope} onChange={(e) => setScope(e.target.value)} aria-label={t('curriculum.units.scope')} />
        </Field>
        <Field label={t('curriculum.units.book')}>
          <Select
            options={bookOptions}
            placeholder={t('curriculum.units.noBook')}
            value={bookId ?? ''}
            onChange={(e) => setBookId(e.target.value === '' ? null : Number(e.target.value))}
            aria-label={t('curriculum.units.book')}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label={t('curriculum.units.label')}>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} aria-label={t('curriculum.units.label')} />
          </Field>
          <Field label={t('curriculum.units.altGroup')} hint={t('curriculum.units.altGroupHint')}>
            <Input type="number" inputMode="numeric" className="ef-num" value={altGroup} onChange={(e) => setAltGroup(e.target.value)} aria-label={t('curriculum.units.altGroup')} />
          </Field>
          <Field label={t('curriculum.units.sortOrder')}>
            <Input type="number" inputMode="numeric" className="ef-num" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} aria-label={t('curriculum.units.sortOrder')} />
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
