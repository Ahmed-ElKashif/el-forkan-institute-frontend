import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  CommitBar,
  DataTable,
  IconButton,
  Pagination,
  Select,
  Skeleton,
  Toast,
  formatNumber,
  type BadgeProps,
  type CommitCount,
  type Column,
} from '../../ds';
import { DEFAULT_PAGE_SIZE, pageCount } from '../../shared/api/pagination';
import { useCommitImportMutation, useImportJobQuery, useImportRowsQuery } from './import.api';
import { FixRowDialog } from './FixRowDialog';
import type { ImportRow, RowAction } from './import.model';

const ACTION_TONE: Record<RowAction, BadgeProps['tone']> = {
  create: 'success',
  update: 'brand',
  skip: 'neutral',
  error: 'danger',
};

const FILTERS: (RowAction | 'all')[] = ['all', 'create', 'update', 'skip', 'error'];

/** Step two: the parsed rows, per §6.3 — every row shows create/update/skip/error,
 *  a reviewer fixes what the parser flagged, and the commit stays disabled while
 *  any error remains. Nothing is written until the commit. */
export function ImportPreview({ jobId, onReset }: { jobId: string; onReset: () => void }) {
  const { t } = useTranslation();
  const job = useImportJobQuery(jobId);
  const [commit, commitState] = useCommitImportMutation();
  const [toast, setToast] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);

  if (job.isLoading && !job.data) return <PreviewSkeleton />;
  if (job.isError || !job.data) return <Alert tone="danger" title={t('import.error')} />;

  if (job.data.status === 'committed') {
    return (
      <div className="space-y-4">
        <Alert tone="success" title={t('import.committed.title')}>
          {t('import.committed.detail', { count: formatNumber(job.data.okRows ?? 0) })}
        </Alert>
        <Button variant="secondary" icon="upload" onClick={onReset}>
          {t('import.committed.again')}
        </Button>
      </div>
    );
  }

  const counts = job.data.countsByAction;
  const errorCount = counts.error ?? 0;

  async function runCommit() {
    try {
      await commit(jobId).unwrap();
      setToast({ tone: 'success', message: t('import.commitDone') });
    } catch {
      setToast({ tone: 'danger', message: t('import.commitError') });
    }
  }

  const commitCounts: CommitCount[] = (['create', 'update', 'skip', 'error'] as const).map((action) => ({
    label: t(`import.action.${action}`),
    value: formatNumber(counts[action] ?? 0),
    tone: action,
  }));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink-900">{job.data.originalFilename ?? t('import.untitled')}</h2>
          <p className="ef-num text-sm text-ink-500">
            {t('import.rowsTotal', { count: formatNumber(job.data.totalRows ?? 0) })}
          </p>
        </div>
        <Button variant="ghost" icon="x" onClick={onReset}>
          {t('import.discard')}
        </Button>
      </header>

      <RowsTable jobId={jobId} onToast={setToast} />

      <CommitBar
        counts={commitCounts}
        note={errorCount > 0 ? t('import.commitBlocked') : t('import.commitNote')}
        confirmLabel={t('import.commit')}
        disabled={errorCount > 0 || commitState.isLoading}
        onConfirm={runCommit}
      />

      {toast ? (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <Toast tone={toast.tone} message={toast.message} onDismiss={() => setToast(null)} />
        </div>
      ) : null}
    </div>
  );
}

/** The rows list: filter by action, page server-side, and fix a row inline.
 *  Paginated by the API so a 100-row roster never renders as one long table. */
function RowsTable({
  jobId,
  onToast,
}: {
  jobId: string;
  onToast: (toast: { tone: 'success' | 'danger'; message: string }) => void;
}) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [page, setPage] = useState(1);
  const [fixing, setFixing] = useState<ImportRow | null>(null);

  const rowsQuery = useImportRowsQuery({ jobId, page, action: filter === 'all' ? undefined : filter });
  const list = rowsQuery.data;

  const columns: Column<ImportRow>[] = [
    { key: 'row', header: t('import.columns.row'), numeric: true, render: (r) => <span className="ef-num">{formatNumber(r.rowNumber)}</span> },
    { key: 'name', header: t('import.columns.name'), render: (r) => nameOf(r) ?? <span className="text-ink-400">—</span> },
    {
      key: 'action',
      header: t('import.columns.action'),
      render: (r) =>
        r.action ? <Badge tone={ACTION_TONE[r.action]}>{t(`import.action.${r.action}`)}</Badge> : <span className="text-ink-400">—</span>,
    },
    { key: 'error', header: t('import.columns.error'), render: (r) => (r.errorMessage ? <span className="text-danger">{r.errorMessage}</span> : null) },
    {
      key: 'fix',
      header: '',
      align: 'end',
      render: (r) => <IconButton icon="pencil" label={t('import.fix.open')} size="sm" onClick={() => setFixing(r)} />,
    },
  ];

  return (
    <section className="space-y-3">
      <Select
        aria-label={t('import.filterLabel')}
        options={FILTERS.map((value) => ({ value, label: t(`import.filter.${value}`) }))}
        value={filter}
        onChange={(e) => {
          setFilter(e.target.value as (typeof FILTERS)[number]);
          setPage(1);
        }}
        wrapperClassName="w-48"
      />

      {rowsQuery.isLoading && !list ? (
        <PreviewSkeleton />
      ) : rowsQuery.isError ? (
        <Alert tone="danger" title={t('import.error')} />
      ) : list && list.items.length > 0 ? (
        <div className={rowsQuery.isFetching ? 'opacity-60 transition-opacity' : undefined} aria-busy={rowsQuery.isFetching}>
          <DataTable
            density="compact"
            columns={columns}
            rows={list.items}
            getRowKey={(r) => r.id}
            rowTone={(r) => (r.action === 'error' ? 'danger' : undefined)}
          />
          <Pagination
            className="mt-4"
            page={page}
            pageCount={pageCount(list.total, DEFAULT_PAGE_SIZE)}
            total={list.total}
            onPage={setPage}
          />
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-ink-500">{t('import.noRows')}</p>
      )}

      {fixing ? (
        <FixRowDialog
          row={fixing}
          onClose={() => setFixing(null)}
          onSaved={(message) => {
            setFixing(null);
            onToast({ tone: 'success', message });
          }}
        />
      ) : null}
    </section>
  );
}

function nameOf(row: ImportRow): string | null {
  const fields = row.parsed ?? row.raw;
  return typeof fields.fullName === 'string' ? fields.fullName : null;
}

function PreviewSkeleton() {
  return (
    <div className="rounded-lg border border-subtle bg-surface p-4">
      <Skeleton rows={8} height={22} />
    </div>
  );
}
