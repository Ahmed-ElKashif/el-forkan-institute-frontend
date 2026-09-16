import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Toast,
  formatClassDate,
  type BadgeProps,
} from '../../ds';
import { ListSkeleton } from '../../shared/react/PagedList';
import { isPastDate } from './class-day-dates';
import { ClassDayDialog } from './ClassDayDialog';
import { EditPeriodDialog } from './EditPeriodDialog';
import { useDeleteSessionMutation, useListSessionsQuery } from './sessions.api';
import type { Session } from './session.model';

const STATUS_TONE: Record<string, NonNullable<BadgeProps['tone']>> = {
  scheduled: 'info',
  held: 'success',
  cancelled: 'danger',
};

const HHMM = /(\d{2}:\d{2})/;
function hhmm(value: string): string {
  return HHMM.exec(value)?.[1] ?? value;
}

/** Groups the cohort's sessions into class days (by date), preserving the
 *  server's date-then-time order. */
function groupByDate(sessions: Session[]): Array<{ date: string; periods: Session[] }> {
  const days: Array<{ date: string; periods: Session[] }> = [];
  for (const session of sessions) {
    const last = days[days.length - 1];
    if (last && last.date === session.sessionDate) last.periods.push(session);
    else days.push({ date: session.sessionDate, periods: [session] });
  }
  return days;
}

type ToastState = { tone: 'success' | 'danger'; message: string };

/** The class-days tab (head-teacher): the days this cohort has been scheduled
 *  for, and the button that creates the next one. A class day is created for the
 *  whole level; this list shows the current cohort's periods (a `both` period
 *  appears under either gender, a scoped one only under its own).
 *
 *  An upcoming day is a plan — its periods can be added to, edited or removed. A
 *  past day is a record (attendance was taken against it), so it is shown locked;
 *  a back-filled past day is set up in full when it is created. */
export function ClassDaysTab({
  levelId,
  academicYearId,
  sectionId,
}: {
  levelId: number;
  academicYearId: number;
  sectionId: string;
}) {
  const { t } = useTranslation();
  // ponytail: first page only. A cohort's term holds well under a page of
  // sessions; add real paging if a level ever schedules past one page.
  const list = useListSessionsQuery({ sectionId, page: 1 });
  const [deleteSession] = useDeleteSessionMutation();

  // `{}` opens a brand-new class day; `{ fixedDate }` adds periods to that day.
  const [classDayDialog, setClassDayDialog] = useState<{ fixedDate?: string } | null>(null);
  const [editing, setEditing] = useState<Session | null>(null);
  const [confirming, setConfirming] = useState<Session | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  async function remove() {
    if (!confirming) return;
    try {
      await deleteSession(confirming.id).unwrap();
      setToast({ tone: 'success', message: t('schedule.deleted') });
    } catch {
      setToast({ tone: 'danger', message: t('schedule.deleteError') });
    } finally {
      setConfirming(null);
    }
  }

  const days = groupByDate(list.data?.items ?? []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="m-0 text-sm text-ink-500">{t('schedule.caption')}</p>
        <Button size="sm" icon="plus" onClick={() => setClassDayDialog({})}>
          {t('schedule.addClassDay')}
        </Button>
      </div>

      {list.isLoading && !list.data ? (
        <ListSkeleton />
      ) : list.isError ? (
        <Alert tone="danger" title={t('schedule.error')} />
      ) : days.length === 0 ? (
        <EmptyState
          icon="calendar-days"
          title={t('schedule.empty.title')}
          description={t('schedule.empty.description')}
        />
      ) : (
        <div className="space-y-3">
          {days.map((day) => {
            const past = isPastDate(day.date);
            return (
              <Card key={day.date}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="m-0 text-base font-bold text-ink-900">{formatClassDate(day.date)}</h3>
                  {past ? (
                    <Badge tone="neutral">{t('schedule.pastDay')}</Badge>
                  ) : (
                    <Button size="sm" variant="secondary" icon="plus" onClick={() => setClassDayDialog({ fixedDate: day.date })}>
                      {t('schedule.addSubject')}
                    </Button>
                  )}
                </div>
                <ul className="m-0 grid list-none gap-2 p-0">
                  {day.periods.map((period) => (
                    <li key={period.id} className="flex flex-wrap items-center gap-3 border-t border-subtle pt-2 text-sm first:border-t-0 first:pt-0">
                      <span className="ef-num tabular-nums text-ink-500">
                        {hhmm(period.startsAt)}–{hhmm(period.endsAt)}
                      </span>
                      <span className="flex-1 font-semibold text-ink-900">{period.subjectNameAr}</span>
                      <span className="text-ink-600">{period.sheikhName ?? t('schedule.noSheikh')}</span>
                      <Badge tone={STATUS_TONE[period.status] ?? 'neutral'}>{t(`sessions.status.${period.status}`, period.status)}</Badge>
                      {past ? null : (
                        <>
                          <IconButton icon="pencil" variant="ghost" label={t('schedule.editPeriod')} onClick={() => setEditing(period)} />
                          <IconButton icon="trash" variant="ghost" label={t('schedule.deletePeriod')} onClick={() => setConfirming(period)} />
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      {classDayDialog ? (
        <ClassDayDialog
          levelId={levelId}
          academicYearId={academicYearId}
          fixedDate={classDayDialog.fixedDate}
          onClose={() => setClassDayDialog(null)}
          onSaved={(message) => {
            setClassDayDialog(null);
            setToast({ tone: 'success', message });
          }}
        />
      ) : null}

      {editing ? (
        <EditPeriodDialog
          session={editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            setToast({ tone: 'success', message });
          }}
        />
      ) : null}

      {confirming ? (
        <ConfirmDialog
          title={t('schedule.deleteTitle')}
          consequence={t('schedule.deleteConsequence', { subject: confirming.subjectNameAr })}
          confirmLabel={t('schedule.confirmDelete')}
          cancelLabel={t('schedule.cancel')}
          tone="danger"
          onConfirm={remove}
          onCancel={() => setConfirming(null)}
        />
      ) : null}

      {toast ? (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <Toast tone={toast.tone} message={toast.message} onDismiss={() => setToast(null)} />
        </div>
      ) : null}
    </div>
  );
}
