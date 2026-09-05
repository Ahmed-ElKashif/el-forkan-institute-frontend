import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  Toast,
  formatNumber,
  type BadgeProps,
  type Column,
} from '../../ds';
import { PagedList } from '../../shared/react/PagedList';
import { useCurrentAcademicYearQuery } from '../../shared/api/calendar';
import { useLevelsQuery } from '../catalogue';
import { SectionFormDialog } from './SectionFormDialog';
import { SectionTeachersDialog } from './SectionTeachersDialog';
import { useListSectionsQuery } from './sections.api';
import type { Section } from './section.model';

const GENDER_TONE: Record<string, NonNullable<BadgeProps['tone']>> = {
  male: 'info',
  female: 'brand',
};

/** Section administration (head-teacher only): create sections, edit them, and
 *  manage which teachers each one holds. Distinct from the read-only pickers the
 *  attendance/score/timetable screens open. */
export function SectionsAdminPage() {
  const { t } = useTranslation();
  const year = useCurrentAcademicYearQuery();
  const yearId = year.data?.id ?? 0;
  const [page, setPage] = useState(1);
  const list = useListSectionsQuery({ academicYearId: yearId, page }, { skip: year.data == null });
  const levels = useLevelsQuery();

  const [form, setForm] = useState<Section | 'new' | null>(null);
  const [teachersFor, setTeachersFor] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (year.data == null && !year.isLoading) {
    return (
      <EmptyState
        icon="calendar-days"
        title={t('sections.admin.noYear.title')}
        description={t('sections.admin.noYear.description')}
      />
    );
  }

  const rows = list.data?.items ?? [];
  // Read the row the teachers dialog edits live from the list, so an assign or
  // unassign (which refetches the list) flows straight back into the dialog.
  const managing = teachersFor != null ? (rows.find((s) => s.id === teachersFor) ?? null) : null;

  const levelName = (levelId: number): string =>
    levels.data?.find((l) => l.id === levelId)?.nameAr ?? String(levelId);

  const columns: Column<Section>[] = [
    { key: 'name', header: t('sections.admin.columns.name'), sticky: true, render: (s) => s.name },
    { key: 'level', header: t('sections.admin.columns.level'), render: (s) => levelName(s.levelId) },
    {
      key: 'gender',
      header: t('sections.admin.columns.gender'),
      render: (s) => <Badge tone={GENDER_TONE[s.gender] ?? 'neutral'}>{t(`sections.gender.${s.gender}`)}</Badge>,
    },
    {
      key: 'enrolled',
      header: t('sections.admin.columns.enrolled'),
      numeric: true,
      render: (s) => (
        <span className="ef-num">
          {formatNumber(s.enrolledCount)}
          {s.capacity != null ? ` / ${formatNumber(s.capacity)}` : ''}
        </span>
      ),
    },
    {
      key: 'teachers',
      header: t('sections.admin.columns.teachers'),
      render: (s) => {
        const primary = s.teachers.find((teacher) => teacher.isPrimary) ?? s.teachers[0];
        if (!primary) return <span className="text-ink-400">—</span>;
        const extra = s.teachers.length - 1;
        return (
          <span>
            {primary.fullName}
            {extra > 0 ? <span className="text-ink-500"> +{formatNumber(extra)}</span> : null}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      render: (s) => (
        <span className="inline-flex gap-1">
          <IconButton icon="user" label={t('sections.admin.manageTeachers')} size="sm" onClick={() => setTeachersFor(s.id)} />
          <IconButton icon="pencil" label={t('sections.admin.edit')} size="sm" onClick={() => setForm(s)} />
        </span>
      ),
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-sm text-ink-500">{t('sections.admin.caption')}</p>
        <Button size="sm" icon="plus" onClick={() => setForm('new')} disabled={year.data == null}>
          {t('sections.admin.create')}
        </Button>
      </div>

      <PagedList
        data={list.data}
        isLoading={list.isLoading}
        isError={list.isError}
        isFetching={list.isFetching}
        columns={columns}
        getRowKey={(s) => s.id}
        errorTitle={t('sections.admin.error')}
        page={page}
        onPage={setPage}
        empty={
          <EmptyState
            icon="book-open"
            title={t('sections.admin.empty.title')}
            description={t('sections.admin.empty.description')}
          />
        }
      />

      {form !== null ? (
        <SectionFormDialog
          section={form === 'new' ? null : form}
          academicYearId={yearId}
          onClose={() => setForm(null)}
          onSaved={(message) => {
            setForm(null);
            setToast(message);
          }}
        />
      ) : null}

      {managing != null ? (
        <SectionTeachersDialog section={managing} onClose={() => setTeachersFor(null)} />
      ) : null}

      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
    </section>
  );
}
