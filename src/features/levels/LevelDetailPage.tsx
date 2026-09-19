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
import {
  RosterTab,
  SectionTeachersDialog,
  useGetSectionQuery,
  type SectionDetail,
} from '../sections';
import { LevelGenderHeader } from './LevelGenderHeader';
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
          { key: 'teachers', label: t('sections.detail.tabs.teachers'), count: section?.teachers.length },
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
            branchId: section.branchId,
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
