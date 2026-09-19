import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Alert, DataTable, EmptyState, formatNumber, type Column } from '../../ds';
import { ListSkeleton } from '../../shared/react/PagedList';
import { useCurrentAcademicYearQuery } from '../../shared/api/calendar';
import { useLevelsQuery } from '../catalogue';
import { useListSectionsQuery } from '../sections';
import { GENDERS, type Gender } from './level.model';

/** One rung of the ladder, with this year's enrolment across both its classes
 *  and the responsible teacher of each. */
interface LevelRow {
  levelId: number;
  levelNameAr: string;
  enrolledCount: number;
  /** The primary of the boys' class and of the girls' class — a level has two
   *  responsible teachers, one per cohort, and both belong on this row. */
  responsible: { gender: Gender; name: string | null }[];
}

/** The front door for the level hub and for the Attendance and Scores tasks:
 *  the levels running this year, in ladder order.
 *
 *  **One row per level, not per cohort.** Splitting each level into إخوة and
 *  أخوات rows made the same choice twice: the screen the row opens already has a
 *  boys/girls filter of its own (`LevelGenderHeader`), so six levels were listed
 *  as twelve and the gender was picked before it could be switched anyway. The
 *  filter is the better place for it — it is one click, in view, and reversible.
 *
 *  The rows are still only the ones the viewer may act on: `GET /sections` is
 *  scoped server-side to a teacher's own `section_teachers` rows, so a level with
 *  no class of theirs is not listed at all. Without that filter a teacher could
 *  pick their way into a level that has nothing for them.
 *
 *  `linkTab` lets the Attendance and Scores nav entries reuse this same picker,
 *  each opening the class straight onto its own task page rather than the hub,
 *  so the teacher stays in the task.
 *
 *  Provisioning a year's classes is not here — that is year setup, and lives on
 *  the Academic Years screen. This is a clean picker. */
export function LevelsPage({ linkTab }: { linkTab?: 'attendance' | 'scores' } = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const levels = useLevelsQuery();
  const year = useCurrentAcademicYearQuery();
  const sections = useListSectionsQuery(
    { academicYearId: year.data?.id ?? 0, page: 1, pageSize: 100 },
    { skip: year.data == null },
  );

  if (levels.isLoading || year.isLoading || sections.isLoading) return <ListSkeleton />;
  if (levels.isError || year.isError || sections.isError || !levels.data) {
    return <Alert tone="danger" title={t('levels.error')} />;
  }

  // Walking the levels in ladder order (`sort_order`, PREP → COMP) puts the rows
  // in teaching order without a second sort. A level with no class this year is
  // dropped, which is also what scopes the list to a teacher's own levels.
  const cohorts = sections.data?.items ?? [];
  const rows: LevelRow[] = [...levels.data]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((level) => ({
      level,
      classes: cohorts.filter((section) => section.levelId === level.id),
    }))
    .filter(({ classes }) => classes.length > 0)
    .map(({ level, classes }) => ({
      levelId: level.id,
      levelNameAr: level.nameAr,
      enrolledCount: classes.reduce((total, section) => total + section.enrolledCount, 0),
      responsible: GENDERS.map((gender) => {
        const cohort = classes.find((section) => section.gender === gender);
        return {
          gender,
          name: cohort?.teachers.find((teacher) => teacher.isPrimary)?.fullName ?? null,
        };
      }),
    }));

  // No `?gender=`: the destination's own filter defaults to إخوة (`useGenderParam`)
  // and switching is one click there.
  const openLevel = (row: LevelRow) => navigate(`/${linkTab ?? 'levels'}/${row.levelId}`);

  const columns: Column<LevelRow>[] = [
    { key: 'level', header: t('levels.columns.name'), sticky: true, render: (row) => row.levelNameAr },
    {
      key: 'students',
      header: t('levels.columns.students'),
      numeric: true,
      render: (row) => <span className="ef-num">{formatNumber(row.enrolledCount)}</span>,
    },
    /* Both cohorts' responsible teachers, because a level has two and the row
       is the only place they can be compared. An unstaffed cohort shows as
       such rather than being omitted — that is the state worth spotting. */
    {
      key: 'responsible',
      header: t('levels.columns.responsible'),
      render: (row) => (
        <span className="grid gap-0.5 text-xs">
          {row.responsible.map((cohort) => (
            <span key={cohort.gender}>
              <span className="text-ink-500">{t(`students.gender.${cohort.gender}`)}: </span>
              {cohort.name ?? <span className="text-ink-400">{t('levels.columns.unstaffed')}</span>}
            </span>
          ))}
        </span>
      ),
    },
  ];

  if (rows.length === 0) {
    return (
      <EmptyState
        icon="users"
        title={t('levels.empty.title')}
        description={t('levels.empty.description')}
      />
    );
  }

  return (
    <section className="space-y-4">
      <p className="m-0 text-sm text-ink-500">{t('levels.caption')}</p>
      <DataTable columns={columns} rows={rows} getRowKey={(row) => row.levelId} onRowClick={openLevel} />
    </section>
  );
}
