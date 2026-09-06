import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Checkbox, Dialog, Field, Input, Textarea } from '../../ds';
import { useCreateBookMutation, useUpdateBookMutation } from './catalogue.api';
import type { Book } from './catalogue.model';

/** Create or edit a book (curriculum reference material). */
export function BookFormDialog({ book, onClose, onSaved }: { book: Book | null; onClose: () => void; onSaved: (message: string) => void }) {
  const { t } = useTranslation();
  const isEdit = book != null;
  const [create, createState] = useCreateBookMutation();
  const [update, updateState] = useUpdateBookMutation();

  const [titleAr, setTitleAr] = useState(book?.titleAr ?? '');
  const [authorAr, setAuthorAr] = useState(book?.authorAr ?? '');
  const [notes, setNotes] = useState(book?.notes ?? '');
  const [isActive, setIsActive] = useState(book?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const busy = createState.isLoading || updateState.isLoading;
  const canSubmit = titleAr.trim() !== '' && !busy;

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    const author = authorAr.trim() === '' ? undefined : authorAr.trim();
    const note = notes.trim() === '' ? undefined : notes.trim();
    try {
      if (isEdit) {
        await update({ id: book.id, patch: { titleAr: titleAr.trim(), authorAr: author, notes: note, isActive } }).unwrap();
      } else {
        await create({ titleAr: titleAr.trim(), authorAr: author, notes: note }).unwrap();
      }
      onSaved(t(isEdit ? 'catalogue.books.saved' : 'catalogue.books.created', { name: titleAr.trim() }));
    } catch {
      setError(t('catalogue.saveError'));
    }
  }

  return (
    <Dialog
      title={t(isEdit ? 'catalogue.books.editTitle' : 'catalogue.books.createTitle')}
      onClose={onClose}
      width={520}
      footer={
        <>
          <Button variant="primary" onClick={submit} disabled={!canSubmit} loading={busy}>
            {t('catalogue.save')}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t('catalogue.cancel')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}
        <Field label={t('catalogue.books.titleAr')} required>
          <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} aria-label={t('catalogue.books.titleAr')} />
        </Field>
        <Field label={t('catalogue.books.authorAr')}>
          <Input value={authorAr} onChange={(e) => setAuthorAr(e.target.value)} aria-label={t('catalogue.books.authorAr')} />
        </Field>
        <Field label={t('catalogue.books.notes')}>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} aria-label={t('catalogue.books.notes')} />
        </Field>
        {isEdit ? <Checkbox label={t('catalogue.active')} checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> : null}
      </div>
    </Dialog>
  );
}
