import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  IconButton,
  Tabs,
  Toast,
  type Column,
  type TabItem,
} from '../../ds';
import { ListSkeleton, PagedList } from '../../shared/react/PagedList';
import { useTabParam } from '../../shared/react/useTabParam';
import { useCurrentAcademicYearQuery } from '../../shared/api/calendar';
import { useAuth } from '../auth';
import { AttendanceTab } from '../attendance';
import { CataloguePage, LevelEditDialog, useLevelsQuery } from '../catalogue';
import { ScoresTab } from '../scores';
import { ClassDaysTab } from '../sessions';
import {
  SectionTeachersDialog,
  useGetSectionQuery,
  useListEnrollmentsQuery,
  useListSectionsQuery,
  type Enrollment,
  type SectionDetail,
} from '../sections';
import { GENDERS, findSection, type Gender } from './level.model';

// Roster, attendance and scores are gendered and open to teachers; the
// catalogue, class days and teachers tabs are head-teacher work. The catalogue
// is level-wide (shared by both cohorts), so it ignores the gender filter; the
// rest read the resolved cohort.
const TAB_KEYS = ['roster', 'attendance', 'scores', 'catalogue', 'classDays', 'teachers'] as const;
type TabKey = (typeof TAB_KEYS)[number];
const TEACHER_TABS: readonly TabKey[] = ['roster', 'attendance', 'scores'];

/** The chosen cohort, in `?gender=`, so a boys/girls switch is shareable and
 *  survives a reload. Defaults to boys; an unknown value falls back rather than
 *  resolving no class. */
function useGenderParam(): [Gender, (gender: Gender) => void] {
  const [params, setParams] = useSearchParams();
  const gender: Gender = params.get('gender') === 'female' ? 'female' : 'male';
  const setGender = (next: Gender) =>
    setParams(
      (previous) => {
        const merged = new URLSearchParams(previous);
        merged.set('gender', next);
        return merged;
      },
      { replace: true },
    );
  return [gender, setGender];
}

/** One level, and everything that belongs to it. A level owns a boys' class and
 *  a girls' class (R3); the gender filter switches which cohort the gendered
 *  tabs show, while shared views (the catalogue) ignore it. Resolves the level +
 *  gender to the underlying section and hands its id to the reused tabs. */
export function LevelDetailPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isHeadTeacher = user?.role === 'head_teacher';
  const { levelId: levelIdParam = '' } = useParams();
  const levelId = Number(levelIdParam);
  const [gender, setGender] = useGenderParam();
  const [editingLevel, setEditingLevel] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const levels = useLevelsQuery();
  const year = useCurrentAcademicYearQuery();
  const yearId = year.data?.id ?? 0;
  const sections = useListSectionsQuery(
    { academicYearId: yearId, page: 1, pageSize: 100 },
    { skip: year.data == null },
  );

  const keys: readonly TabKey[] = isHeadTeacher ? TAB_KEYS : TEACHER_TABS;
  const [tab, setTab] = useTabParam<TabKey>(keys, 'roster');

  const level = levels.data?.find((l) => l.id === levelId);
  const section = findSection(sections.data?.items, levelId, gender);
  const detail = useGetSectionQuery(section?.id ?? '', { skip: section == null });

  if (levels.isLoading || year.isLoading || sections.isLoading) return <ListSkeleton />;
  if (!level) {
    return (
      <EmptyState
        icon="book-open"
        title={t('levels.detail.notFound.title')}
        description={t('levels.detail.notFound.description')}
      />
    );
  }

  const tabs: TabItem[] = [
    { key: 'roster', label: t('sections.detail.tabs.roster'), count: section?.enrolledCount },
    { key: 'attendance', label: t('levels.detail.tabs.attendance') },
    { key: 'scores', label: t('levels.detail.tabs.scores') },
    ...(isHeadTeacher
      ? [
          { key: 'catalogue', label: t('levels.detail.tabs.catalogue') },
          { key: 'classDays', label: t('levels.detail.tabs.classDays') },
          { key: 'teachers', label: t('sections.detail.tabs.teachers'), count: section?.teachers.length },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div>
        <Link
          to="/levels"
          className="inline-flex items-center gap-1 text-sm text-ink-500 no-underline hover:text-ink-700"
        >
          <Icon name="chevron-right" size={16} mirror />
          {t('levels.detail.back')}
        </Link>
        <div className="mt-1 mb-2 flex items-center gap-2">
          <h1 className="m-0 text-xl font-bold text-ink-900">{level.nameAr}</h1>
          {isHeadTeacher ? (
            <IconButton
              icon="settings"
              variant="ghost"
              size="sm"
              label={t('levels.detail.editLevel')}
              onClick={() => setEditingLevel(true)}
            />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('levels.detail.genderFilter')}>
          {GENDERS.map((option) => (
            <Badge
              key={option}
              pressable
              active={gender === option}
              onClick={() => setGender(option)}
            >
              {t(`levels.detail.gender.${option}`)}
            </Badge>
          ))}
        </div>
      </div>

      <Tabs items={tabs} active={tab} onSelect={(key) => setTab(key as TabKey)} />

      {/* The catalogue is level-wide, so it renders whether or not this gender
          has a class provisioned. The gendered tabs need the resolved cohort. */}
      {tab === 'catalogue' ? (
        <CataloguePage lockedLevelId={levelId} tabParam="cat" />
      ) : section == null ? (
        <EmptyState
          icon="users"
          title={t('levels.detail.noCohort.title')}
          description={t('levels.detail.noCohort.description')}
        />
      ) : tab === 'roster' ? (
        <RosterTab sectionId={section.id} />
      ) : tab === 'attendance' ? (
        <AttendanceTab sectionId={section.id} academicYearId={yearId} />
      ) : tab === 'classDays' ? (
        <ClassDaysTab levelId={levelId} academicYearId={yearId} sectionId={section.id} />
      ) : detail.data ? (
        tab === 'scores' ? (
          <ScoresTab section={detail.data} isHeadTeacher={isHeadTeacher} />
        ) : (
          <TeachersTab section={detail.data} />
        )
      ) : (
        <ListSkeleton />
      )}

      {editingLevel ? (
        <LevelEditDialog
          level={level}
          onClose={() => setEditingLevel(false)}
          onSaved={(message) => {
            setEditingLevel(false);
            setToast(message);
          }}
        />
      ) : null}

      {toast ? (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <Toast tone="success" message={toast} onDismiss={() => setToast(null)} />
        </div>
      ) : null}
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
