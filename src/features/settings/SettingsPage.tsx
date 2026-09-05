import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  IconButton,
  Skeleton,
  Toast,
  formatNumber,
  type Column,
} from '../../ds';
import { useCurrentAcademicYearQuery } from '../../shared/api/calendar';
import { useLevelsQuery } from '../catalogue';
import { AttendancePolicyDialog } from './AttendancePolicyDialog';
import { useAttendancePoliciesQuery } from './settings.api';
import type { AttendancePolicy } from './settings.model';

/** Institute settings (head-teacher only). Today it holds the absence policies —
 *  the year default and any per-level overrides — which is what the exam
 *  eligibility screen reads to decide who is held out for attendance. */
export function SettingsPage() {
  const { t } = useTranslation();
  const year = useCurrentAcademicYearQuery();
  const yearId = year.data?.id ?? 0;
  const policies = useAttendancePoliciesQuery(yearId, { skip: year.data == null });
  const levels = useLevelsQuery();

  // null = closed · 'new' = add · a policy = edit that one.
  const [dialog, setDialog] = useState<AttendancePolicy | 'new' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (year.isLoading) return <ListSkeleton />;
  if (year.data == null) {
    return (
      <EmptyState
        icon="calendar-days"
        title={t('settings.noYear.title')}
        description={t('settings.noYear.description')}
      />
    );
  }

  const rows = policies.data ?? [];
  const coveredLevelIds = rows.filter((p) => p.levelId != null).map((p) => p.levelId as number);
  const hasDefault = rows.some((p) => p.levelId == null);
  const canAdd = !hasDefault || (levels.data ?? []).some((l) => !coveredLevelIds.includes(l.id));

  const levelName = (policy: AttendancePolicy): string =>
    policy.levelId == null
      ? t('settings.attendance.defaultLevel')
      : (levels.data?.find((l) => l.id === policy.levelId)?.nameAr ?? String(policy.levelId));

  const columns: Column<AttendancePolicy>[] = [
    { key: 'level', header: t('settings.attendance.level'), render: (p) => levelName(p) },
    { key: 'max', header: t('settings.attendance.maxAbsences'), numeric: true, render: (p) => formatNumber(p.maxAbsences) },
    { key: 'warn', header: t('settings.attendance.warnAt'), numeric: true, render: (p) => formatNumber(p.warnAtAbsences) },
    {
      key: 'action',
      header: t('settings.attendance.action'),
      render: (p) => (
        <Badge tone={p.exceedingAction === 'block_exam' ? 'danger' : 'warning'}>
          {t(`settings.attendance.actions.${p.exceedingAction}`)}
        </Badge>
      ),
    },
    {
      key: 'edit',
      header: '',
      align: 'end',
      render: (p) => (
        <IconButton icon="pencil" label={t('settings.attendance.edit')} size="sm" onClick={() => setDialog(p)} />
      ),
    },
  ];

  return (
    <section className="space-y-6">
      <Alert tone="info" title={t('settings.attendance.explainTitle')}>
        {t('settings.attendance.explainBody')}
      </Alert>

      <Card
        title={t('settings.attendance.title')}
        action={
          canAdd ? (
            <Button size="sm" variant="secondary" icon="plus" onClick={() => setDialog('new')}>
              {t('settings.attendance.add')}
            </Button>
          ) : null
        }
        bodyClassName="p-0"
      >
        {policies.isLoading ? (
          <div className="p-4">
            <Skeleton rows={4} height={22} />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon="clipboard-list"
              title={t('settings.attendance.empty.title')}
              description={t('settings.attendance.empty.description')}
            />
          </div>
        ) : (
          <DataTable columns={columns} rows={rows} getRowKey={(p) => p.id} className="border-0" />
        )}
      </Card>

      {dialog !== null ? (
        <AttendancePolicyDialog
          yearId={yearId}
          policy={dialog === 'new' ? null : dialog}
          levels={levels.data ?? []}
          coveredLevelIds={coveredLevelIds}
          hasDefault={hasDefault}
          onClose={() => setDialog(null)}
          onSaved={(message) => {
            setDialog(null);
            setToast(message);
          }}
        />
      ) : null}

      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
    </section>
  );
}

function ListSkeleton() {
  return (
    <div className="rounded-lg border border-default bg-surface p-4">
      <Skeleton rows={5} height={22} />
    </div>
  );
}
