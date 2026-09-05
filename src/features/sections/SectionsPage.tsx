import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, EmptyState, Icon, formatNumber, type BadgeProps, type Column } from '../../ds';
import { useCurrentAcademicYearQuery } from '../../shared/api/calendar';
import { PagedList, ListSkeleton } from '../../shared/react/PagedList';
import { useListSectionsQuery } from './sections.api';
import type { Section } from './section.model';

const GENDER_TONE: Record<string, BadgeProps['tone']> = {
  male: 'brand',
  female: 'neutral',
};

export interface SectionsPageProps {
  /** Where a row links to, e.g. `/attendance` or `/scores`; the section id is
   *  appended. This is what makes the picker serve both the attendance and the
   *  score flows. */
  basePath: string;
  /** i18n key for the "pick a section for X" caption above the list. */
  captionKey: string;
}

/** The section picker, shared by the attendance and score flows: pick a section,
 *  then act on it. Every section is per academic year, so the list is scoped to
 *  the current year; each row links to `${basePath}/:id`. Read-only — creating
 *  and editing sections belong to the foundation screens (F6). */
export function SectionsPage({ basePath, captionKey }: SectionsPageProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const year = useCurrentAcademicYearQuery();

  const query = useListSectionsQuery(
    { academicYearId: year.data?.id ?? 0, page },
    // Nothing to list until the year is known; asking with id 0 would return
    // an empty page at best.
    { skip: year.data == null },
  );
  const list = query.data;

  if (year.isLoading) return <ListSkeleton />;
  if (year.isError) return <Alert tone="danger" title={t('sections.error')} />;

  // The API answered, but the institute has no academic year yet — the same
  // honest empty state the dashboard shows, not an empty table.
  if (year.data == null) {
    return (
      <EmptyState
        icon="calendar-days"
        title={t('sections.noYear.title')}
        description={t('sections.noYear.description')}
      />
    );
  }

  const columns: Column<Section>[] = [
    {
      key: 'name',
      header: t('sections.columns.name'),
      render: (s) => (
        <Link
          to={`${basePath}/${s.id}`}
          className="inline-flex items-center gap-1 font-semibold text-brand-text hover:underline"
        >
          {s.name}
          <Icon name="chevron-left" size={14} mirror />
        </Link>
      ),
    },
    {
      key: 'gender',
      header: t('sections.columns.gender'),
      render: (s) => (
        <Badge tone={GENDER_TONE[s.gender] ?? 'neutral'}>{t(`sections.gender.${s.gender}`)}</Badge>
      ),
    },
    {
      key: 'enrolled',
      header: t('sections.columns.enrolled'),
      numeric: true,
      render: (s) => (
        <span className="ef-num">
          {formatNumber(s.enrolledCount)}
          {s.capacity != null ? ` / ${formatNumber(s.capacity)}` : ''}
        </span>
      ),
    },
    {
      key: 'teacher',
      header: t('sections.columns.teacher'),
      render: (s) => {
        const primary = s.teachers.find((teacher) => teacher.isPrimary) ?? s.teachers[0];
        return primary ? primary.fullName : <span className="text-ink-400">—</span>;
      },
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-ink-500">{t(captionKey)}</p>
        {list ? (
          <span className="whitespace-nowrap text-sm text-ink-500">
            {t('sections.total', { total: formatNumber(list.total) })}
          </span>
        ) : null}
      </div>

      <PagedList
        data={list}
        isLoading={query.isLoading}
        isError={query.isError}
        isFetching={query.isFetching}
        columns={columns}
        getRowKey={(s) => s.id}
        errorTitle={t('sections.error')}
        page={page}
        onPage={setPage}
        empty={
          <EmptyState
            icon="book-open"
            title={t('sections.empty.title')}
            description={t('sections.empty.description')}
          />
        }
      />
    </section>
  );
}
