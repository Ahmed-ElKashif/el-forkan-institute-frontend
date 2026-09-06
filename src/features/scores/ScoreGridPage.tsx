import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  DataTable,
  LockBanner,
  RoleGate,
  ScoreInput,
  Skeleton,
  Toast,
  formatScore,
  type ActionItem,
  type BadgeProps,
  type Column,
} from '../../ds';
import { useAuth } from '../auth';
import { useScoreGridQuery, useSaveScoresMutation, useSetExamLockMutation } from './scores.api';
import { CorrectionDialog } from './CorrectionDialog';
import type { ScoreEntry, ScoreResult, ScoreRow } from './score.model';

const RESULT_TONE: Record<ScoreResult, BadgeProps['tone']> = {
  pass: 'success',
  fail: 'danger',
  absent: 'neutral',
  pending: 'warning',
};

interface ScoreDraft {
  score: string;
  isAbsent: boolean;
}

/** Parse an entry's mark for saving: absent, blank, or non-numeric all mean
 *  "no score", never a coerced NaN. */
function toScore(draft: ScoreDraft): number | null {
  if (draft.isAbsent || draft.score === '') return null;
  const value = Number(draft.score);
  return Number.isFinite(value) ? value : null;
}

/** The score grid for one exam: enter marks, lock (head teacher), and correct a
 *  locked grade (head teacher, with a reason). Reached from the exam picker at
 *  `/scores/exams/:examId`. */
export function ScoreGridPage() {
  const { t } = useTranslation();
  const { examId = '' } = useParams();
  const { user } = useAuth();
  const isHeadTeacher = user?.role === 'head_teacher';

  const grid = useScoreGridQuery(examId, { skip: examId === '' });
  const [save, saveState] = useSaveScoresMutation();
  const [setLock, lockState] = useSetExamLockMutation();

  const [edits, setEdits] = useState<Record<string, ScoreDraft>>({});
  const [correcting, setCorrecting] = useState<ScoreRow | null>(null);
  const [toast, setToast] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);

  const gridData = grid.data;
  const rows = gridData?.rows ?? [];
  const maxScore = gridData?.maxScore ?? 100;
  const isLocked = gridData?.isLocked ?? false;

  function draftOf(row: ScoreRow): ScoreDraft {
    return edits[row.enrollmentId] ?? { score: row.score != null ? String(row.score) : '', isAbsent: row.isAbsent };
  }
  function setScore(row: ScoreRow, value: string) {
    setEdits((prev) => ({ ...prev, [row.enrollmentId]: { ...draftOf(row), score: value } }));
  }
  function setAbsent(row: ScoreRow, absent: boolean) {
    setEdits((prev) => ({
      ...prev,
      [row.enrollmentId]: { score: absent ? '' : draftOf(row).score, isAbsent: absent },
    }));
  }

  const overMax = rows.some((row) => {
    const draft = draftOf(row);
    return !draft.isAbsent && draft.score !== '' && Number(draft.score) > maxScore;
  });

  async function saveAll() {
    const entries: ScoreEntry[] = rows.map((row) => {
      const draft = draftOf(row);
      return { enrollmentId: row.enrollmentId, score: toScore(draft), isAbsent: draft.isAbsent };
    });
    try {
      const result = await save({ examId, entries }).unwrap();
      setEdits({}); // The refetch is now the truth.
      setToast({ tone: 'success', message: t('scores.saved', { count: formatScore(result.saved) }) });
    } catch {
      setToast({ tone: 'danger', message: t('scores.saveError') });
    }
  }

  async function toggleLock() {
    try {
      await setLock({ examId, locked: !isLocked }).unwrap();
      setToast({ tone: 'success', message: t(isLocked ? 'scores.unlocked' : 'scores.lockedDone') });
    } catch {
      setToast({ tone: 'danger', message: t('scores.lockError') });
    }
  }

  if (grid.isLoading && !gridData) return <GridSkeleton />;
  if (grid.isError || !gridData) return <Alert tone="danger" title={t('scores.error')} />;

  const columns = buildColumns({ t, maxScore, isLocked, draftOf, setScore, setAbsent });

  // R8: once locked, correction is the only way to change a grade, and only the
  // head teacher may — offered as the row's action menu. A row with no stored
  // result has nothing to correct yet.
  const rowActions =
    isLocked && isHeadTeacher
      ? (row: ScoreRow): ActionItem[] =>
          row.resultId != null
            ? [{ key: 'correct', label: t('scores.correction.open'), icon: 'pencil', onSelect: () => setCorrecting(row) }]
            : []
      : undefined;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-ink-900">{gridData.subjectNameAr}</h2>

      <LockBanner
        locked={isLocked}
        action={
          <RoleGate role={user?.role ?? 'teacher'}>
            <Button
              variant={isLocked ? 'secondary' : 'primary'}
              size="sm"
              icon={isLocked ? 'lock-open' : 'lock'}
              loading={lockState.isLoading}
              onClick={toggleLock}
            >
              {t(isLocked ? 'scores.unlock' : 'scores.lock')}
            </Button>
          </RoleGate>
        }
      />

      <div className={grid.isFetching ? 'opacity-60 transition-opacity' : undefined} aria-busy={grid.isFetching}>
        <DataTable density="compact" columns={columns} rows={rows} getRowKey={(row) => row.enrollmentId} rowActions={rowActions} />
      </div>

      {!isLocked ? (
        <div className="flex items-center gap-3">
          <Button icon="check" onClick={saveAll} loading={saveState.isLoading} disabled={overMax}>
            {t('scores.saveAll')}
          </Button>
          {overMax ? (
            <span className="text-sm text-danger">{t('scores.overMax', { max: formatScore(maxScore) })}</span>
          ) : null}
        </div>
      ) : null}

      {correcting ? (
        <CorrectionDialog
          row={correcting}
          maxScore={maxScore}
          onClose={() => setCorrecting(null)}
          onSaved={(message) => {
            setCorrecting(null);
            setToast({ tone: 'success', message });
          }}
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

/** The grid's columns. Extracted so the page component stays readable: student,
 *  score, absent, and result. The head-teacher correction (when locked) is a
 *  row action on the table, not a column. */
function buildColumns(config: {
  t: (key: string, opts?: Record<string, unknown>) => string;
  maxScore: number;
  isLocked: boolean;
  draftOf: (row: ScoreRow) => ScoreDraft;
  setScore: (row: ScoreRow, value: string) => void;
  setAbsent: (row: ScoreRow, absent: boolean) => void;
}): Column<ScoreRow>[] {
  const { t, maxScore, isLocked, draftOf, setScore, setAbsent } = config;

  const columns: Column<ScoreRow>[] = [
    {
      key: 'student',
      header: t('scores.columns.student'),
      sticky: true,
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-ink-900">{row.studentName}</span>
          <span className="ef-num text-xs text-ink-400">{row.studentCode}</span>
        </div>
      ),
    },
    {
      key: 'score',
      header: t('scores.columns.score'),
      align: 'center',
      render: (row) => {
        const draft = draftOf(row);
        return (
          <ScoreInput
            value={draft.score}
            max={maxScore}
            absent={draft.isAbsent}
            locked={isLocked}
            onChange={isLocked ? undefined : (e) => setScore(row, e.target.value)}
            aria-label={t('scores.columns.score')}
          />
        );
      },
    },
    {
      key: 'absent',
      header: t('scores.columns.absent'),
      align: 'center',
      render: (row) => (
        <Checkbox
          checked={draftOf(row).isAbsent}
          disabled={isLocked}
          onChange={isLocked ? undefined : (e) => setAbsent(row, e.target.checked)}
          aria-label={t('scores.columns.absent')}
        />
      ),
    },
    {
      key: 'result',
      header: t('scores.columns.result'),
      align: 'center',
      render: (row) => <Badge tone={RESULT_TONE[row.result]}>{t(`scores.result.${row.result}`)}</Badge>,
    },
  ];

  return columns;
}

function GridSkeleton() {
  return (
    <div className="rounded-lg border border-subtle bg-surface p-4">
      <Skeleton rows={8} height={24} />
    </div>
  );
}
