import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  EmptyState,
  Skeleton,
  StatCard,
  Toast,
  formatNumber,
  type ActionItem,
  type BadgeProps,
  type Column,
} from '../../ds';
import { useAuth } from '../auth';
import { useScoreGridQuery } from '../scores';
import { EligibilityOverrideDialog } from './EligibilityOverrideDialog';
import { useComputeEligibilityMutation, useExamEligibilityQuery } from './eligibility.api';
import type { EligibilityFilter, EligibilityRow } from './eligibility.model';

/** Reason → chip tone. The attendance exclusion is the only red one; the rest
 *  are context for an eligible (or otherwise-held) student. */
const REASON_TONE: Record<string, NonNullable<BadgeProps['tone']>> = {
  low_attendance: 'danger',
  already_passed: 'neutral',
  not_in_scope: 'neutral',
  carrying_subjects: 'warning',
  clearing_for_comp: 'info',
  repeater: 'info',
  skipped_prep: 'info',
  new: 'brand',
};

type ToastState = { tone: 'success' | 'danger'; message: string };

/** The exam's eligible-students list (§4.6 — مستحقو الامتحانات): compute it from
 *  attendance (which persists it), review who is in and who was held out and
 *  why, then print. Open to both roles; only a head teacher may later override a
 *  verdict (a separate, gated action not on this screen). */
export function EligibilityPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { examId = '' } = useParams();

  const exam = useScoreGridQuery(examId, { skip: examId === '' });
  const list = useExamEligibilityQuery(examId, { skip: examId === '' });
  const [compute, computeState] = useComputeEligibilityMutation();

  const [filter, setFilter] = useState<EligibilityFilter>('all');
  const [toast, setToast] = useState<ToastState | null>(null);
  const { user } = useAuth();
  const isHead = user?.role === 'head_teacher';
  const [overriding, setOverriding] = useState<EligibilityRow | null>(null);

  async function runCompute() {
    try {
      const tally = await compute(examId).unwrap();
      setToast({
        tone: 'success',
        message: t('eligibility.computed', {
          eligible: formatNumber(tally.eligible),
          ineligible: formatNumber(tally.ineligible),
        }),
      });
    } catch {
      setToast({ tone: 'danger', message: t('eligibility.computeError') });
    }
  }

  const rows = list.data ?? [];
  const eligibleCount = rows.filter((row) => row.isEligible).length;
  const shown = rows.filter(
    (row) => filter === 'all' || (filter === 'eligible') === row.isEligible,
  );

  const columns: Column<EligibilityRow>[] = [
    { key: 'name', header: t('eligibility.columns.name'), sticky: true, render: (row) => row.studentName },
    { key: 'code', header: t('eligibility.columns.code'), numeric: true, render: (row) => row.studentCode },
    {
      key: 'status',
      header: t('eligibility.columns.status'),
      render: (row) => (
        <Badge tone={row.isEligible ? 'success' : 'danger'} icon={row.isEligible ? 'circle-check' : 'circle-x'}>
          {t(row.isEligible ? 'eligibility.eligible' : 'eligibility.ineligible')}
        </Badge>
      ),
    },
    {
      key: 'reason',
      header: t('eligibility.columns.reason'),
      render: (row) => (
        <span className="inline-flex items-center gap-2">
          <Badge tone={REASON_TONE[row.reasonCode] ?? 'neutral'}>
            {t(`eligibility.reason.${row.reasonCode}`)}
          </Badge>
          {row.overriddenBy ? (
            <span className="text-xs text-ink-500">{t('eligibility.overridden')}</span>
          ) : null}
        </span>
      ),
    },
  ];

  // Only the head teacher may override a verdict — so only they get a row menu.
  const rowActions = isHead
    ? (row: EligibilityRow): ActionItem[] => [
        { key: 'override', label: t('eligibility.override.action'), icon: 'pencil', onSelect: () => setOverriding(row) },
      ]
    : undefined;

  if (list.isLoading) return <ListSkeleton />;
  if (list.isError) return <Alert tone="danger" title={t('eligibility.error')} />;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink-900">{t('eligibility.title')}</h2>
          {exam.data?.subjectNameAr ? (
            <p className="m-0 text-sm text-ink-500">{exam.data.subjectNameAr}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon="rotate-ccw" onClick={runCompute} loading={computeState.isLoading}>
            {t(rows.length === 0 ? 'eligibility.compute' : 'eligibility.recompute')}
          </Button>
          {rows.length > 0 ? (
            <Button
              icon="printer"
              onClick={() =>
                navigate(`/exams/${examId}/eligibility/print`, {
                  state: { subjectNameAr: exam.data?.subjectNameAr },
                })
              }
            >
              {t('eligibility.print')}
            </Button>
          ) : null}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon="clipboard-list"
          title={t('eligibility.empty.title')}
          description={t('eligibility.empty.description')}
        />
      ) : (
        <>
          {/* The three tiles are the filter: click one to narrow the list, the
              active one stays highlighted. Fewer controls, and the count you act
              on is the control you press. */}
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              icon="users"
              label={t('eligibility.total')}
              value={formatNumber(rows.length)}
              interactive
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            />
            <StatCard
              icon="circle-check"
              label={t('eligibility.eligible')}
              value={formatNumber(eligibleCount)}
              interactive
              active={filter === 'eligible'}
              onClick={() => setFilter('eligible')}
            />
            <StatCard
              icon="circle-x"
              label={t('eligibility.ineligible')}
              value={formatNumber(rows.length - eligibleCount)}
              interactive
              active={filter === 'ineligible'}
              onClick={() => setFilter('ineligible')}
            />
          </div>

          <p className="m-0 text-sm text-ink-500">
            {t('eligibility.showing', { count: formatNumber(shown.length) })}
          </p>

          <DataTable columns={columns} rows={shown} getRowKey={(row) => row.id} rowActions={rowActions} />
        </>
      )}

      {overriding ? (
        <EligibilityOverrideDialog
          examId={examId}
          row={overriding}
          onClose={() => setOverriding(null)}
          onSaved={(message) => {
            setOverriding(null);
            setToast({ tone: 'success', message });
          }}
        />
      ) : null}

      {toast ? <Toast tone={toast.tone} message={toast.message} onDismiss={() => setToast(null)} /> : null}
    </section>
  );
}

function ListSkeleton() {
  return (
    <div className="rounded-lg border border-default bg-surface p-4">
      <Skeleton rows={8} height={22} />
    </div>
  );
}
