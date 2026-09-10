import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  CommitBar,
  DataTable,
  type ActionItem,
  EmptyState,
  Field,
  Select,
  Toast,
  formatNumber,
  type BadgeProps,
  type CommitCount,
  type Column,
  type SelectOption,
} from '../../ds';
import { useCurrentAcademicYearQuery, useAcademicYearsQuery } from '../../shared/api/calendar';
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

// The order the counts appear on the commit rail, with a colour role each.
const COUNT_TONES: { decision: PromotionDecision; tone: CommitCount['tone'] }[] = [
  { decision: 'promote', tone: 'create' },
  { decision: 'graduate', tone: 'create' },
  { decision: 'promote_with_carry', tone: 'update' },
  { decision: 'makeup_required', tone: 'update' },
  { decision: 'repeat', tone: 'skip' },
];

/** Year-end promotion: preview §4.3's decision for every enrolment, edit any of
 *  them with a reason, then confirm exactly those rows.
 *
 *  Open to both roles, scoped rather than restricted — a teacher sees and
 *  decides their own classes, a head teacher the whole branch. The preview
 *  writes nothing; the confirm is the only write, and a blocked row is never
 *  included in it. */
export function PromotionPage() {
  const { t } = useTranslation();
  const year = useCurrentAcademicYearQuery();
  const years = useAcademicYearsQuery();

  const [afterMakeup, setAfterMakeup] = useState(false);
  const [targetYearId, setTargetYearId] = useState<number | null>(null);
  const [rows, setRows] = useState<PromotionRow[] | null>(null);
  const [toast, setToast] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);

  const [preview, previewState] = usePreviewPromotionMutation();
  const [confirm, confirmState] = useConfirmPromotionMutation();

  const academicYearId = year.data?.id ?? null;

  async function runPreview() {
    if (academicYearId == null) return;
    try {
      const result = await preview({ academicYearId, afterMakeup }).unwrap();
      setRows(result);
    } catch {
      setToast({ tone: 'danger', message: t('promotion.previewError') });
    }
  }

  async function runConfirm(enrollmentIds: string[]) {
    if (academicYearId == null) return;
    try {
      const result = await confirm({
        academicYearId,
        afterMakeup,
        enrollmentIds,
        targetAcademicYearId: targetYearId ?? undefined,
      }).unwrap();
      setRows(null);
      setToast({
        tone: 'success',
        message: t('promotion.confirmed', {
          applied: formatNumber(result.applied),
          created: formatNumber(result.enrollmentsCreated),
          carries: formatNumber(result.carriesWritten),
        }),
      });
    } catch {
      setToast({ tone: 'danger', message: t('promotion.confirmError') });
    }
  }

  const yearOptions: SelectOption[] = (years.data ?? []).map((y) => ({
    value: y.id,
    label: t('promotion.yearLabel', { n: formatNumber(y.hijriYear) }),
  }));

  return (
    <section className="space-y-4">
      {year.data == null && !year.isLoading ? (
        <Alert tone="warning" title={t('promotion.noYear')} />
      ) : (
        <div className="flex flex-wrap items-end gap-4">
          <p className="text-sm text-ink-500">
            {year.data ? t('promotion.sourceYear', { n: formatNumber(year.data.hijriYear) }) : ''}
          </p>
          <Checkbox label={t('promotion.afterMakeup')} checked={afterMakeup} onChange={(e) => setAfterMakeup(e.target.checked)} />
          <Field label={t('promotion.targetYear')} hint={t('promotion.targetHint')}>
            <Select
              options={yearOptions}
              value={targetYearId ?? ''}
              onChange={(e) => setTargetYearId(e.target.value ? Number(e.target.value) : null)}
              placeholder={t('promotion.targetNone')}
              wrapperClassName="w-56"
            />
          </Field>
          <Button icon="rotate-ccw" onClick={runPreview} loading={previewState.isLoading} disabled={academicYearId == null}>
            {t('promotion.preview')}
          </Button>
        </div>
      )}

      {rows ? (
        <PreviewResult
          rows={rows}
          afterMakeup={afterMakeup}
          confirming={confirmState.isLoading}
          onConfirm={runConfirm}
          /* Re-run the preview rather than patching the row in place: the
             override is persisted server-side, and re-reading is what proves it
             will survive the replay `confirm` performs. */
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

function PreviewResult({
  rows,
  afterMakeup,
  confirming,
  onConfirm,
  onOverridden,
}: {
  rows: PromotionRow[];
  afterMakeup: boolean;
  confirming: boolean;
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

  const counts: CommitCount[] = COUNT_TONES.map(({ decision, tone }) => ({
    label: t(`promotion.decision.${decision}`),
    value: formatNumber(rows.filter((row) => row.decision === decision).length),
    tone,
  })).concat(
    blockedCount > 0 ? [{ label: t('promotion.blocked'), value: formatNumber(blockedCount), tone: 'error' }] : [],
  );

  const columns: Column<PromotionRow>[] = [
    { key: 'student', header: t('promotion.columns.student'), render: (r) => r.studentName },
    { key: 'level', header: t('promotion.columns.level'), render: (r) => r.levelCode },
    {
      key: 'decision',
      header: t('promotion.columns.decision'),
      /* An override shows what it replaced, struck through. Hiding the engine's
         verdict would leave nobody able to tell a considered disagreement from
         a mis-click. */
      render: (r) => (
        <span className="inline-flex items-center gap-2">
          <Badge tone={DECISION_TONE[r.decision]}>{t(`promotion.decision.${r.decision}`)}</Badge>
          {r.override ? (
            <>
              <span className="text-xs text-ink-400 line-through">
                {t(`promotion.decision.${r.computedDecision}`)}
              </span>
              <Badge tone="warning">{t('promotion.override.badge')}</Badge>
            </>
          ) : null}
        </span>
      ),
    },
    {
      key: 'failed',
      header: t('promotion.columns.failed'),
      render: (r) =>
        r.failedSubjects.length > 0 ? (
          r.failedSubjects.map((s) => s.nameAr).join('، ')
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

  /* A blocked row gets no menu: `confirm` refuses it outright, so offering a
     decision the run will not honour would be a lie. */
  const rowActions = (row: PromotionRow): ActionItem[] =>
    row.blocker
      ? []
      : [
          {
            key: 'override',
            label: t('promotion.override.action'),
            icon: 'pencil',
            onSelect: () => setEditing(row),
          },
        ];

  return (
    <div className="space-y-4">
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
        note={blockedCount > 0 ? t('promotion.blockedNote', { count: formatNumber(blockedCount) }) : t('promotion.confirmNote')}
        confirmLabel={t('promotion.confirm')}
        disabled={confirmable.length === 0 || confirming}
        onConfirm={() => onConfirm(confirmable.map((row) => row.enrollmentId))}
      />
    </div>
  );
}
