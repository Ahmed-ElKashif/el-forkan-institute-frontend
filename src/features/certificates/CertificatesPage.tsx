import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Skeleton,
  Tabs,
  Toast,
  type ActionItem,
  type Column,
  type TabItem,
} from '../../ds';
import {
  useCertifiableQuery,
  useCertificatesQuery,
  useIssueCertificateMutation,
  useReprintCertificateMutation,
  useRevokeCertificateMutation,
} from './certificates.api';
import type { Certificate, CertifiableStudent } from './certificate.model';

type TabKey = 'certifiable' | 'issued';
type ToastState = { tone: 'success' | 'danger'; message: string };

/** Certificates (head-teacher only, gated in the route table). Two tabs: the
 *  students ready to certify, and the certificates already issued — where each
 *  can be printed (a recorded reprint) or revoked with a reason. */
export function CertificatesPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('certifiable');
  const [toast, setToast] = useState<ToastState | null>(null);

  const certifiable = useCertifiableQuery();
  const certificates = useCertificatesQuery();

  const tabs: TabItem[] = [
    { key: 'certifiable', label: t('certificates.tabs.certifiable'), count: certifiable.data?.length },
    { key: 'issued', label: t('certificates.tabs.issued'), count: certificates.data?.length },
  ];

  return (
    <section className="space-y-4">
      <Tabs items={tabs} active={tab} onSelect={(key) => setTab(key as TabKey)} />

      {tab === 'certifiable' ? (
        <CertifiableTab
          rows={certifiable.data}
          isLoading={certifiable.isLoading}
          isError={certifiable.isError}
          onToast={setToast}
        />
      ) : (
        <IssuedTab
          rows={certificates.data}
          isLoading={certificates.isLoading}
          isError={certificates.isError}
          onToast={setToast}
        />
      )}

      {toast ? (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <Toast tone={toast.tone} message={toast.message} onDismiss={() => setToast(null)} />
        </div>
      ) : null}
    </section>
  );
}

function CertifiableTab({
  rows,
  isLoading,
  isError,
  onToast,
}: {
  rows: CertifiableStudent[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onToast: (toast: ToastState) => void;
}) {
  const { t } = useTranslation();
  const [issue, issueState] = useIssueCertificateMutation();
  const [issuing, setIssuing] = useState<CertifiableStudent | null>(null);

  async function confirmIssue() {
    if (issuing == null) return;
    try {
      const certificate = await issue({
        studentId: issuing.studentId,
        levelId: issuing.levelId,
        enrollmentId: issuing.enrollmentId,
      }).unwrap();
      setIssuing(null);
      onToast({ tone: 'success', message: t('certificates.issued', { serial: certificate.serialNo ?? '' }) });
    } catch {
      onToast({ tone: 'danger', message: t('certificates.issueError') });
    }
  }

  const columns: Column<CertifiableStudent>[] = [
    { key: 'name', header: t('certificates.columns.student'), render: (r) => r.studentName },
    { key: 'level', header: t('certificates.columns.level'), render: (r) => r.levelCode },
    {
      key: 'action',
      header: '',
      align: 'end',
      render: (r) => (
        <Button variant="secondary" size="sm" icon="award" onClick={() => setIssuing(r)}>
          {t('certificates.issue')}
        </Button>
      ),
    },
  ];

  return (
    <>
      <ListBody
        rows={rows}
        isLoading={isLoading}
        isError={isError}
        columns={columns}
        getRowKey={(r) => r.enrollmentId}
        emptyIcon="graduation-cap"
        emptyTitle={t('certificates.emptyCertifiable.title')}
        emptyDescription={t('certificates.emptyCertifiable.description')}
      />

      {issuing ? (
        <ConfirmDialog
          title={t('certificates.confirmIssue.title')}
          consequence={t('certificates.confirmIssue.consequence', {
            name: issuing.studentName,
            level: issuing.levelCode,
          })}
          confirmLabel={t('certificates.issue')}
          onConfirm={confirmIssue}
          onCancel={() => setIssuing(null)}
        />
      ) : null}
      {issueState.isLoading ? <BusyOverlay /> : null}
    </>
  );
}

function IssuedTab({
  rows,
  isLoading,
  isError,
  onToast,
}: {
  rows: Certificate[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onToast: (toast: ToastState) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [reprint, reprintState] = useReprintCertificateMutation();
  const [revoke] = useRevokeCertificateMutation();
  const [revoking, setRevoking] = useState<Certificate | null>(null);
  const [reason, setReason] = useState('');

  // Printing is a recorded reprint (R19): fetch the payload, then hand it to the
  // print page through navigation state so that page performs no write itself.
  async function printCertificate(certificate: Certificate) {
    try {
      const payload = await reprint(certificate.id).unwrap();
      navigate(`/certificates/${certificate.id}/print`, { state: payload });
    } catch {
      onToast({ tone: 'danger', message: t('certificates.printError') });
    }
  }

  async function confirmRevoke() {
    if (revoking == null) return;
    try {
      await revoke({ id: revoking.id, reason: reason.trim() }).unwrap();
      setRevoking(null);
      setReason('');
      onToast({ tone: 'success', message: t('certificates.revoked') });
    } catch {
      onToast({ tone: 'danger', message: t('certificates.revokeError') });
    }
  }

  const columns: Column<Certificate>[] = [
    {
      key: 'serial',
      header: t('certificates.columns.serial'),
      render: (r) => <span className="ef-num">{r.serialNo ?? '—'}</span>,
    },
    { key: 'name', header: t('certificates.columns.student'), render: (r) => r.studentName },
    { key: 'level', header: t('certificates.columns.level'), render: (r) => r.levelCode },
    {
      key: 'status',
      header: t('certificates.columns.status'),
      render: (r) =>
        r.revokedAt ? (
          <Badge tone="danger">{t('certificates.status.revoked')}</Badge>
        ) : (
          <Badge tone="success">{t('certificates.status.valid')}</Badge>
        ),
    },
  ];

  const rowActions = (r: Certificate): ActionItem[] =>
    r.revokedAt
      ? []
      : [
          { key: 'print', label: t('certificates.print'), icon: 'printer', onSelect: () => printCertificate(r) },
          { key: 'revoke', label: t('certificates.revoke'), icon: 'trash', tone: 'danger', onSelect: () => setRevoking(r) },
        ];

  return (
    <>
      <ListBody
        rows={rows}
        isLoading={isLoading}
        isError={isError}
        columns={columns}
        getRowKey={(r) => r.id}
        rowActions={rowActions}
        emptyIcon="award"
        emptyTitle={t('certificates.emptyIssued.title')}
        emptyDescription={t('certificates.emptyIssued.description')}
      />

      {revoking ? (
        <ConfirmDialog
          tone="danger"
          title={t('certificates.confirmRevoke.title')}
          consequence={t('certificates.confirmRevoke.consequence', { name: revoking.studentName })}
          confirmLabel={t('certificates.revoke')}
          requireReason
          reason={reason}
          onReasonChange={setReason}
          onConfirm={confirmRevoke}
          onCancel={() => {
            setRevoking(null);
            setReason('');
          }}
        />
      ) : null}
      {reprintState.isLoading ? <BusyOverlay /> : null}
    </>
  );
}

interface ListBodyProps<T> {
  rows: T[] | undefined;
  isLoading: boolean;
  isError: boolean;
  columns: Column<T>[];
  getRowKey: (row: T) => string;
  rowActions?: (row: T) => ActionItem[];
  emptyIcon: 'award' | 'graduation-cap';
  emptyTitle: string;
  emptyDescription: string;
}

function ListBody<T>({
  rows,
  isLoading,
  isError,
  columns,
  getRowKey,
  rowActions,
  emptyIcon,
  emptyTitle,
  emptyDescription,
}: ListBodyProps<T>) {
  const { t } = useTranslation();
  if (isLoading && !rows) return <TableSkeleton />;
  if (isError && !rows) return <Alert tone="danger" title={t('certificates.error')} />;
  if (!rows) return null;
  if (rows.length === 0) return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />;
  return <DataTable columns={columns} rows={rows} getRowKey={getRowKey} rowActions={rowActions} />;
}

function TableSkeleton() {
  return (
    <div className="rounded-lg border border-subtle bg-surface p-4">
      <Skeleton rows={6} height={22} />
    </div>
  );
}

/** A non-blocking hint that a write is in flight; the dialog has already closed
 *  optimistically on click, so this reassures without trapping the page. */
function BusyOverlay() {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <Toast tone="info" message={t('certificates.working')} />
    </div>
  );
}
