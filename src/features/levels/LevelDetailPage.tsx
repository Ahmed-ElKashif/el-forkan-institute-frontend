import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Icon,
  IconButton,
  Select,
  Tabs,
  Toast,
  formatNumber,
  type TabItem,
} from '../../ds';
import { ListSkeleton } from '../../shared/react/PagedList';
import { useAcademicYearQuery } from '../../shared/api/calendar';
import { useTabParam } from '../../shared/react/useTabParam';
import { useAuth } from '../auth';
import { AttendanceTab } from '../attendance';
import { LevelEditDialog } from '../catalogue';
import { CurriculumPage } from '../curriculum';
import { ScoresTab } from '../scores';
import { ClassDaysTab } from '../sessions';
import { RosterTab, SectionTeachersDialog, useGetSectionQuery } from '../sections';
import { LevelGenderHeader } from './LevelGenderHeader';
import { GENDERS, type Gender } from './level.model';
import { useGenderParam, useLevelSection } from './useLevelSection';

/* Class work first (roster, attendance, scores — what a teacher opens daily),
   then this level's own setup, which only the head teacher sees. The subject and
   book registries used to sit here too, behind a second tab strip; they are
   institute-wide catalogues, not this level's, so they moved to /catalogue and
   what remains is genuinely level-scoped. The curriculum and promotion tabs are
   level-wide (both cohorts), so they ignore the gender filter; the rest read the
   resolved cohort. */
const TAB_KEYS = ['roster', 'attendance', 'scores', 'curriculum', 'classDays', 'teachers'] as const;
type TabKey = (typeof TAB_KEYS)[number];
const TEACHER_TABS: readonly TabKey[] = ['roster', 'attendance', 'scores'];
/** R6 — a year has two terms. */
const TERM_NUMBERS = [1, 2];

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

  const { level, section, yearId, isLoading, notFound } = useLevelSection(levelId, gender);

  const keys: readonly TabKey[] = isHeadTeacher ? TAB_KEYS : TEACHER_TABS;
  const [tab, setTab] = useTabParam<TabKey>(keys, 'roster');

  const detail = useGetSectionQuery(section?.id ?? '', { skip: section == null });

  /* The teachers tab covers both classes, so its count does too — reading the
     section list the hook already loaded rather than issuing another query. */
  const otherCohort = useLevelSection(levelId, gender === 'male' ? 'female' : 'male').section;
  const teacherCount =
    section == null && otherCohort == null
      ? undefined
      : (section?.teachers.length ?? 0) + (otherCohort?.teachers.length ?? 0);

  if (isLoading) return <ListSkeleton />;
  if (notFound || level == null) {
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
          { key: 'curriculum', label: t('levels.detail.tabs.curriculum') },
          { key: 'classDays', label: t('levels.detail.tabs.classDays') },
          // Both cohorts, because the tab now shows both classes' staff.
          { key: 'teachers', label: t('sections.detail.tabs.teachers'), count: teacherCount },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <LevelGenderHeader
        title={level.nameAr}
        backTo="/levels"
        backLabel={t('levels.detail.back')}
        gender={gender}
        onGenderChange={setGender}
        action={
          isHeadTeacher ? (
            <IconButton
              icon="settings"
              variant="ghost"
              size="sm"
              label={t('levels.detail.editLevel')}
              onClick={() => setEditingLevel(true)}
            />
          ) : undefined
        }
      />

      <Tabs items={tabs} active={tab} onSelect={(key) => setTab(key as TabKey)} />

      {/* The curriculum is level-wide (both cohorts), so it renders whether or
          not this gender has a class provisioned. The gendered tabs need the
          resolved cohort. */}
      {tab === 'curriculum' ? (
        <LevelCurriculumTab levelId={levelId} yearId={yearId} />
      ) : tab === 'teachers' ? (
        /* Level-wide, like the curriculum: a level's staffing is both classes'
           responsible teachers, so this ignores the cohort filter rather than
           hiding one of the two answers behind it. */
        <TeachersTab levelId={levelId} />
      ) : section == null ? (
        <EmptyState
          icon="users"
          title={t('levels.detail.noCohort.title')}
          description={t('levels.detail.noCohort.description')}
        />
      ) : tab === 'roster' ? (
        <RosterTab sectionId={section.id} sectionGender={gender} sectionBranchId={section.branchId} />
      ) : tab === 'attendance' ? (
        <AttendanceTab sectionId={section.id} academicYearId={yearId} />
      ) : tab === 'classDays' ? (
        <ClassDaysTab levelId={levelId} academicYearId={yearId} sectionId={section.id} />
      ) : detail.data ? (
        <ScoresTab section={detail.data} isHeadTeacher={isHeadTeacher} />
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

/** This level's syllabus, inside the hub — **shown, not edited**.
 *
 *  The plan belongs to the الخطة الدراسية screen, which owns the subject and book
 *  registries it draws on. This tab used to carry the identical write set, so the
 *  same مقرر could be added from two screens with nothing to say which one the
 *  institute's record lived on. The link goes there at this exact scope, so
 *  editing is one click away rather than a second place.
 *
 *  The hub supplies the level and the year; only the term is left to choose. The
 *  year is *shown* rather than assumed: the plan is year-scoped (§5.1). */
function LevelCurriculumTab({ levelId, yearId }: { levelId: number; yearId: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const year = useAcademicYearQuery(yearId, { skip: yearId === 0 });
  const [termNumber, setTermNumber] = useState(1);

  /* The scope the catalogue reads from the URL (`useCatalogueScope`), so it opens
     on the very syllabus being looked at rather than on its own defaults. */
  const editHref = `/catalogue?tab=curriculum&year=${yearId}&level=${levelId}&term=${termNumber}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t('curriculum.filters.term')} className="w-40">
          <Select
            options={TERM_NUMBERS.map((n) => ({
              value: n,
              label: t('curriculum.term', { n: formatNumber(n) }),
            }))}
            value={termNumber}
            onChange={(e) => setTermNumber(Number(e.target.value))}
            aria-label={t('curriculum.filters.term')}
          />
        </Field>
        {year.data ? (
          <p className="m-0 pb-2 text-sm text-ink-500">
            {t('catalogue.scope.yearLabel', { n: formatNumber(year.data.hijriYear) })}
          </p>
        ) : null}
        <Button className="ms-auto" variant="secondary" icon="scroll-text" onClick={() => navigate(editHref)}>
          {t('curriculum.editInCatalogue')}
        </Button>
      </div>

      <CurriculumPage scope={{ yearId, levelId, termNumber }} readOnly />
    </div>
  );
}

/** Both cohorts' staffing, side by side.
 *
 *  A level is two classes (R3), and each class has its own responsible teacher —
 *  so "who is responsible for المستوى الثاني" has two answers, not one. This tab
 *  used to show whichever cohort the gender toggle happened to be on, which made
 *  the other cohort's responsible teacher invisible and the level look
 *  single-staffed. Both are listed here, and a class with nobody named says so
 *  rather than rendering an empty list, because an unstaffed class is the thing
 *  worth noticing. */
function TeachersTab({ levelId }: { levelId: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {GENDERS.map((cohort) => (
        <CohortTeachers key={cohort} levelId={levelId} gender={cohort} />
      ))}
    </div>
  );
}

function CohortTeachers({ levelId, gender }: { levelId: number; gender: Gender }) {
  const { t } = useTranslation();
  const [managing, setManaging] = useState(false);
  const { section } = useLevelSection(levelId, gender);
  const detail = useGetSectionQuery(section?.id ?? '', { skip: section == null });

  const heading = t(`students.gender.${gender}`);

  if (section == null) {
    return (
      <Card>
        <h3 className="m-0 mb-2 text-sm font-semibold text-ink-700">{heading}</h3>
        <p className="m-0 text-sm text-ink-500">{t('levels.detail.noCohort.title')}</p>
      </Card>
    );
  }
  if (detail.data == null) return <ListSkeleton />;

  const { teachers } = detail.data;
  const primary = teachers.find((teacher) => teacher.isPrimary);
  const assistants = teachers.filter((teacher) => !teacher.isPrimary);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="m-0 text-sm font-semibold text-ink-700">{heading}</h3>
        <Button size="sm" variant="secondary" icon="user" onClick={() => setManaging(true)}>
          {t('sections.detail.teachers.manage')}
        </Button>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <Icon name="user" size={16} />
        {primary ? (
          <>
            <span className="flex-1">{primary.fullName}</span>
            <Badge tone="brand">{t('sections.detail.teachers.primary')}</Badge>
          </>
        ) : (
          <span className="flex-1 text-ink-400">
            {t('sections.detail.teachers.noPrimary')}
          </span>
        )}
      </div>

      {assistants.length > 0 ? (
        <ul className="m-0 mt-2 grid list-none gap-2 border-t border-subtle p-0 pt-2">
          {assistants.map((teacher) => (
            <li key={teacher.userId} className="flex items-center gap-3 text-sm">
              <Icon name="user" size={16} className="text-ink-400" />
              <span className="flex-1">{teacher.fullName}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {managing ? (
        <SectionTeachersDialog
          section={{
            id: detail.data.id,
            name: detail.data.name,
            gender: detail.data.gender,
            levelId: detail.data.levelId,
            branchId: detail.data.branchId,
            defaultMode: detail.data.defaultMode,
            enrolledCount: detail.data.enrolledCount,
            capacity: detail.data.capacity,
            teachers: detail.data.teachers,
          }}
          onClose={() => setManaging(false)}
        />
      ) : null}
    </Card>
  );
}
