import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  CommitBar,
  DataTable,
  EmptyState,
  Field,
  Select,
  Toast,
  formatNumber,
  type ActionItem,
  type BadgeProps,
  type CommitCount,
  type Column,
  type SelectOption,
} from '../../ds';
import { ListSkeleton } from '../../shared/react/PagedList';
import { useAcademicYearsQuery, useCurrentAcademicYearQuery } from '../../shared/api/calendar';
import { useLevelsQuery } from '../catalogue';
import { useListSectionsQuery } from '../sections';
import { useListExamsQuery } from '../scores';
import { usePreviewPromotionMutation, useConfirmPromotionMutation } from './promotion.api';
import { PromotionDecisionDialog } from './PromotionDecisionDialog';
import type { PromotionDecision, PromotionRow } from './promotion.model';

const DECISION_TONE: Record<PromotionDecision, BadgeProps['tone']> = {
  promote: 'success',
  graduate: 'brand',
  promote_with_carry: 'warning',
  makeup_required: 'warning',
  repeat: 'neutral',
};

const COUNT_TONES: { decision: PromotionDecision; tone: CommitCount['tone'] }[] = [
  { decision: 'promote', tone: 'create' },
  { decision: 'graduate', tone: 'create' },
  { decision: 'promote_with_carry', tone: 'update' },
  { decision: 'makeup_required', tone: 'update' },
  { decision: 'repeat', tone: 'skip' },
];

/** Year-end promotion for the whole institute.
 *
 *  This was a tab inside each level, which meant closing a year was six separate
 *  runs with nothing showing how far through them you were — even though the API
 *  has always taken an optional `levelId` and will decide every level in one
 *  call. The level is a filter here, not the way in.
 *
 *  Three things the old screen left implicit are named choices now, because each
 *  silently changed what the run wrote:
 *
 *  - **Which round.** §4.3 decides differently before and after the makeup, and
 *    the round used to be an unlabelled checkbox. Picking the wrong one gives
 *    real students the wrong verdict, so it is a two-way choice that says which
 *    round it is, and changing it discards the preview rather than leaving rows
 *    from the other round on screen.
 *  - **Whether anyone moves.** An empty target-year dropdown quietly meant
 *    "record the decisions and move nobody". Recording and rolling forward are
 *    now separate, named outcomes.
 *  - **Whether the marks are final.** Unlocked marks can still change under a
 *    decision, so this blocks the run instead of warning about it — with a
 *    visible acknowledgement, since the head teacher owns the rules (§3). */
export function PromotionPage() {
  const { t } = useTranslation();
  const year = useCurrentAcademicYearQuery();
  const years = useAcademicYearsQuery();
  const levels = useLevelsQuery();

  const [afterMakeup, setAfterMakeup] = useState(false);
  /** Null runs every level, which is what closing a year means. */
  const [levelId, setLevelId] = useState<number | null>(null);
  const [movesForward, setMovesForward] = useState(false);
  const [targetYearId, setTargetYearId] = useState<number | null>(null);
  const [ignoreUnlockedMarks, setIgnoreUnlockedMarks] = useState(false);
  const [rows, setRows] = useState<PromotionRow[] | null>(null);
  const [toast, setToast] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);

  const [preview, previewState] = usePreviewPromotionMutation();
  const [confirm, confirmState] = useConfirmPromotionMutation();

  /* Readiness: promotion reads exam_results, so an unlocked exam is a mark that
     can still move under a decision already taken.
     ponytail: the exam list has no academic-year filter, so this counts unlocked
     exams across years. It over-reports rather than under-reports, and the
     acknowledgement is the escape hatch; add `academicYearId` to
     ListExamsQuerySchema if the noise becomes real. */
  const openExams = useListExamsQuery(levelId == null ? { isLocked: false } : { levelId, isLocked: false });
  const unlockedCount = openExams.data?.items.length ?? 0;
  const marksNotFinal = unlockedCount > 0 && !ignoreUnlockedMarks;

  /* Placement pre-flight: where do promoted students land? The next level by
     sort order, skipping a clean-entry level like COMP, which is elective and
     never reached automatically. A terminal level graduates, so it needs no
     forward section. */
  const sorted = [...(levels.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const nextLevels = sorted.filter((level) => !level.requiresCleanEntry);
  const targetSections = useListSectionsQuery(
    { academicYearId: targetYearId ?? 0, page: 1, pageSize: 100 },
    { skip: targetYearId == null },
  );
  const placementMissing =
    movesForward &&
    targetYearId != null &&
    nextLevels.length > 0 &&
    (targetSections.data?.items ?? []).length === 0;

  /** Any change to what the run would decide invalidates rows already on screen:
   *  confirming a preview taken under different settings would write verdicts
   *  nobody reviewed. */
  function resetPreview<T>(apply: (value: T) => void) {
    return (value: T) => {
      apply(value);
      setRows(null);
    };
  }

  const chooseRound = resetPreview(setAfterMakeup);
  const chooseLevel = resetPreview(setLevelId);

  const academicYearId = year.data?.id ?? 0;
  const scope = levelId == null ? { academicYearId, afterMakeup } : { academicYearId, afterMakeup, levelId };

  async function runPreview() {
    try {
      setRows(await preview(scope).unwrap());
    } catch {
      setToast({ tone: 'danger', message: t('promotion.previewError') });
    }
  }

  async function runConfirm(enrollmentIds: string[]) {
    try {
      const outcome = await confirm({
        ...scope,
        enrollmentIds,
        ...(movesForward && targetYearId != null ? { targetAcademicYearId: targetYearId } : {}),
      }).unwrap();
      setRows(null);
      setToast({
        tone: 'success',
        message: t('promotion.confirmed', {
          applied: formatNumber(outcome.applied),
          created: formatNumber(outcome.enrollmentsCreated),
          carries: formatNumber(outcome.carriesWritten),
          graduated: formatNumber(outcome.graduated),
        }),
      });
    } catch {
      setToast({ tone: 'danger', message: t('promotion.confirmError') });
    }
  }

  if (year.isLoading || levels.isLoading) return <ListSkeleton />;
  if (year.data == null) {
    return <EmptyState icon="calendar-days" title={t('promotion.noYear')} description={t('promotion.sequenceHint')} />;
  }

  const levelOptions: SelectOption[] = sorted.map((level) => ({ value: level.id, label: level.nameAr }));
  const yearOptions: SelectOption[] = (years.data ?? [])
    .filter((candidate) => candidate.id !== academicYearId)
    .map((candidate) => ({ value: candidate.id, label: t('promotion.yearLabel', { n: formatNumber(candidate.hijriYear) }) }));

  const targetMissing = movesForward && targetYearId == null;

  return (
    <section className="space-y-4">
      <p className="m-0 text-sm text-ink-500">
        {t('promotion.sourceYear', { n: formatNumber(year.data.hijriYear) })}
      </p>
      <Alert tone="info" title={t('promotion.sequenceHint')} />

      <div className="space-y-3">
        <ChoiceRow label={t('promotion.round.label')}>
          <Badge pressable active={!afterMakeup} onClick={() => chooseRound(false)}>
            {t('promotion.round.first')}
          </Badge>
          <Badge pressable active={afterMakeup} onClick={() => chooseRound(true)}>
            {t('promotion.round.makeup')}
          </Badge>
        </ChoiceRow>

        <ChoiceRow label={t('promotion.outcome.label')}>
          <Badge pressable active={!movesForward} onClick={() => setMovesForward(false)}>
            {t('promotion.outcome.record')}
          </Badge>
          <Badge pressable active={movesForward} onClick={() => setMovesForward(true)}>
            {t('promotion.outcome.rollover')}
          </Badge>
        </ChoiceRow>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <Field label={t('promotion.scope.label')}>
          <Select
            options={levelOptions}
            value={levelId ?? ''}
            onChange={(e) => chooseLevel(e.target.value ? Number(e.target.value) : null)}
            placeholder={t('promotion.scope.allLevels')}
            wrapperClassName="w-56"
          />
        </Field>

        {movesForward ? (
          <Field label={t('promotion.targetYear')} hint={t('promotion.targetHint')}>
            <Select
              options={yearOptions}
              value={targetYearId ?? ''}
              onChange={(e) => setTargetYearId(e.target.value ? Number(e.target.value) : null)}
              placeholder={t('promotion.scope.pickYear')}
              wrapperClassName="w-56"
            />
          </Field>
        ) : null}

        <Button
          icon="rotate-ccw"
          onClick={runPreview}
          loading={previewState.isLoading}
          disabled={marksNotFinal}
        >
          {t('promotion.preview')}
        </Button>
      </div>

      {unlockedCount > 0 ? (
        <Alert tone="warning" title={t('promotion.readinessGate', { count: formatNumber(unlockedCount) })}>
          <Checkbox
            label={t('promotion.readinessAck')}
            checked={ignoreUnlockedMarks}
            onChange={(e) => setIgnoreUnlockedMarks(e.target.checked)}
          />
        </Alert>
      ) : null}

      {placementMissing ? <Alert tone="warning" title={t('promotion.placementWarning')} /> : null}
      {!movesForward ? <Alert tone="info" title={t('promotion.recordOnly')} /> : null}

      {rows ? (
        <PreviewResult
          rows={rows}
          afterMakeup={afterMakeup}
          confirming={confirmState.isLoading}
          blockedReason={targetMissing ? t('promotion.targetRequired') : null}
          onConfirm={runConfirm}
          onOverridden={(message) => {
            setToast({ tone: 'success', message });
            void runPreview();
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

/** A labelled set of mutually exclusive choices, shaped like the cohort filter
 *  the rest of the product uses so the two read as the same kind of control. */
function ChoiceRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-ink-500">{label}</span>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {children}
      </div>
    </div>
  );
}

function PreviewResult({
  rows,
  afterMakeup,
  confirming,
  blockedReason,
  onConfirm,
  onOverridden,
}: {
  rows: PromotionRow[];
  afterMakeup: boolean;
  confirming: boolean;
  blockedReason: string | null;
  onConfirm: (enrollmentIds: string[]) => void;
  onOverridden: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<PromotionRow | null>(null);

  if (rows.length === 0) {
    return <EmptyState icon="users" title={t('promotion.empty.title')} description={t('promotion.empty.description')} />;
  }

  const confirmable = rows.filter((row) => row.blocker == null);
  const blockedCount = rows.length - confirmable.length;
  // Run progress: rows a prior confirm already applied vs. still pending.
  const appliedCount = rows.filter((row) => row.finalDecision != null).length;

  const counts: CommitCount[] = COUNT_TONES.map(({ decision, tone }) => ({
    label: t(`promotion.decision.${decision}`),
    value: formatNumber(rows.filter((row) => row.decision === decision).length),
    tone,
  })).concat(
    blockedCount > 0 ? [{ label: t('promotion.blocked'), value: formatNumber(blockedCount), tone: 'error' }] : [],
  );

  const columns: Column<PromotionRow>[] = [
    { key: 'student', header: t('promotion.columns.student'), render: (r) => r.studentName },
    { key: 'level', header: t('promotion.columns.level'), render: (r) => <span className="ef-num">{r.levelCode}</span> },
    {
      key: 'decision',
      header: t('promotion.columns.decision'),
      render: (r) => (
        <span className="inline-flex items-center gap-2">
          <Badge tone={DECISION_TONE[r.decision]}>{t(`promotion.decision.${r.decision}`)}</Badge>
          {r.override ? (
            <>
              <span className="text-xs text-ink-400 line-through">{t(`promotion.decision.${r.computedDecision}`)}</span>
              <Badge tone="warning">{t('promotion.override.badge')}</Badge>
            </>
          ) : null}
          {/* A row a prior confirm already wrote — so a re-run reads as progress. */}
          {r.finalDecision != null ? <Badge tone="neutral">{t('promotion.applied')}</Badge> : null}
        </span>
      ),
    },
    {
      key: 'failed',
      header: t('promotion.columns.failed'),
      render: (r) =>
        r.failedSubjects.length > 0 ? r.failedSubjects.map((s) => s.nameAr).join('، ') : <span className="text-ink-400">—</span>,
    },
    {
      key: 'carries',
      header: t('promotion.columns.carries'),
      render: (r) =>
        r.pendingCarries.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {r.pendingCarries.map((c) => (
              <Badge key={`${c.subjectId}:${c.originLevelCode}`} tone="warning">
                {c.nameAr} <span className="ef-num">({c.originLevelCode})</span>
              </Badge>
            ))}
          </span>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    {
      key: 'blocker',
      header: t('promotion.columns.blocker'),
      render: (r) => (r.blocker ? <span className="text-danger">{r.blocker}</span> : null),
    },
  ];

  const rowActions = (row: PromotionRow): ActionItem[] =>
    row.blocker
      ? []
      : [{ key: 'override', label: t('promotion.override.action'), icon: 'pencil', onSelect: () => setEditing(row) }];

  const note = blockedReason
    ?? (blockedCount > 0 ? t('promotion.blockedNote', { count: formatNumber(blockedCount) }) : t('promotion.confirmNote'));

  return (
    <div className="space-y-4">
      <p className="m-0 text-sm text-ink-500">
        {t('promotion.progress', { done: formatNumber(appliedCount), total: formatNumber(rows.length) })}
      </p>
      <DataTable
        density="compact"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.enrollmentId}
        rowTone={(r) => (r.blocker ? 'danger' : undefined)}
        rowActions={rowActions}
      />

      {editing ? (
        <PromotionDecisionDialog
          row={editing}
          afterMakeup={afterMakeup}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            onOverridden(message);
          }}
        />
      ) : null}
      <CommitBar
        counts={counts}
        note={note}
        confirmLabel={t('promotion.confirm')}
        disabled={confirmable.length === 0 || confirming || blockedReason != null}
        onConfirm={() => onConfirm(confirmable.map((row) => row.enrollmentId))}
      />
    </div>
  );
}
