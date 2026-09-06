import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Dialog, Field, Input, Select, type SelectOption } from '../../ds';
import { useCurrentAcademicYearQuery } from '../../shared/api/calendar';
import { useListSectionsQuery } from '../sections';
import { useQueueReminderMutation } from './whatsapp.api';

/** Queue a Friday reminder for one section on a target date. Sections load only
 *  when this dialog opens (they are not needed to monitor campaigns). The API
 *  refuses with 409 when phone coverage is below 70% or a reminder already
 *  exists for the section and date — surfaced here by status, not English text. */
export function ReminderDialog({ onClose, onQueued }: { onClose: () => void; onQueued: (message: string) => void }) {
  const { t } = useTranslation();
  const year = useCurrentAcademicYearQuery();
  const sections = useListSectionsQuery(
    { academicYearId: year.data?.id ?? 0, page: 1, pageSize: 100 },
    { skip: year.data == null },
  );
  const [queue, queueState] = useQueueReminderMutation();
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const noYear = !year.isLoading && year.data == null;
  const canSubmit = sectionId != null && targetDate !== '' && !queueState.isLoading;
  const sectionOptions: SelectOption[] = (sections.data?.items ?? []).map((s) => ({ value: s.id, label: s.name }));

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    try {
      await queue({ sectionId: sectionId as string, targetDate }).unwrap();
      onQueued(t('whatsapp.reminder.queued'));
    } catch (cause) {
      const status = (cause as { status?: number | string }).status;
      setError(status === 409 ? t('whatsapp.reminder.conflict') : t('whatsapp.saveError'));
    }
  }

  return (
    <Dialog
      title={t('whatsapp.reminder.title')}
      description={t('whatsapp.reminder.description')}
      onClose={onClose}
      width={480}
      footer={
        <>
          <Button variant="primary" onClick={submit} disabled={!canSubmit} loading={queueState.isLoading}>{t('whatsapp.reminder.queue')}</Button>
          <Button variant="secondary" onClick={onClose}>{t('whatsapp.cancel')}</Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert tone="danger" title={error} /> : null}
        {noYear ? (
          <Alert tone="warning" title={t('whatsapp.reminder.noYear')} />
        ) : (
          <>
            <Field label={t('whatsapp.reminder.section')} required>
              <Select options={sectionOptions} placeholder={t('whatsapp.reminder.sectionPlaceholder')} value={sectionId ?? ''} onChange={(e) => setSectionId(e.target.value === '' ? null : e.target.value)} aria-label={t('whatsapp.reminder.section')} />
            </Field>
            <Field label={t('whatsapp.reminder.date')} required hint={t('whatsapp.reminder.dateHint')}>
              <Input type="date" className="ef-num" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} aria-label={t('whatsapp.reminder.date')} />
            </Field>
          </>
        )}
      </div>
    </Dialog>
  );
}
