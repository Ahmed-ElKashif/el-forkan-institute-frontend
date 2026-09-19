import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, DataTable, EmptyState, formatClassDate, type Column } from '../../ds';
import { ListSkeleton } from '../../shared/react/PagedList';
import { useLevelsQuery } from '../catalogue';
import { useListExamsQuery } from './scores.api';

/** One exam still open for marks, named by the level it was sat in. */
interface OpenExamRow {
  examId: string;
  subjectNameAr: string;
  levelNameAr: string;
  /** Null is a shared sitting — one paper for both cohorts (R3). */
  gender: string | null;
  examType: string;
  scheduledAt: string | null;
}

/** Sat exams first, most recent first, because those are the ones whose marks
 *  are actually owed. An exam with no date cannot have been sat yet, so it sinks
 *  to the bottom. Cases: both undated / either undated / both dated. */
function byMostRecentlySat(a: OpenExamRow, b: OpenExamRow): number {
  if (a.scheduledAt == null) return b.scheduledAt == null ? 0 : 1;
  if (b.scheduledAt == null) return -1;
  return b.scheduledAt.localeCompare(a.scheduledAt);
}

/** What the Scores nav opens: every exam still awaiting marks, across levels.
 *
 *  It lists exams rather than levels because entering a mark used to cost four
 *  choices — level, then cohort, then exam day, then the exam — none of which
 *  the teacher was actually deciding. They already know which paper they are
 *  holding. An unlocked exam *is* the outstanding task (locking is what says the
 *  marks are in, R8), so the open exams are the worklist, and a row opens its
 *  grid directly.
 *
 *  Scoping is the API's: `GET /exams` returns only what the viewer may see, so a
 *  teacher gets their own levels' papers without this screen filtering. */
export function OpenExamsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const levels = useLevelsQuery();
  const exams = useListExamsQuery({ isLocked: false });

  if (levels.isLoading || exams.isLoading) return <ListSkeleton />;
  if (levels.isError || exams.isError) return <Alert tone="danger" title={t('scores.error')} />;

  const levelNameById = new Map((levels.data ?? []).map((level) => [level.id, level.nameAr]));
  const rows: OpenExamRow[] = (exams.data?.items ?? [])
    .flatMap((exam) => {
      const levelNameAr = levelNameById.get(exam.levelId);
      return levelNameAr == null
        ? []
        : [{
            examId: exam.id,
            subjectNameAr: exam.subjectNameAr,
            levelNameAr,
            gender: exam.gender,
            examType: exam.examType,
            scheduledAt: exam.scheduledAt,
          }];
    })
    .sort(byMostRecentlySat);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon="clipboard-check"
        title={t('scores.openExams.empty.title')}
        description={t('scores.openExams.empty.description')}
      />
    );
  }

  const columns: Column<OpenExamRow>[] = [
    {
      key: 'subject',
      header: t('scores.columns.subject'),
      sticky: true,
      render: (row) => <span className="font-semibold text-ink-900">{row.subjectNameAr}</span>,
    },
    { key: 'level', header: t('scores.openExams.columns.level'), render: (row) => row.levelNameAr },
    {
      key: 'cohort',
      header: t('scores.openExams.columns.cohort'),
      render: (row) => (
        <Badge tone="neutral">
          {row.gender == null ? t('scores.openExams.shared') : t(`levels.detail.gender.${row.gender}`)}
        </Badge>
      ),
    },
    { key: 'type', header: t('scores.columns.type'), render: (row) => t(`scores.examType.${row.examType}`) },
    {
      key: 'day',
      header: t('scores.examDay'),
      render: (row) =>
        row.scheduledAt == null ? (
          <span className="text-ink-400">{t('scores.openExams.undated')}</span>
        ) : (
          formatClassDate(row.scheduledAt.slice(0, 10))
        ),
    },
  ];

  return (
    <section className="space-y-4">
      <p className="m-0 text-sm text-ink-500">{t('scores.openExams.caption')}</p>
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.examId}
        onRowClick={(row) => navigate(`/scores/exams/${row.examId}`)}
      />
    </section>
  );
}
