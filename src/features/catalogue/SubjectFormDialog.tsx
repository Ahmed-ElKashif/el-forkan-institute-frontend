import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, Checkbox, Dialog, Field, IconButton, Input } from '../../ds';
import {
  useAddSubjectAliasMutation,
  useCreateSubjectMutation,
  useRemoveSubjectAliasMutation,
  useUpdateSubjectMutation,
} from './catalogue.api';
import type { Subject } from './catalogue.model';

/**
 * Create or edit a subject.
 *
 * There is no code field. `subjects.code` is required and unique in the
 * database, but nothing reads it — the Excel import matches on المرادفات, not on
 * the code — so the server names the subject `S001`, `S002`… and the head
 * teacher never meets it. The old form asked for one under a hint claiming
 * imports resolved against it, which was simply untrue.
 *
 * المرادفات are the part that matters and had no UI at all: the import resolves
 * a subject written the way the sheets write it (§6.2 — the real files contain
 * both `سيرة` and `سيره`), and an unresolved spelling flags the row rather than
 * inventing a subject. Creating a subject seeds aliases from its names; anything
 * else the sheets use has to be added here.
 */
export function SubjectFormDialog({
  subject,
  onClose,
  onSaved,
}: {
  subject: Subject | null;
  onClose: () => void;
  /** The saved record comes back so a caller that opened this to fill a gap —
   *  the curriculum's «مادة جديدة» — can select it without a second search. */
  onSaved: (message: string, saved: Subject) => void;
}) {
  const { t } = useTranslation();
  const isEdit = subject != null;
  const [create, createState] = useCreateSubjectMutation();
  const [update, updateState] = useUpdateSubjectMutation();

  const [nameAr, setNameAr] = useState(subject?.nameAr ?? '');
  const [shortNameAr, setShortNameAr] = useState(subject?.shortNameAr ?? '');
  const [nameEn, setNameEn] = useState(subject?.nameEn ?? '');
  const [isActive, setIsActive] = useState(subject?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const busy = createState.isLoading || updateState.isLoading;
  const canSubmit = nameAr.trim() !== '' && !busy;

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    const short = shortNameAr.trim() === '' ? undefined : shortNameAr.trim();
    const en = nameEn.trim() === '' ? undefined : nameEn.trim();
    try {
      const saved = isEdit
        ? await update({
            id: subject.id,
            patch: { nameAr: nameAr.trim(), shortNameAr: short, nameEn: en, isActive },
          }).unwrap()
        : await create({ nameAr: nameAr.trim(), shortNameAr: short, nameEn: en }).unwrap();
      onSaved(t(isEdit ? 'catalogue.subjects.saved' : 'catalogue.subjects.created', { name: nameAr.trim() }), saved);
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
          <Button variant="secondary" onClick={onClose}>
            {t('catalogue.cancel')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}

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

        {/* Only once the subject exists: an alias needs something to point at. */}
        {isEdit ? <AliasEditor subject={subject} /> : null}
      </div>
    </Dialog>
  );
}

/** The spellings the Excel import will recognise for this subject. */
function AliasEditor({ subject }: { subject: Subject }) {
  const { t } = useTranslation();
  const [addAlias, addState] = useAddSubjectAliasMutation();
  const [removeAlias] = useRemoveSubjectAliasMutation();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const alias = draft.trim();
    if (alias === '' || addState.isLoading) return;
    setError(null);
    try {
      await addAlias({ subjectId: subject.id, aliasAr: alias }).unwrap();
      setDraft('');
    } catch {
      // The commonest refusal is a spelling already claimed by another subject —
      // `subject_aliases.normalized` is unique across the whole institute.
      setError(t('catalogue.subjects.aliasError'));
    }
  }

  return (
    <Field label={t('catalogue.subjects.aliases')} hint={t('catalogue.subjects.aliasesHint')}>
      <div className="grid gap-2">
        {error ? <Alert tone="danger" title={error} /> : null}

        {subject.aliases.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {subject.aliases.map((alias) => (
              <span key={alias.id} className="inline-flex items-center gap-1">
                <Badge tone="neutral">{alias.aliasAr}</Badge>
                <IconButton
                  icon="x"
                  variant="ghost"
                  size="sm"
                  label={t('catalogue.subjects.aliasRemove', { name: alias.aliasAr })}
                  onClick={() => removeAlias(alias.id)}
                />
              </span>
            ))}
          </div>
        ) : (
          <p className="m-0 text-xs text-ink-500">{t('catalogue.subjects.aliasesEmpty')}</p>
        )}

        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('catalogue.subjects.aliasPlaceholder')}
            aria-label={t('catalogue.subjects.aliasPlaceholder')}
          />
          <Button variant="secondary" onClick={add} disabled={draft.trim() === ''} loading={addState.isLoading}>
            {t('catalogue.subjects.aliasAdd')}
          </Button>
        </div>
      </div>
    </Field>
  );
}
