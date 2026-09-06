import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Button, ConfirmDialog, Toast } from '../../ds';
import { ListSkeleton } from '../../shared/react/PagedList';
import { useGetSectionQuery } from '../sections';
import { useSubjectOptionsQuery } from '../catalogue';
import { useTeacherOptionsQuery } from '../users';
import { useRemoveSlotMutation, useTimetableSlotsQuery } from './timetable.api';
import { WeekGrid } from './WeekGrid';
import { SlotDialog, type SlotDialogTarget } from './SlotDialog';
import { GenerateSessionsDialog } from './GenerateSessionsDialog';
import type { TimetableSlot } from './timetable.model';

type ToastState = { tone: 'success' | 'danger'; message: string };

/** The timetable editor for one section (head-teacher only, reached from the
 *  section picker). Builds the weekly slots; a teacher double-booking is caught
 *  server-side and shown in the slot dialog. "Generate sessions" turns the
 *  timetable into the term's dated sessions. This component orchestrates —
 *  fetching, dialog state and deletes — while `WeekGrid` renders. */
export function TimetableEditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sectionId = '' } = useParams();

  const section = useGetSectionQuery(sectionId, { skip: sectionId === '' });
  const slots = useTimetableSlotsQuery(sectionId, { skip: sectionId === '' });
  const subjects = useSubjectOptionsQuery();
  const teachers = useTeacherOptionsQuery();
  const [removeSlot] = useRemoveSlotMutation();

  const [slotDialog, setSlotDialog] = useState<SlotDialogTarget | null>(null);
  const [generating, setGenerating] = useState(false);
  const [confirm, setConfirm] = useState<TimetableSlot | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const hasSlots = (slots.data?.length ?? 0) > 0;

  async function confirmDelete() {
    if (!confirm) return;
    try {
      await removeSlot(confirm.id).unwrap();
      setToast({ tone: 'success', message: t('timetable.deleted') });
    } catch {
      setToast({ tone: 'danger', message: t('timetable.saveError') });
    } finally {
      setConfirm(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" icon="chevron-right" iconMirror onClick={() => navigate('/timetable')}>
          {t('timetable.back')}
        </Button>
        <h1 className="m-0 text-lg font-bold text-ink-900">
          {section.data ? t('timetable.heading', { name: section.data.name }) : t('timetable.headingPlain')}
        </h1>
        <div className="ms-auto flex gap-2">
          <Button
            variant="secondary"
            icon="calendar-days"
            disabled={!hasSlots || section.data == null}
            onClick={() => setGenerating(true)}
          >
            {t('timetable.generate.action')}
          </Button>
          <Button icon="plus" disabled={sectionId === ''} onClick={() => setSlotDialog({ mode: 'create' })}>
            {t('timetable.addSlot')}
          </Button>
        </div>
      </div>

      {slots.isLoading && !slots.data ? (
        <ListSkeleton />
      ) : slots.isError ? (
        <Alert tone="danger" title={t('timetable.error')} />
      ) : !hasSlots ? (
        <p className="py-10 text-center text-sm text-ink-500">{t('timetable.empty')}</p>
      ) : (
        <WeekGrid slots={slots.data ?? []} onEdit={(slot) => setSlotDialog({ mode: 'edit', slot })} onDelete={setConfirm} />
      )}

      {slotDialog ? (
        <SlotDialog
          sectionId={sectionId}
          target={slotDialog}
          subjects={subjects.data ?? []}
          teachers={teachers.data ?? []}
          onClose={() => setSlotDialog(null)}
          onSaved={(message) => { setSlotDialog(null); setToast({ tone: 'success', message }); }}
        />
      ) : null}

      {generating && section.data ? (
        <GenerateSessionsDialog
          sectionId={sectionId}
          academicYearId={section.data.academicYearId}
          onClose={() => setGenerating(false)}
          onGenerated={(message) => { setGenerating(false); setToast({ tone: 'success', message }); }}
        />
      ) : null}

      {confirm ? (
        <ConfirmDialog
          title={t('timetable.deleteTitle')}
          consequence={t('timetable.deleteConsequence', { subject: confirm.subjectNameAr, day: t(`timetable.weekdays.${confirm.weekday}`) })}
          confirmLabel={t('timetable.delete')}
          cancelLabel={t('timetable.cancel')}
          onConfirm={confirmDelete}
          onCancel={() => setConfirm(null)}
        />
      ) : null}

      {toast ? (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <Toast tone={toast.tone} message={toast.message} onDismiss={() => setToast(null)} />
        </div>
      ) : null}
    </section>
  );
}
