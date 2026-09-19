import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  DataTable,
  EmptyState,
  Field,
  Select,
  formatNumber,
  type Column,
} from '../../ds';
import { ListSkeleton } from '../../shared/react/PagedList';
import { useCurrentAcademicYearQuery, defaultTerm } from '../../shared/api/calendar';
import { useLevelsQuery } from '../catalogue';
import { useListSectionsQuery } from '../sections';
import { examsForCohort, useListExamsQuery } from '../scores';
/* Deep import, not the `../levels` barrel: that barrel pulls in the level hub
   and, through it, most of the app. This module only needs the cohort ordering. */
import { genderRank } from '../levels/level.model';

/** One class's readiness to have its term closed. */
interface CohortCloseRow {
  sectionId: string;
  levelNameAr: string;
  gender: string;
  examCount: number;
  lockedCount: number;
}

/** Closing a term, for the whole institute at once.
 *
 *  A term ends by freezing its marks: every exam locked (R8), then each class's
 *  standings computed and finalized. That last screen existed but nothing linked
 *  to it — it could only be reached by typing a URL — so the step between term
 *  one and term two had no way in at all. This is the way in.
 *
 *  What it shows is lock readiness per class, the same question a registrar's
 *  "who has posted their grades" list answers: an unlocked exam means marks are
 *  still provisional, so finalizing on top of it would freeze a half-entered
 *  term. It deliberately does not compute anything to render — computing stores
 *  the standings, and a screen you merely opened should not write. The finalized
 *  state lives on the class's own term-results screen, one click away. */
export function TermClosePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const year = useCurrentAcademicYearQuery();
  const levels = useLevelsQuery();
  const sections = useListSectionsQuery(
    { academicYearId: year.data?.id ?? 0, page: 1, pageSize: 100 },
    { skip: year.data == null },
  );

  const [pickedTermId, setPickedTermId] = useState<number | null>(null);
  const terms = year.data?.terms ?? [];
  const termId = pickedTermId ?? defaultTerm(terms)?.id ?? null;
  const exams = useListExamsQuery({ termId: termId ?? 0 }, { skip: termId == null });

  if (year.isLoading || levels.isLoading || sections.isLoading) return <ListSkeleton />;
  if (year.isError || levels.isError || sections.isError || exams.isError) {
    return <Alert tone="danger" title={t('termclose.error')} />;
  }
  if (year.data == null || terms.length === 0) {
    return (
      <EmptyState
        icon="calendar-days"
        title={t('termclose.noTerm.title')}
        description={t('termclose.noTerm.description')}
      />
    );
  }

  const termExams = exams.data?.items ?? [];
  const cohorts = sections.data?.items ?? [];
  const rows: CohortCloseRow[] = [...(levels.data ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((level) =>
      cohorts
        .filter((section) => section.levelId === level.id)
        .sort((a, b) => genderRank(a.gender) - genderRank(b.gender))
        .map((section) => {
          const sat = examsForCohort(termExams, level.id, section.gender);
          return {
            sectionId: section.id,
            levelNameAr: level.nameAr,
            gender: section.gender,
            examCount: sat.length,
            lockedCount: sat.filter((exam) => exam.isLocked).length,
          };
        }),
    );

  const columns: Column<CohortCloseRow>[] = [
    { key: 'level', header: t('termclose.columns.cohort'), sticky: true, render: (row) => row.levelNameAr },
    {
      key: 'gender',
      header: t('levels.columns.cohort'),
      render: (row) => <Badge tone="neutral">{t(`levels.detail.gender.${row.gender}`)}</Badge>,
    },
    {
      key: 'marks',
      header: t('termclose.columns.marks'),
      numeric: true,
      render: (row) => (
        <span className="ef-num">
          {formatNumber(row.lockedCount)} / {formatNumber(row.examCount)}
        </span>
      ),
    },
    {
      key: 'state',
      header: t('termclose.columns.state'),
      render: (row) => <ReadinessBadge row={row} />,
    },
  ];

  return (
    <section className="space-y-4">
      <p className="m-0 text-sm text-ink-500">{t('termclose.caption')}</p>

      <Field label={t('termclose.term')} className="w-72">
        <Select
          options={terms.map((term) => ({
            value: term.id,
            label: t('termclose.termLabel', { n: formatNumber(term.termNumber) }),
          }))}
          value={termId ?? ''}
          onChange={(e) => setPickedTermId(Number(e.target.value))}
          aria-label={t('termclose.term')}
        />
      </Field>

      {rows.length === 0 ? (
        <EmptyState
          icon="users"
          title={t('termclose.noCohorts.title')}
          description={t('termclose.noCohorts.description')}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.sectionId}
          onRowClick={(row) => navigate(`/term-results/${row.sectionId}/${termId}`)}
        />
      )}
    </section>
  );
}

/** Three honest states, because "0 / 0" and "3 / 3" are not the same thing: a
 *  class with no exams this term is not ready, it is unexamined. */
function ReadinessBadge({ row }: { row: CohortCloseRow }) {
  const { t } = useTranslation();
  if (row.examCount === 0) return <Badge tone="neutral">{t('termclose.state.noExams')}</Badge>;
  if (row.lockedCount === row.examCount) return <Badge tone="success">{t('termclose.state.ready')}</Badge>;
  return <Badge tone="warning">{t('termclose.state.pending')}</Badge>;
}
