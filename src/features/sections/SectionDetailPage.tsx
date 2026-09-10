import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  Tabs,
  type Column,
  type TabItem,
} from '../../ds';
import { ListSkeleton, PagedList } from '../../shared/react/PagedList';
import { useTabParam } from '../../shared/react/useTabParam';
import { SectionTimetableTab } from '../timetable';
import { SectionTeachersDialog } from './SectionTeachersDialog';
import { useGetSectionQuery, useListEnrollmentsQuery } from './sections.api';
import type { Enrollment, SectionDetail } from './section.model';

const TAB_KEYS = ['roster', 'timetable', 'teachers'] as const;
type TabKey = (typeof TAB_KEYS)[number];

/** One class, and everything that belongs to it.
 *
 *  A level holds a single class per gender (R1 × R3), so a class is a real
 *  destination rather than a row in a list: its roster, its weekly timetable and
 *  its teachers are three views of the same thing and belong on one screen. The
 *  separate `/timetable` picker this replaced asked the head teacher to choose
 *  the same class twice.
 *
 *  The active tab lives in `?tab=` so the retired `/timetable/:id` links can
 *  redirect straight to the timetable. */
export function SectionDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const [tab, setTab] = useTabParam<TabKey>(TAB_KEYS, 'roster');
  const section = useGetSectionQuery(id, { skip: id === '' });

  if (section.isLoading && !section.data) return <ListSkeleton />;
  if (section.isError || !section.data) {
    return (
      <EmptyState
        icon="book-open"
        title={t('sections.detail.notFound.title')}
        description={t('sections.detail.notFound.description')}
      />
    );
  }

  const tabs: TabItem[] = [
    { key: 'roster', label: t('sections.detail.tabs.roster'), count: section.data.enrolledCount },
    { key: 'timetable', label: t('sections.detail.tabs.timetable') },
    { key: 'teachers', label: t('sections.detail.tabs.teachers'), count: section.data.teachers.length },
  ];

  return (
    <div className="space-y-4">
      <div>
        <Link
          to="/sections"
          className="inline-flex items-center gap-1 text-sm text-ink-500 no-underline hover:text-ink-700"
        >
          <Icon name="chevron-right" size={16} mirror />
          {t('sections.detail.back')}
        </Link>
        <h1 className="mt-1 mb-0 text-xl font-bold text-ink-900">{section.data.name}</h1>
      </div>

      <Tabs items={tabs} active={tab} onSelect={(key) => setTab(key as TabKey)} />

      {tab === 'roster' ? <RosterTab sectionId={id} /> : null}
      {tab === 'timetable' ? <SectionTimetableTab sectionId={id} /> : null}
      {tab === 'teachers' ? <TeachersTab section={section.data} /> : null}
    </div>
  );
}

function RosterTab({ sectionId }: { sectionId: string }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const list = useListEnrollmentsQuery({ sectionId, page });

  const columns: Column<Enrollment>[] = [
    {
      key: 'student',
      header: t('sections.detail.roster.student'),
      render: (row) => (
        <Link to={`/students/${row.studentId}`} className="text-link no-underline hover:underline">
          {row.studentName}
        </Link>
      ),
    },
    {
      key: 'code',
      header: t('sections.detail.roster.code'),
      render: (row) => <span className="ef-num">{row.studentCode}</span>,
    },
    {
      key: 'entry',
      header: t('sections.detail.roster.entry'),
      render: (row) => t(`sections.entryType.${row.entryType}`, row.entryType),
    },
    {
      key: 'status',
      header: t('sections.detail.roster.status'),
      render: (row) => (
        <Badge tone={row.status === 'active' ? 'success' : 'neutral'}>
          {t(`students.profile.enrollmentStatus.${row.status}`, row.status)}
        </Badge>
      ),
    },
  ];

  return (
    <PagedList
      data={list.data}
      isLoading={list.isLoading}
      isError={list.isError}
      isFetching={list.isFetching}
      columns={columns}
      getRowKey={(row) => row.id}
      errorTitle={t('sections.detail.roster.error')}
      page={page}
      onPage={setPage}
      empty={
        <EmptyState
          icon="users"
          title={t('sections.detail.roster.empty.title')}
          description={t('sections.detail.roster.empty.description')}
        />
      }
    />
  );
}

function TeachersTab({ section }: { section: SectionDetail }) {
  const { t } = useTranslation();
  const [managing, setManaging] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" icon="user" onClick={() => setManaging(true)}>
          {t('sections.detail.teachers.manage')}
        </Button>
      </div>

      {section.teachers.length === 0 ? (
        <EmptyState
          icon="users"
          title={t('sections.detail.teachers.empty.title')}
          description={t('sections.detail.teachers.empty.description')}
        />
      ) : (
        <Card>
          <ul className="m-0 grid list-none gap-2 p-0">
            {section.teachers.map((teacher) => (
              <li key={teacher.userId} className="flex items-center gap-3 text-sm">
                <Icon name="user" size={16} />
                <span className="flex-1">{teacher.fullName}</span>
                {teacher.isPrimary ? (
                  <Badge tone="brand">{t('sections.detail.teachers.primary')}</Badge>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {managing ? (
        /* SectionTeachersDialog renders from its props and re-reads through the
           'Section' tag, so the assign/unassign it performs flows back here. */
        <SectionTeachersDialog
          section={{
            id: section.id,
            name: section.name,
            gender: section.gender,
            levelId: section.levelId,
            defaultMode: section.defaultMode,
            enrolledCount: section.enrolledCount,
            capacity: section.capacity,
            teachers: section.teachers,
          }}
          onClose={() => setManaging(false)}
        />
      ) : null}
    </div>
  );
}
