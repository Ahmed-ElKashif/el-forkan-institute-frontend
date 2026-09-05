import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  Badge,
  EmptyState,
  SearchInput,
  Select,
  formatNumber,
  type BadgeProps,
  type Column,
  type SelectOption,
} from '../../ds';
import { useDebouncedValue } from '../../shared/react/useDebouncedValue';
import { PagedList } from '../../shared/react/PagedList';
import { useLevelsQuery } from '../catalogue';
import { useListStudentsQuery } from './students.api';
import type { Student } from './student.model';

const RISK_TONE: Record<string, NonNullable<BadgeProps['tone']>> = {
  warning: 'warning',
  over: 'danger',
};

/** The students roster: search, filter by study year, page. The status column
 *  is now an **attendance-risk** badge (§4.8) — who is near or over the absence
 *  limit this term — so a teacher can spot who to follow up; a row opens the
 *  profile, where the count, contact and "warn" action live. Lifecycle status
 *  moved to the profile's edit form. */
export function StudentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [levelId, setLevelId] = useState<number | undefined>(undefined);
  const [gender, setGender] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(term.trim(), 300);

  const query = useListStudentsQuery({ page, search, levelId, gender });
  const roster = query.data;
  const levels = useLevelsQuery();

  function onSearch(next: string) {
    setTerm(next);
    setPage(1);
  }

  function onLevel(next: string) {
    setLevelId(next ? Number(next) : undefined);
    setPage(1);
  }

  function onGender(next: string) {
    setGender(next || undefined);
    setPage(1);
  }

  const genderOptions: SelectOption[] = [
    { value: '', label: t('students.filters.allGroups') },
    { value: 'male', label: t('students.filters.boysGroup') },
    { value: 'female', label: t('students.filters.girlsGroup') },
  ];

  // "All years" first, then the six levels in their teaching order.
  const levelOptions: SelectOption[] = [
    { value: '', label: t('students.filters.allLevels') },
    ...[...(levels.data ?? [])]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((level) => ({ value: level.id, label: level.nameAr })),
  ];

  const columns: Column<Student>[] = [
    {
      key: 'fullName',
      header: t('students.columns.name'),
      render: (s) => (
        <Link to={`/students/${s.id}`} className="font-semibold text-brand-text hover:underline">
          {s.fullName}
        </Link>
      ),
    },
    {
      key: 'studyYear',
      header: t('students.columns.studyYear'),
      render: (s) =>
        s.levelName ?? <span className="text-ink-400">{t('students.noLevel')}</span>,
    },
    { key: 'gender', header: t('students.columns.gender'), render: (s) => t(`students.gender.${s.gender}`) },
    {
      key: 'phone',
      header: t('students.columns.phone'),
      render: (s) =>
        s.phone ? (
          // Isolate the number's direction: a leading "+" in an RTL row
          // otherwise jumps to the wrong end.
          <bdi className="ef-num">{s.phone}</bdi>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    {
      key: 'attendance',
      header: t('students.columns.attendance'),
      render: (s) =>
        s.attendanceRisk === 'none' ? (
          <span className="text-ink-400">—</span>
        ) : (
          <Badge tone={RISK_TONE[s.attendanceRisk]} icon="triangle-alert">
            {t(`students.risk.${s.attendanceRisk}`)}
            {s.maxAbsences != null ? (
              <span className="ef-num">
                {' '}
                ({formatNumber(s.absences)}/{formatNumber(s.maxAbsences)})
              </span>
            ) : null}
          </Badge>
        ),
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={term}
            onChange={(e) => onSearch(e.target.value)}
            aria-label={t('students.searchPlaceholder')}
            placeholder={t('students.searchPlaceholder')}
          />
          <Select
            aria-label={t('students.filters.level')}
            value={levelId ?? ''}
            options={levelOptions}
            onChange={(e) => onLevel(e.target.value)}
            wrapperClassName="w-40"
          />
          <Select
            aria-label={t('students.filters.group')}
            value={gender ?? ''}
            options={genderOptions}
            onChange={(e) => onGender(e.target.value)}
            wrapperClassName="w-40"
          />
        </div>
        {roster ? (
          <span className="whitespace-nowrap text-sm text-ink-500">
            {t('students.total', { total: formatNumber(roster.total) })}
          </span>
        ) : null}
      </div>

      <PagedList
        data={roster}
        isLoading={query.isLoading}
        isError={query.isError}
        isFetching={query.isFetching}
        columns={columns}
        getRowKey={(s) => s.id}
        errorTitle={t('students.error')}
        page={page}
        onPage={setPage}
        onRowClick={(s) => navigate(`/students/${s.id}`)}
        empty={
          search ? (
            <EmptyState
              icon="search"
              title={t('students.emptySearch.title')}
              description={t('students.emptySearch.description', { term: search })}
            />
          ) : (
            <EmptyState icon="users" title={t('students.empty.title')} description={t('students.empty.description')} />
          )
        }
      />
    </section>
  );
}
