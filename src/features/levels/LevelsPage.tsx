import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, DataTable, Toast, type Column } from '../../ds';
import { ListSkeleton } from '../../shared/react/PagedList';
import { useAuth } from '../auth';
import { useCurrentAcademicYearQuery } from '../../shared/api/calendar';
import { useLevelsQuery, type Level } from '../catalogue';
import { useProvisionSectionsMutation } from '../sections';

type ToastState = { tone: 'success' | 'danger'; message: string };

/** The level hub's front door: the six levels the institute teaches, each a
 *  destination that opens onto its roster, catalogue, class days, attendance and
 *  scores. It replaces the twelve-row (level×gender) section list — a level owns
 *  both cohorts, and the level page filters between them.
 *
 *  `linkTab` lets the Attendance and Scores nav entries reuse this same picker,
 *  each opening a level straight onto its own tab. */
export function LevelsPage({ linkTab }: { linkTab?: string } = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isHeadTeacher = user?.role === 'head_teacher';
  const levels = useLevelsQuery();
  const year = useCurrentAcademicYearQuery();
  const [provision, provisionState] = useProvisionSectionsMutation();
  const [toast, setToast] = useState<ToastState | null>(null);

  async function provisionYear() {
    if (year.data == null) return;
    try {
      const { created, total } = await provision({ academicYearId: year.data.id }).unwrap();
      setToast({
        tone: 'success',
        message: created === 0 ? t('sections.admin.provisionNone') : t('sections.admin.provisioned', { created, total }),
      });
    } catch {
      setToast({ tone: 'danger', message: t('sections.admin.provisionError') });
    }
  }

  if (levels.isLoading && !levels.data) return <ListSkeleton />;
  if (levels.isError || !levels.data) return <Alert tone="danger" title={t('levels.error')} />;

  // The picker order is the ladder order (PREP → COMP), which is `sort_order`.
  const rows = [...levels.data].sort((a, b) => a.sortOrder - b.sortOrder);

  const openLevel = (level: Level) =>
    navigate(linkTab ? `/levels/${level.id}?tab=${linkTab}` : `/levels/${level.id}`);

  const columns: Column<Level>[] = [
    { key: 'name', header: t('levels.columns.name'), sticky: true, render: (l) => l.nameAr },
    { key: 'code', header: t('levels.columns.code'), render: (l) => <span className="ef-num">{l.code}</span> },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-sm text-ink-500">{t('levels.caption')}</p>
        {isHeadTeacher ? (
          <Button
            size="sm"
            icon="plus"
            variant="secondary"
            onClick={provisionYear}
            loading={provisionState.isLoading}
            disabled={year.data == null}
          >
            {t('sections.admin.provision')}
          </Button>
        ) : null}
      </div>

      <DataTable columns={columns} rows={rows} getRowKey={(l) => l.id} onRowClick={openLevel} />

      {toast ? (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <Toast tone={toast.tone} message={toast.message} onDismiss={() => setToast(null)} />
        </div>
      ) : null}
    </section>
  );
}
