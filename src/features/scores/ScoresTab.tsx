import { useState } from 'react';
import { useNavigate, type NavigateFunction } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  EmptyState,
  Field,
  Select,
  Skeleton,
  Toast,
  formatClassDate,
  type ActionItem,
  type Column,
} from '../../ds';
import { useAcademicYearQuery, defaultTerm } from '../../shared/api/calendar';
import type { SectionDetail } from '../sections';
import { ExamCreateDialog } from './ExamCreateDialog';
import { useListExamsQuery } from './scores.api';
import type { Exam } from './score.model';

function examDate(exam: Exam): string | null {
  return exam.scheduledAt?.slice(0, 10) ?? null;
}

/** The scores tab in the level hub: date-first entry. The teacher picks an exam
 *  day (the dates the head teacher scheduled exams on) and opens that day's exam
 *  to enter marks — the grid names the subject. The head teacher creates and
 *  schedules exams here (the API gates creation to them). */
export function ScoresTab({
  section,
  isHeadTeacher,
}: {
  section: SectionDetail;
  isHeadTeacher: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const year = useAcademicYearQuery(section.academicYearId, { skip: section.academicYearId === 0 });
  const exams = useListExamsQuery({ levelId: section.levelId });

  const [chosen, setChosen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (exams.isLoading || year.isLoading) return <TableSkeleton />;
  if (exams.isError || year.isError) return <Alert tone="danger" title={t('scores.error')} />;

  // Exams belong to level+term+gender; a null gender is a shared sitting (R3).
  const forGender = (exams.data?.items ?? []).filter(
    (e) => e.gender === null || e.gender === section.gender,
  );
  const dates = [...new Set(forGender.map(examDate).filter((d): d is string => d != null))].sort();
  const undated = forGender.filter((e) => examDate(e) === null);
  const date = chosen ?? dates[dates.length - 1] ?? null;
  const dayExams = date != null ? forGender.filter((e) => examDate(e) === date) : [];

  const createTerm = defaultTerm(year.data?.terms ?? []);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {dates.length > 0 ? (
          <Field label={t('scores.examDay')} className="w-72">
            <Select
              options={dates.map((d) => ({ value: d, label: formatClassDate(d) }))}
              value={date ?? ''}
              onChange={(e) => setChosen(e.target.value)}
              aria-label={t('scores.examDay')}
            />
          </Field>
        ) : (
          <span />
        )}
        {isHeadTeacher && createTerm != null ? (
          <Button size="sm" icon="plus" onClick={() => setCreating(true)}>
            {t('scores.create.button')}
          </Button>
        ) : null}
      </div>

      {dates.length === 0 && undated.length === 0 ? (
        <EmptyState
          icon="clipboard-list"
          title={t('scores.noExams.title')}
          description={t(isHeadTeacher ? 'scores.noExams.createHint' : 'scores.noExams.description')}
        />
      ) : (
        <>
          {date != null ? <ExamTable exams={dayExams} navigate={navigate} /> : null}
          {undated.length > 0 ? (
            <div className="space-y-2">
              <h3 className="m-0 text-sm font-semibold text-ink-600">{t('scores.undated')}</h3>
              <ExamTable exams={undated} navigate={navigate} />
            </div>
          ) : null}
        </>
      )}

      {creating && createTerm != null ? (
        <ExamCreateDialog
          branchId={section.branchId}
          levelId={section.levelId}
          academicYearId={section.academicYearId}
          sectionGender={section.gender}
          termId={createTerm.id}
          termNumber={createTerm.termNumber}
          onClose={() => setCreating(false)}
          onSaved={(message) => {
            setCreating(false);
            setToast(message);
          }}
        />
      ) : null}
      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
    </section>
  );
}

function ExamTable({ exams, navigate }: { exams: Exam[]; navigate: NavigateFunction }) {
  const { t } = useTranslation();
  if (exams.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-500">{t('scores.noExamsDate')}</p>;
  }

  const columns: Column<Exam>[] = [
    { key: 'subject', header: t('scores.columns.subject'), sticky: true, render: (exam) => <span className="font-semibold text-ink-900">{exam.subjectNameAr}</span> },
    { key: 'type', header: t('scores.columns.type'), render: (exam) => t(`scores.examType.${exam.examType}`) },
    {
      key: 'status',
      header: t('scores.columns.status'),
      render: (exam) =>
        exam.isLocked ? <Badge tone="neutral">{t('scores.locked')}</Badge> : <Badge tone="success">{t('scores.open')}</Badge>,
    },
  ];

  const rowActions = (exam: Exam): ActionItem[] => [
    { key: 'scores', label: t('scores.openGrid'), icon: 'clipboard-check', onSelect: () => navigate(`/scores/exams/${exam.id}`) },
    { key: 'eligibility', label: t('eligibility.link'), icon: 'clipboard-list', onSelect: () => navigate(`/exams/${exam.id}/eligibility`) },
  ];

  return (
    <DataTable
      columns={columns}
      rows={exams}
      getRowKey={(exam) => exam.id}
      onRowClick={(exam) => navigate(`/scores/exams/${exam.id}`)}
      rowActions={rowActions}
    />
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-lg border border-subtle bg-surface p-4">
      <Skeleton rows={6} height={22} />
    </div>
  );
}
