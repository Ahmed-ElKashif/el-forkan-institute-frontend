import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Dialog, EmptyState, Field, Select, type ActionItem, type Column } from '../../ds';
import { PagedList } from '../../shared/react/PagedList';
import { useAuditLogsQuery } from './audit.api';
import {
  ENTITY_TYPES,
  actionLabel,
  entityLabel,
  fieldLabel,
  snapshotFields,
  type SnapshotField,
} from './audit.labels';
import type { AuditLog } from './audit.model';

/** The audit log (head-teacher only, gated in the route table): who changed
 *  what, when. Read-only; each row opens its before/after snapshot.
 *
 *  Everything the API writes is English — the action, the record kind, the field
 *  names inside a snapshot — so the screen translates all three rather than
 *  printing them (`audit.labels`). The filter is a list of record kinds for the
 *  same reason: it used to be a text box whose own placeholder told an Arabic
 *  head teacher to type «student». */
export function AuditPage() {
  const { t } = useTranslation();
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<AuditLog | null>(null);

  const query = useAuditLogsQuery({ page, entityType });

  const columns: Column<AuditLog>[] = [
    { key: 'at', header: t('audit.columns.at'), render: (r) => <span className="ef-num">{formatAt(r.createdAt)}</span> },
    { key: 'actor', header: t('audit.columns.actor'), render: (r) => r.actorName ?? <span className="text-ink-400">—</span> },
    { key: 'action', header: t('audit.columns.action'), render: (r) => <Badge tone="neutral">{actionLabel(t, r.action)}</Badge> },
    {
      key: 'entity',
      header: t('audit.columns.entity'),
      render: (r) => (
        <span>
          {entityLabel(t, r.entityType)}
          {/* The id stays as it is: it is a reference to quote, not a word. */}
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
      <Field label={t('audit.filterLabel')} className="w-72">
        <Select
          options={ENTITY_TYPES.map((type) => ({ value: type, label: entityLabel(t, type) }))}
          placeholder={t('audit.allEntities')}
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
          aria-label={t('audit.filterLabel')}
        />
      </Field>

      <PagedList
        data={query.data}
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
  const fields = snapshotFields(log.before, log.after);
  const isEdit = log.before != null && log.after != null;

  return (
    <Dialog
      title={actionLabel(t, log.action)}
      description={`${entityLabel(t, log.entityType)}${log.entityId ? ` · ${log.entityId}` : ''}`}
      onClose={onClose}
      width={640}
    >
      {fields.length === 0 ? (
        <p className="m-0 py-6 text-center text-sm text-ink-500">{t('audit.noSnapshot')}</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-subtle text-xs text-ink-500">
              <th className="py-2 text-start font-semibold">{t('audit.columns.field')}</th>
              {isEdit ? <th className="py-2 text-start font-semibold">{t('audit.before')}</th> : null}
              <th className="py-2 text-start font-semibold">{t(isEdit ? 'audit.after' : 'audit.value')}</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((row) => (
              <FieldRow key={row.field} row={row} isEdit={isEdit} />
            ))}
          </tbody>
        </table>
      )}
    </Dialog>
  );
}

function FieldRow({ row, isEdit }: { row: SnapshotField; isEdit: boolean }) {
  const { t } = useTranslation();
  return (
    <tr className="border-b border-subtle last:border-b-0">
      <td className="py-2 pe-3 align-top text-ink-600">{fieldLabel(t, row.field)}</td>
      {isEdit ? (
        <td className="py-2 pe-3 align-top text-ink-500">
          <Value value={row.before} />
        </td>
      ) : null}
      <td className={`py-2 align-top ${row.changed ? 'font-semibold text-ink-900' : 'text-ink-700'}`}>
        <Value value={isEdit ? row.after : (row.after ?? row.before)} />
      </td>
    </tr>
  );
}

/** One snapshot value.
 *
 *  Booleans become «نعم / لا» because `true` is not Arabic; a nested object or
 *  list keeps its JSON and is forced LTR, since its keys and punctuation read
 *  left-to-right whatever the page direction. */
function Value({ value }: { value: unknown }) {
  const { t } = useTranslation();

  if (value === null || value === undefined) return <span className="text-ink-400">—</span>;
  if (typeof value === 'boolean') return <span>{t(value ? 'audit.yes' : 'audit.no')}</span>;
  if (typeof value === 'number') return <span className="ef-num">{value}</span>;
  if (typeof value === 'string') {
    return value.trim() === '' ? <span className="text-ink-400">—</span> : <span>{value}</span>;
  }

  return (
    <code dir="ltr" className="block max-h-32 overflow-auto whitespace-pre-wrap text-start text-xs text-ink-600">
      {JSON.stringify(value, null, 2)}
    </code>
  );
}

function formatAt(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ');
}
