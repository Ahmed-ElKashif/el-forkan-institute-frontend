import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Dialog, Field, Select, Textarea, type SelectOption } from '../../ds';
import type { Book } from '../catalogue';
import { useAddCurriculumUnitMutation, useUpdateCurriculumUnitMutation } from './curriculum.api';
import { refusalKey } from './refusal';
import type { CurriculumUnit } from './curriculum.model';

interface Props {
  curriculumId: number;
  unit: CurriculumUnit | null;
  books: Book[];
  /** Where this book sits among the مادة's existing books. Assigned for the user
   *  because `curriculum_units` is UNIQUE on (curriculum, sort_order) — a number
   *  the head teacher had to pick, and could collide on, for no benefit. */
  nextSortOrder: number;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/**
 * Prescribe a book to a مادة.
 *
 * This replaces the old "add unit" dialog, which asked for a scope, a label, an
 * alternative-group number and a sort order before it would save. A
 * `curriculum_unit` *is* a prescribed book, so that is what it now asks for: pick
 * the book. The scope stays, because «الروض المربع — باب الصلاة» is a real thing
 * an institute prescribes, but it is optional and defaults to the whole book —
 * `syllabus_scope_ar` is NOT NULL server-side, so something must be sent.
 *
 * A مادة with no printed book (حفظ، تلاوة) simply has no book prescribed; the
 * scope alone is enough to save, which is why either field satisfies the form.
 */
export function BookDialog({ curriculumId, unit, books, nextSortOrder, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const isEdit = unit != null;
  const [add, addState] = useAddCurriculumUnitMutation();
  const [update, updateState] = useUpdateCurriculumUnitMutation();

  const [bookId, setBookId] = useState<number | null>(unit?.bookId ?? null);
  const [scope, setScope] = useState(unit?.syllabusScopeAr ?? '');
  const [error, setError] = useState<string | null>(null);

  const busy = addState.isLoading || updateState.isLoading;
  const canSubmit = (bookId != null || scope.trim() !== '') && !busy;

  const bookOptions: SelectOption[] = books
    .filter((book) => book.isActive || book.id === unit?.bookId)
    .map((book) => ({ value: book.id, label: book.titleAr }));

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    const body = {
      bookId,
      syllabusScopeAr: scope.trim() === '' ? t('curriculum.books.wholeBook') : scope.trim(),
      // Kept out of the UI: neither told the head teacher anything, and both
      // were required fields on a form whose job is "which book".
      unitLabel: unit?.unitLabel ?? null,
      alternativeGroup: unit?.alternativeGroup ?? null,
      sortOrder: unit?.sortOrder ?? nextSortOrder,
    };
    try {
      if (isEdit) {
        await update({ id: unit.id, patch: body }).unwrap();
      } else {
        await add({ curriculumId, body }).unwrap();
      }
      onSaved(t(isEdit ? 'curriculum.books.saved' : 'curriculum.books.added'));
    } catch (cause) {
      setError(t(refusalKey(cause)));
    }
  }

  return (
    <Dialog
      title={t(isEdit ? 'curriculum.books.editTitle' : 'curriculum.books.addTitle')}
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

        <Field label={t('curriculum.books.book')}>
          <Select
            options={bookOptions}
            placeholder={t('curriculum.books.noBook')}
            value={bookId ?? ''}
            onChange={(e) => setBookId(e.target.value === '' ? null : Number(e.target.value))}
            aria-label={t('curriculum.books.book')}
          />
        </Field>

        <Field label={t('curriculum.books.scope')} hint={t('curriculum.books.scopeHint')}>
          <Textarea
            rows={2}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder={t('curriculum.books.wholeBook')}
            aria-label={t('curriculum.books.scope')}
          />
        </Field>
      </div>
    </Dialog>
  );
}
