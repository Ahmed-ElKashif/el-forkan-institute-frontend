import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  AttendanceCell,
  ATTENDANCE_STATES,
  Badge,
  CommitBar,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Field,
  Select,
  Skeleton,
  Toast,
  cn,
  formatClassDate,
  formatNumber,
  type AttendanceStatus,
  type Column,
} from '../../ds';
import { useListSessionsQuery } from '../sessions';
import { useAcademicYearQuery, defaultTerm, type Term } from '../../shared/api/calendar';
import { useAttendanceGridQuery, useSaveSessionAttendanceMutation } from './attendance.api';
import type {
  AbsenceWarning,
  AttendanceEntry,
  AttendanceGridRow,
  AttendanceSession,
} from './attendance.model';

/* Tapping a cell cycles through the four states in this order, then wraps. An
   unrecorded cell (null) enters the cycle at the first state. There is no way
   back to "unrecorded" — clearing a marked student is not a real action. */
const CYCLE: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];

function nextStatus(current: AttendanceStatus | null): AttendanceStatus {
  if (current == null) return CYCLE[0];
  return CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
}

/** Local edit key. A flat map keyed by session+student keeps the whole grid's
 *  pending edits in one place; the session prefix is how a column knows if it
 *  is dirty. */
function editKey(sessionId: string, enrollmentId: string): string {
  return `${sessionId}|${enrollmentId}`;
}

/** The class days a cohort has, newest last, from its sessions. */
function classDayDates(sessions: Array<{ sessionDate: string }>): string[] {
  return [...new Set(sessions.map((s) => s.sessionDate))].sort();
}

/** The term a date falls in, so the grid's running absence count is scoped to
 *  the right term even though the teacher navigates by day. */
function termForDate(terms: Term[], date: string): Term | null {
  return (
    terms.find((term) => term.startsOn.slice(0, 10) <= date && date <= term.endsOn.slice(0, 10)) ??
    null
  );
}

/** The attendance tab in the level hub: date-first. The teacher picks a class
 *  day (the cohort's scheduled dates) and the grid shows that day's periods as
 *  columns, each headed by its subject and time — "mark Ahmed present for the
 *  first and last class, with the class name shown". Reuses the same interactive
 *  sheet as the term view. */
export function AttendanceTab({
  sectionId,
  academicYearId,
}: {
  sectionId: string;
  academicYearId: number;
}) {
  const { t } = useTranslation();
  const year = useAcademicYearQuery(academicYearId, { skip: academicYearId === 0 });
  const days = useListSessionsQuery({ sectionId, page: 1 });

  const terms = year.data?.terms ?? [];
  const dates = classDayDates(days.data?.items ?? []);
  const [chosen, setChosen] = useState<string | null>(null);
  const [pendingMarks, setPendingMarks] = useState(0);
  const [dayAwaitingConfirm, setDayAwaitingConfirm] = useState<string | null>(null);
  // Default to the most recent class day, which is the one being marked today.
  const date = chosen ?? dates[dates.length - 1] ?? null;

  /* Switching day swaps the whole grid, and pending marks belong to the day's
     own sessions — carrying them over would attach them to the wrong periods, so
     the grid is rebuilt per day (`key`) and unsaved work is confirmed away
     rather than discarded silently. */
  function chooseDay(next: string) {
    if (pendingMarks > 0) setDayAwaitingConfirm(next);
    else setChosen(next);
  }

  if (year.isLoading || days.isLoading) return <GridSkeleton />;
  if (dates.length === 0) {
    return (
      <EmptyState
        icon="calendar-days"
        title={t('attendance.noClassDays.title')}
        description={t('attendance.noClassDays.description')}
      />
    );
  }

  const term = date != null ? (termForDate(terms, date) ?? defaultTerm(terms)) : defaultTerm(terms);

  return (
    <section className="space-y-4">
      <Field label={t('attendance.classDay')} className="w-72">
        <Select
          options={dates.map((d) => ({ value: d, label: formatClassDate(d) }))}
          value={date ?? ''}
          onChange={(e) => chooseDay(e.target.value)}
          aria-label={t('attendance.classDay')}
        />
      </Field>
      {date != null && term != null ? (
        <Grid
          key={date}
          sectionId={sectionId}
          termId={term.id}
          date={date}
          onPendingChange={setPendingMarks}
        />
      ) : null}

      {dayAwaitingConfirm != null ? (
        <ConfirmDialog
          title={t('attendance.unsaved.title')}
          consequence={t('attendance.unsaved.consequence', { count: formatNumber(pendingMarks) })}
          confirmLabel={t('attendance.unsaved.discard')}
          tone="danger"
          onConfirm={() => {
            setChosen(dayAwaitingConfirm);
            setDayAwaitingConfirm(null);
          }}
          onCancel={() => setDayAwaitingConfirm(null)}
        />
      ) : null}
    </section>
  );
}

/** The interactive sheet. Server data is the base; `edits` overlays the
 *  teacher's pending taps, so a save that refetches the grid never discards work
 *  in other columns. */
function Grid({
  sectionId,
  termId,
  date,
  onPendingChange,
}: {
  sectionId: string;
  termId: number;
  date?: string;
  onPendingChange: (count: number) => void;
}) {
  const { t } = useTranslation();
  const grid = useAttendanceGridQuery({ sectionId, termId, date });
  const [save] = useSaveSessionAttendanceMutation();

  const [edits, setEdits] = useState<Record<string, AttendanceStatus>>({});
  const [warnings, setWarnings] = useState<Record<string, AbsenceWarning>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ tone: 'success' | 'danger'; message: string; detail?: string } | null>(null);

  // The day picker lives one level up and needs to know there is work to lose.
  const pendingMarks = Object.keys(edits).length;
  useEffect(() => {
    onPendingChange(pendingMarks);
  }, [pendingMarks, onPendingChange]);

  const gridData = grid.data;
  const sessions = gridData?.sessions ?? [];
  const rows = gridData?.rows ?? [];

  const dirtySessions = useMemo(() => {
    const set = new Set<string>();
    for (const key of Object.keys(edits)) set.add(key.slice(0, key.indexOf('|')));
    return set;
  }, [edits]);

  function statusOf(session: AttendanceSession, row: AttendanceGridRow): AttendanceStatus | null {
    const edited = edits[editKey(session.id, row.enrollmentId)];
    if (edited !== undefined) return edited;
    return row.cells.find((cell) => cell.sessionId === session.id)?.status ?? null;
  }

  function cycle(session: AttendanceSession, row: AttendanceGridRow) {
    const key = editKey(session.id, row.enrollmentId);
    setEdits((prev) => ({ ...prev, [key]: nextStatus(statusOf(session, row)) }));
  }

  /** Every student already marked in this period. A period is what the API
   *  writes in one request, so this is the unit a save is built from. */
  function markedEntries(session: AttendanceSession): AttendanceEntry[] {
    return rows
      .map((row) => ({ enrollmentId: row.enrollmentId, status: statusOf(session, row) }))
      .filter((entry): entry is AttendanceEntry => entry.status !== null);
  }

  /** Commits the whole sheet: one request per period the teacher touched.
   *
   *  A period that fails keeps its own edits, so a retry resends exactly the
   *  work that did not land, and the failed periods are named — folding them
   *  into one "save failed" would leave the teacher guessing which register is
   *  still unrecorded. */
  async function saveTouchedPeriods() {
    const touched = sessions.filter((session) => dirtySessions.has(session.id));
    setIsSaving(true);
    const failedPeriods: string[] = [];
    let savedCount = 0;

    for (const session of touched) {
      const entries = markedEntries(session);
      if (entries.length === 0) continue;
      try {
        const outcome = await save({ sessionId: session.id, entries }).unwrap();
        savedCount += outcome.saved;
        // The period is now server truth; drop its edits so the refetch
        // (triggered by invalidation) is what the column reads.
        setEdits((prev) => {
          const next = { ...prev };
          for (const row of rows) delete next[editKey(session.id, row.enrollmentId)];
          return next;
        });
        setWarnings((prev) => {
          const next = { ...prev };
          for (const warning of outcome.warnings) next[warning.enrollmentId] = warning;
          return next;
        });
      } catch {
        failedPeriods.push(session.subjectNameAr);
      }
    }

    setIsSaving(false);
    setToast(
      failedPeriods.length > 0
        ? { tone: 'danger', message: t('attendance.savePartial', { periods: failedPeriods.join('، ') }) }
        : {
            tone: 'success',
            message: t('attendance.saved'),
            detail: t('attendance.savedDetail', { count: formatNumber(savedCount) }),
          },
    );
  }

  if (grid.isLoading && !gridData) return <GridSkeleton />;
  if (grid.isError && !gridData) return <Alert tone="danger" title={t('attendance.error')} />;
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon="clipboard-check"
        title={t('attendance.noSessions.title')}
        description={t('attendance.noSessions.description')}
      />
    );
  }

  const columns: Column<AttendanceGridRow>[] = [
    {
      key: 'student',
      header: t('attendance.student'),
      sticky: true,
      render: (row) => <StudentCell row={row} warning={warnings[row.enrollmentId]} />,
    },
    ...sessions.map<Column<AttendanceGridRow>>((session) => ({
      key: session.id,
      align: 'center',
      width: date != null ? 116 : 72,
      header: (
        <ColumnHeader session={session} dateMode={date != null} dirty={dirtySessions.has(session.id)} />
      ),
      render: (row) => (
        <AttendanceCell status={statusOf(session, row)} onClick={() => cycle(session, row)} />
      ),
    })),
  ];

  return (
    <div className={grid.isFetching ? 'opacity-60 transition-opacity' : undefined} aria-busy={grid.isFetching}>
      <AttendanceLegend />
      <DataTable density="compact" columns={columns} rows={rows} getRowKey={(row) => row.enrollmentId} />

      {/* One commit for the whole sheet, like the score grid: a teacher marks
          across every period of the day and saves once, instead of hunting for
          a button per column and leaving some of them unpressed. */}
      {pendingMarks > 0 ? (
        <CommitBar
          counts={[
            { label: t('attendance.commit.marks'), value: formatNumber(pendingMarks), tone: 'update' },
            { label: t('attendance.commit.periods'), value: formatNumber(dirtySessions.size), tone: 'update' },
          ]}
          note={t('attendance.commit.note')}
          confirmLabel={t('attendance.save')}
          disabled={isSaving}
          onConfirm={saveTouchedPeriods}
        />
      ) : null}

      {toast ? (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <Toast tone={toast.tone} message={toast.message} detail={toast.detail} onDismiss={() => setToast(null)} />
        </div>
      ) : null}
    </div>
  );
}

function StudentCell({ row, warning }: { row: AttendanceGridRow; warning: AbsenceWarning | undefined }) {
  const { t } = useTranslation();
  const count = warning?.absenceCount ?? row.absenceCount;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-semibold text-ink-900">{row.studentName}</span>
      {warning ? (
        // The threshold is only known once a save returns it, so this badge
        // appears after the column that crossed the limit is saved, not on load.
        <Badge tone={warning.blocksExams ? 'danger' : 'warning'}>
          {t('attendance.overThreshold', { count: formatNumber(count) })}
        </Badge>
      ) : null}
    </div>
  );
}

function ColumnHeader({
  session,
  dateMode,
  dirty,
}: {
  session: AttendanceSession;
  dateMode: boolean;
  dirty: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-1" title={session.sessionDate}>
      {dateMode ? (
        // The date-first view names the class (subject + time), so the teacher
        // knows which period they are marking rather than a bare column number.
        <span className="flex flex-col items-center leading-tight">
          <span className="font-semibold text-ink-800">{session.subjectNameAr}</span>
          <span className="ef-num text-xs text-ink-400">{session.startsAt.slice(0, 5)}</span>
        </span>
      ) : (
        <span className="ef-num">{session.sessionNo != null ? formatNumber(session.sessionNo) : '—'}</span>
      )}
      {/* Which periods the single commit will write — and, after a partial
          failure, which ones still have not landed. */}
      {dirty ? <Badge tone="info">{t('attendance.commit.unsaved')}</Badge> : null}
    </div>
  );
}

/** What each cell glyph and colour means. The four states — especially the two
 *  amber circles, late «◔» and excused «○» — are hard to tell apart in the grid
 *  alone, so this keys them out. Labels come from the DS states, not i18n, the
 *  same source the cells render. */
function AttendanceLegend() {
  return (
    <ul className="m-0 mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 p-0 text-sm text-ink-600">
      {Object.values(ATTENDANCE_STATES).map((state) => (
        <li key={state.label} className="flex list-none items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn('grid size-6 place-items-center rounded-sm font-semibold', state.className)}
          >
            {state.glyph}
          </span>
          <span>{state.label}</span>
        </li>
      ))}
    </ul>
  );
}

function GridSkeleton() {
  return (
    <div className="rounded-lg border border-subtle bg-surface p-4">
      <Skeleton rows={8} height={24} />
    </div>
  );
}
