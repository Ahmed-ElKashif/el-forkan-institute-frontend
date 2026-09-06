import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
  Badge,
  EmptyState,
  Toast,
  type ActionItem,
  type BadgeProps,
  type Column,
} from '../../ds';
import { PagedList } from '../../shared/react/PagedList';
import { useGetSectionQuery } from '../sections';
import { SessionEditDialog } from './SessionEditDialog';
import { useListSessionsQuery } from './sessions.api';
import type { Session } from './session.model';

const STATUS_TONE: Record<string, NonNullable<BadgeProps['tone']>> = {
  scheduled: 'info',
  held: 'success',
  cancelled: 'danger',
};

const HHMM = /(\d{2}:\d{2})/;
const hhmm = (value: string): string => HHMM.exec(value)?.[1] ?? value;

/** A section's sessions: reschedule or cancel any one. Reached from the
 *  attendance grid; both roles may edit (the writes are gated server-side, not
 *  by role). Cancelling here is what removes a day from the attendance grid. */
export function SessionsPage() {
  const { t } = useTranslation();
  const { sectionId = '' } = useParams();
  const section = useGetSectionQuery(sectionId, { skip: sectionId === '' });
  const [page, setPage] = useState(1);
  const list = useListSessionsQuery({ sectionId, page }, { skip: sectionId === '' });

  const [editing, setEditing] = useState<Session | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const columns: Column<Session>[] = [
    { key: 'date', header: t('sessions.columns.date'), numeric: true, render: (s) => s.sessionDate },
    {
      key: 'time',
      header: t('sessions.columns.time'),
      numeric: true,
      render: (s) => `${hhmm(s.startsAt)}–${hhmm(s.endsAt)}`,
    },
    { key: 'subject', header: t('sessions.columns.subject'), render: (s) => s.subjectNameAr },
    { key: 'mode', header: t('sessions.columns.mode'), render: (s) => t(`sessions.modes.${s.mode}`) },
    {
      key: 'status',
      header: t('sessions.columns.status'),
      render: (s) => (
        <Badge tone={STATUS_TONE[s.status] ?? 'neutral'}>{t(`sessions.status.${s.status}`)}</Badge>
      ),
    },
  ];

  const rowActions = (s: Session): ActionItem[] => [
    { key: 'edit', label: t('sessions.edit'), icon: 'pencil', onSelect: () => setEditing(s) },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-ink-900">{t('sessions.title')}</h2>
        {section.data?.name ? <p className="m-0 text-sm text-ink-500">{section.data.name}</p> : null}
      </div>

      <PagedList
        data={list.data}
        isLoading={list.isLoading}
        isError={list.isError}
        isFetching={list.isFetching}
        columns={columns}
        getRowKey={(s) => s.id}
        errorTitle={t('sessions.error')}
        page={page}
        onPage={setPage}
        onRowClick={(s) => setEditing(s)}
        rowActions={rowActions}
        empty={
          <EmptyState
            icon="calendar-days"
            title={t('sessions.empty.title')}
            description={t('sessions.empty.description')}
          />
        }
      />

      {editing ? (
        <SessionEditDialog
          session={editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            setToast(message);
          }}
        />
      ) : null}

      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
    </section>
  );
}
