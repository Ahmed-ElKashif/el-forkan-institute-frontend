import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Dialog, Field, Select, formatNumber, type SelectOption } from '../../ds';
import { useAcademicYearQuery, defaultTerm } from '../../shared/api/calendar';
import { useGenerateSessionsMutation } from './timetable.api';

interface Props {
  sectionId: string;
  academicYearId: number;
  onClose: () => void;
  onGenerated: (message: string) => void;
}

/** Generates a term's dated sessions from the section's timetable. Separate from
 *  slot editing: it writes sessions, not slots. Re-running is safe — the API's
 *  unique constraint skips sessions that already exist (reported as "skipped").
 *  ponytail: off-days (holidays) default to none; a holiday picker can be added
 *  when the institute's closures are modelled. */
export function GenerateSessionsDialog({ sectionId, academicYearId, onClose, onGenerated }: Props) {
  const { t } = useTranslation();
  const year = useAcademicYearQuery(academicYearId);
  const [generate, generateState] = useGenerateSessionsMutation();
  const [termId, setTermId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const terms = year.data?.terms ?? [];
  const selectedTerm = termId ?? defaultTerm(terms)?.id ?? null;
  const termOptions: SelectOption[] = terms.map((term) => ({ value: term.id, label: t('timetable.generate.term', { n: formatNumber(term.termNumber) }) }));

  async function run() {
    if (selectedTerm == null) return;
    setError(null);
    try {
      const result = await generate({ sectionId, termId: selectedTerm, offDays: [] }).unwrap();
      onGenerated(t('timetable.generate.done', { created: formatNumber(result.created), skipped: formatNumber(result.skipped) }));
    } catch {
      setError(t('timetable.generate.failed'));
    }
  }

  return (
    <Dialog
      title={t('timetable.generate.title')}
      description={t('timetable.generate.description')}
      onClose={onClose}
      width={480}
      footer={
        <>
          <Button variant="primary" onClick={run} disabled={selectedTerm == null || generateState.isLoading} loading={generateState.isLoading}>
            {t('timetable.generate.confirm')}
          </Button>
          <Button variant="secondary" onClick={onClose}>{t('timetable.cancel')}</Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}
        {year.isError ? (
          <Alert tone="danger" title={t('timetable.generate.termsError')} />
        ) : (
          <Field label={t('timetable.generate.termLabel')}>
            <Select options={termOptions} value={selectedTerm ?? ''} onChange={(e) => setTermId(Number(e.target.value))} aria-label={t('timetable.generate.termLabel')} />
          </Field>
        )}
      </div>
    </Dialog>
  );
}
