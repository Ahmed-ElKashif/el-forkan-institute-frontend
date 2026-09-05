import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  EmptyState,
  Icon,
  Toast,
  formatNumber,
  type Column,
} from '../../ds';
import { useAuth } from '../auth';
import { useGetSectionQuery } from '../sections';
import { useComputeTermResultsMutation, useFinalizeTermResultsMutation } from './termresults.api';
import type { TermResult } from './termresults.model';

type ToastState = { tone: 'success' | 'danger'; message: string };

/** A section+term's results (§4): compute the standing from the entered scores,
 *  review each student's totals and how many subjects they failed, then — head
 *  teacher only — finalize to lock the term. `compute` also stores the standing,
 *  so recomputing after more scores are entered is safe. */
export function TermResultsPage() {
  const { t } = useTranslation();
  const { sectionId = '', termId = '' } = useParams();
  const section = useGetSectionQuery(sectionId, { skip: sectionId === '' });
  const { user } = useAuth();
  const isHead = user?.role === 'head_teacher';

  const [compute, computeState] = useComputeTermResultsMutation();
  const [finalize, finalizeState] = useFinalizeTermResultsMutation();
  const [rows, setRows] = useState<TermResult[] | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const args = { sectionId, termId: Number(termId) };

  async function run(kind: 'compute' | 'finalize') {
    try {
      const data = kind === 'compute' ? await compute(args).unwrap() : await finalize(args).unwrap();
      setRows(data);
      if (kind === 'finalize') setToast({ tone: 'success', message: t('termresults.finalized') });
    } catch (cause) {
      const detail = (cause as { detail?: string })?.detail;
      setToast({ tone: 'danger', message: detail ?? t('termresults.error') });
    }
  }

  const isFinalized = (rows ?? []).some((r) => r.finalizedAt != null);

  const columns: Column<TermResult>[] = [
    { key: 'student', header: t('termresults.columns.student'), sticky: true, render: (r) => r.studentName },
    {
      key: 'total',
      header: t('termresults.columns.total'),
      numeric: true,
      render: (r) =>
        r.totalScore != null && r.maxTotal != null
          ? `${formatNumber(r.totalScore)} / ${formatNumber(r.maxTotal)}`
          : '—',
    },
    {
      key: 'percentage',
      header: t('termresults.columns.percentage'),
      numeric: true,
      render: (r) => (r.percentage != null ? `${formatNumber(Math.round(r.percentage))}%` : '—'),
    },
    {
      key: 'failed',
      header: t('termresults.columns.failed'),
      numeric: true,
      render: (r) => (
        <span className={r.mandatoryFailed > 0 ? 'font-semibold text-danger' : undefined}>
          {formatNumber(r.subjectsFailed)}
          {r.mandatoryFailed > 0 ? ` (${formatNumber(r.mandatoryFailed)} ${t('termresults.mandatory')})` : ''}
        </span>
      ),
    },
    {
      key: 'result',
      header: t('termresults.columns.result'),
      render: (r) => (
        <Badge tone={r.subjectsFailed === 0 ? 'success' : 'danger'}>
          {t(`termresults.result.${r.result}`, { defaultValue: r.result })}
        </Badge>
      ),
    },
    {
      key: 'finalized',
      header: t('termresults.columns.finalized'),
      align: 'center',
      render: (r) =>
        r.finalizedAt != null ? (
          <Icon name="circle-check" size={16} className="mx-auto text-success" />
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink-900">{t('termresults.title')}</h2>
          {section.data?.name ? <p className="m-0 text-sm text-ink-500">{section.data.name}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon="rotate-ccw" onClick={() => run('compute')} loading={computeState.isLoading}>
            {t(rows == null ? 'termresults.compute' : 'termresults.recompute')}
          </Button>
          {isHead && rows != null && rows.length > 0 ? (
            <Button icon="lock" onClick={() => run('finalize')} loading={finalizeState.isLoading} disabled={isFinalized}>
              {t(isFinalized ? 'termresults.finalizedDone' : 'termresults.finalize')}
            </Button>
          ) : null}
        </div>
      </div>

      {isFinalized ? <Alert tone="info" title={t('termresults.lockedNote')} /> : null}

      {rows == null ? (
        <EmptyState
          icon="clipboard-list"
          title={t('termresults.empty.title')}
          description={t('termresults.empty.description')}
        />
      ) : rows.length === 0 ? (
        <EmptyState icon="users" title={t('termresults.noStudents.title')} description={t('termresults.noStudents.description')} />
      ) : (
        <DataTable columns={columns} rows={rows} getRowKey={(r) => r.enrollmentId} />
      )}

      {toast ? <Toast tone={toast.tone} message={toast.message} onDismiss={() => setToast(null)} /> : null}
    </section>
  );
}
