import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Dialog, EmptyState, SearchInput, type ActionItem, type Column } from '../../ds';
import { useDebouncedValue } from '../../shared/react/useDebouncedValue';
import { PagedList } from '../../shared/react/PagedList';
import { useAuditLogsQuery } from './audit.api';
import type { AuditLog } from './audit.model';

/** The audit log (head-teacher only, gated in the route table): who changed
 *  what, when. Read-only; each row opens its before/after snapshot. Filtered by
 *  entity type and server-paginated, since the log grows without bound. */
export function AuditPage() {
  const { t } = useTranslation();
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<AuditLog | null>(null);
  const entityType = useDebouncedValue(term.trim(), 300);

  const query = useAuditLogsQuery({ page, entityType });
  const list = query.data;

  function onFilter(next: string) {
    setTerm(next);
    setPage(1);
  }

  const columns: Column<AuditLog>[] = [
    { key: 'at', header: t('audit.columns.at'), render: (r) => <span className="ef-num">{formatAt(r.createdAt)}</span> },
    { key: 'actor', header: t('audit.columns.actor'), render: (r) => r.actorName ?? <span className="text-ink-400">—</span> },
    { key: 'action', header: t('audit.columns.action'), render: (r) => <Badge tone="neutral">{r.action}</Badge> },
    {
      key: 'entity',
      header: t('audit.columns.entity'),
      render: (r) => (
        <span>
          {r.entityType}
          {r.entityId ? <span className="ef-num text-ink-400"> · {r.entityId}</span> : null}
        </span>
      ),
    },
  ];

  const rowActions = (r: AuditLog): ActionItem[] => [
    { key: 'details', label: t('audit.details'), icon: 'scroll-text', onSelect: () => setViewing(r) },
  ];

  return (
    <section className="space-y-4">
      <SearchInput
        value={term}
        onChange={(e) => onFilter(e.target.value)}
        aria-label={t('audit.filterLabel')}
        placeholder={t('audit.filterPlaceholder')}
      />

      <PagedList
        data={list}
        isLoading={query.isLoading}
        isError={query.isError}
        isFetching={query.isFetching}
        columns={columns}
        getRowKey={(r) => r.id}
        errorTitle={t('audit.error')}
        density="compact"
        page={page}
        onPage={setPage}
        onRowClick={(r) => setViewing(r)}
        rowActions={rowActions}
        empty={
          <EmptyState
            icon="scroll-text"
            title={t(entityType !== '' ? 'audit.emptyFilter.title' : 'audit.empty.title')}
            description={t(entityType !== '' ? 'audit.emptyFilter.description' : 'audit.empty.description')}
          />
        }
      />

      {viewing ? <DetailsDialog log={viewing} onClose={() => setViewing(null)} /> : null}
    </section>
  );
}

function DetailsDialog({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog title={log.action} description={`${log.entityType}${log.entityId ? ` · ${log.entityId}` : ''}`} onClose={onClose} width={640}>
      <div className="grid gap-4">
        <Snapshot title={t('audit.before')} value={log.before} />
        <Snapshot title={t('audit.after')} value={log.after} />
      </div>
    </Dialog>
  );
}

/** A before/after JSON snapshot. Forced LTR: JSON keys and punctuation read
 *  left-to-right even in an RTL page. */
function Snapshot({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-ink-500">{title}</div>
      <pre dir="ltr" className="max-h-56 overflow-auto rounded-md border border-subtle bg-canvas p-3 text-start text-xs text-ink-700">
        {value == null ? '—' : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function formatAt(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ');
}
