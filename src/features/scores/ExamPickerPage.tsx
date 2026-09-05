import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, DataTable, EmptyState, Icon, Skeleton, Toast, type Column } from '../../ds';
import { useGetSectionQuery } from '../sections';
import { useAcademicYearQuery, defaultTerm } from '../../shared/api/calendar';
import { TermPicker } from '../../shared/react/TermPicker';
import { ExamCreateDialog } from './ExamCreateDialog';
import { useListExamsQuery } from './scores.api';
import type { Exam } from './score.model';

/** The score entry point for a section: pick a term, then an exam. Exams belong
 *  to a level+term+gender, not a section, so the list is the section's level and
 *  term, narrowed to exams for its gender (or gender-neutral ones). Each row
 *  links to the grid at `/scores/exams/:examId`. */
export function ExamPickerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sectionId = '' } = useParams();

  const section = useGetSectionQuery(sectionId, { skip: sectionId === '' });
  const year = useAcademicYearQuery(section.data?.academicYearId ?? 0, {
    skip: section.data == null,
  });

  const terms = year.data?.terms ?? [];
  const [chosenTermId, setChosenTermId] = useState<number | null>(null);
  const termId = chosenTermId ?? defaultTerm(terms)?.id ?? null;
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (section.isLoading || year.isLoading) return <ListSkeleton />;
  if (section.isError || year.isError) return <Alert tone="danger" title={t('scores.error')} />;
  if (terms.length === 0) {
    return (
      <EmptyState
        icon="calendar-days"
        title={t('scores.noTerms.title')}
        description={t('scores.noTerms.description')}
      />
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-ink-900">{section.data?.name}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <TermPicker terms={terms} value={termId} onChange={setChosenTermId} />
          {termId != null && section.data ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                icon="clipboard-check"
                onClick={() => navigate(`/term-results/${sectionId}/${termId}`)}
              >
                {t('scores.termResults')}
              </Button>
              <Button size="sm" icon="plus" onClick={() => setCreating(true)}>
                {t('scores.create.button')}
              </Button>
            </>
          ) : null}
        </div>
      </div>
      {termId != null && section.data ? (
        <ExamList levelId={section.data.levelId} gender={section.data.gender} termId={termId} />
      ) : null}

      {creating && section.data && termId != null ? (
        <ExamCreateDialog
          branchId={section.data.branchId}
          levelId={section.data.levelId}
          academicYearId={section.data.academicYearId}
          sectionGender={section.data.gender}
          termId={termId}
          termNumber={terms.find((term) => term.id === termId)?.termNumber ?? 1}
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

function ExamList({ levelId, gender, termId }: { levelId: number; gender: string; termId: number }) {
  const { t } = useTranslation();
  const query = useListExamsQuery({ termId, levelId });

  if (query.isLoading) return <ListSkeleton />;
  if (query.isError) return <Alert tone="danger" title={t('scores.error')} />;

  // A gender-neutral exam (gender === null) applies to every section of the
  // level; a gendered one only to matching sections.
  const exams = (query.data?.items ?? []).filter((exam) => exam.gender === null || exam.gender === gender);

  if (exams.length === 0) {
    return (
      <EmptyState
        icon="clipboard-list"
        title={t('scores.noExams.title')}
        description={t('scores.noExams.description')}
      />
    );
  }

  const columns: Column<Exam>[] = [
    {
      key: 'subject',
      header: t('scores.columns.subject'),
      render: (exam) => (
        <Link
          to={`/scores/exams/${exam.id}`}
          className="inline-flex items-center gap-1 font-semibold text-brand-text hover:underline"
        >
          {exam.subjectNameAr}
          <Icon name="chevron-left" size={14} mirror />
        </Link>
      ),
    },
    { key: 'type', header: t('scores.columns.type'), render: (exam) => t(`scores.examType.${exam.examType}`) },
    {
      key: 'status',
      header: t('scores.columns.status'),
      render: (exam) =>
        exam.isLocked ? (
          <Badge tone="neutral">{t('scores.locked')}</Badge>
        ) : (
          <Badge tone="success">{t('scores.open')}</Badge>
        ),
    },
    {
      key: 'eligibility',
      header: '',
      align: 'end',
      render: (exam) => (
        <Link
          to={`/exams/${exam.id}/eligibility`}
          className="inline-flex items-center gap-1 font-semibold text-brand-text hover:underline"
        >
          <Icon name="clipboard-list" size={14} />
          {t('eligibility.link')}
        </Link>
      ),
    },
  ];

  return <DataTable columns={columns} rows={exams} getRowKey={(exam) => exam.id} />;
}

function ListSkeleton() {
  return (
    <div className="rounded-lg border border-subtle bg-surface p-4">
      <Skeleton rows={6} height={22} />
    </div>
  );
}
