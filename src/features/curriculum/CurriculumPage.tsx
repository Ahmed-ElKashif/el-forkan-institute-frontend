import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, ConfirmDialog, Toast, formatNumber } from '../../ds';
import { ListSkeleton } from '../../shared/react/PagedList';
/* Direct file imports, not the `../catalogue` barrel: that barrel's
   `CataloguePage` renders this page, and going through it would make the two
   features a cycle. */
import { useBookOptionsQuery, useSubjectOptionsQuery } from '../catalogue/catalogue.api';
import { useListExamsQuery } from '../scores/scores.api';
import {
  useCurriculumTreeQuery,
  useRemoveCurriculumMutation,
  useRemoveCurriculumUnitMutation,
  useUpdateCurriculumMutation,
} from './curriculum.api';
import { CurriculumRowCard, type RowActions } from './CurriculumRowCard';
import { CurriculumRowDialog, type RowDialogTarget } from './CurriculumRowDialog';
import { BookDialog } from './BookDialog';
import { refusalKey } from './refusal';
import { allSubjects, nextSortOrderFor } from './curriculum.model';
import type { CurriculumRow, CurriculumUnit } from './curriculum.model';

type ToastState = { tone: 'success' | 'danger'; message: string };
type BookTarget = { curriculumId: number; unit: CurriculumUnit | null; nextSortOrder: number };
type DeleteTarget = { kind: 'row' | 'unit'; id: number; name: string };

/** Which year, level and term the plan is being read for. Structural rather than
 *  imported from the catalogue, so this feature keeps no dependency on it. */
export interface PlanScope {
  yearId: number | null;
  levelId: number | null;
  termNumber: number;
}

/**
 * The study plan for one المستوى and فصل — the مواد, their فروع one level deep,
 * and the books prescribed under each.
 *
 * The year, level and term come from the screen's shared scope rather than from
 * pickers of its own, so this reads the same context the الكتب and المواد tabs
 * do, and the level hub can embed it without hiding which year is being edited.
 *
 * Every write re-reads the tree through the `Curriculum` tag, so there is no
 * local state to reconcile.
 *
 * `readOnly` renders the same plan without any way to change it. The plan is
 * owned by the الخطة الدراسية screen and shown elsewhere — a syllabus editable
 * from two places is a syllabus with two owners, and the level hub's copy gave no
 * sign it was writing the institute's record rather than that level's.
 */
export function CurriculumPage({ scope, readOnly = false }: { scope: PlanScope; readOnly?: boolean }) {
  const { t } = useTranslation();
  const subjects = useSubjectOptionsQuery();
  const books = useBookOptionsQuery();

  const { yearId, levelId, termNumber } = scope;
  const canQuery = yearId != null && levelId != null;

  const tree = useCurriculumTreeQuery(
    { yearId: yearId ?? 0, levelId: levelId ?? 0, termNumber },
    { skip: !canQuery },
  );
  /* Only to warn before a split: turning a مادة into a container makes it
     non-examinable, and the server does not stop that even when an exam already
     exists for it — that exam would simply be stranded. The exam view carries no
     curriculum id, so the subject name is what there is to match on. */
  const exams = useListExamsQuery({ levelId: levelId ?? 0 }, { skip: levelId == null });

  const [rowDialog, setRowDialog] = useState<RowDialogTarget | null>(null);
  const [bookDialog, setBookDialog] = useState<BookTarget | null>(null);
  const [splitting, setSplitting] = useState<CurriculumRow | null>(null);
  const [confirm, setConfirm] = useState<DeleteTarget | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [removeRow] = useRemoveCurriculumMutation();
  const [removeUnit] = useRemoveCurriculumUnitMutation();
  const [updateRow] = useUpdateCurriculumMutation();

  /* Adding a فرع to an examinable مادة used to fail every time: the server
     requires a parent to be a container first, and nothing said so. It is one
     action now — confirm the consequence, convert, then pick the فرع. A مادة that
     is already a container needs no conversion and no confirmation. */
  function startSplit(row: CurriculumRow) {
    if (row.isExaminable) setSplitting(row);
    else setRowDialog({ mode: 'create', parent: row });
  }

  async function confirmSplit() {
    if (!splitting) return;
    const parent = splitting;
    setSplitting(null);
    try {
      await updateRow({ id: parent.id, patch: { isExaminable: false } }).unwrap();
      setRowDialog({ mode: 'create', parent });
    } catch (cause) {
      setToast({ tone: 'danger', message: t(refusalKey(cause)) });
    }
  }

  const actions: RowActions = {
    onEdit: (row) => setRowDialog({ mode: 'edit', row }),
    onDelete: (row) => setConfirm({ kind: 'row', id: row.id, name: row.subjectNameAr }),
    onAddChild: startSplit,
    onAddUnit: (row) =>
      setBookDialog({ curriculumId: row.id, unit: null, nextSortOrder: nextSortOrderFor(row.units) }),
    onEditUnit: (row, unit) =>
      setBookDialog({ curriculumId: row.id, unit, nextSortOrder: unit.sortOrder }),
    onDeleteUnit: (unit) =>
      setConfirm({ kind: 'unit', id: unit.id, name: unit.bookTitleAr ?? unit.syllabusScopeAr }),
  };

  async function confirmDelete() {
    if (!confirm) return;
    const target = confirm;
    setConfirm(null);
    const run = target.kind === 'row' ? removeRow(target.id) : removeUnit(target.id);
    try {
      await run.unwrap();
      setToast({ tone: 'success', message: t('curriculum.deleted') });
    } catch (cause) {
      setToast({ tone: 'danger', message: t(refusalKey(cause)) });
    }
  }

  const planned = allSubjects(tree.data ?? []);
  const splitHasExam =
    splitting != null &&
    (exams.data?.items ?? []).some((exam) => exam.subjectNameAr === splitting.subjectNameAr);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PlanSummary subjects={planned} />
        {readOnly ? (
          <p className="m-0 text-xs text-ink-500">{t('curriculum.readOnlyHint')}</p>
        ) : (
          <Button icon="plus" disabled={!canQuery} onClick={() => setRowDialog({ mode: 'create', parent: null })}>
            {t('curriculum.addSubject')}
          </Button>
        )}
      </div>

      {tree.isLoading && !tree.data ? (
        <ListSkeleton />
      ) : tree.isError ? (
        <Alert tone="danger" title={t('curriculum.error')} />
      ) : !tree.data || tree.data.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-500">{t('curriculum.empty')}</p>
      ) : (
        <div className="space-y-3">
          {tree.data.map((node) => (
            <CurriculumRowCard key={node.id} node={node} actions={readOnly ? undefined : actions} />
          ))}
        </div>
      )}

      {rowDialog && yearId != null && levelId != null ? (
        <CurriculumRowDialog
          target={rowDialog}
          yearId={yearId}
          levelId={levelId}
          termNumber={termNumber}
          subjects={subjects.data ?? []}
          onClose={() => setRowDialog(null)}
          onSaved={(message) => { setRowDialog(null); setToast({ tone: 'success', message }); }}
        />
      ) : null}

      {bookDialog ? (
        <BookDialog
          curriculumId={bookDialog.curriculumId}
          unit={bookDialog.unit}
          books={books.data ?? []}
          nextSortOrder={bookDialog.nextSortOrder}
          onClose={() => setBookDialog(null)}
          onSaved={(message) => { setBookDialog(null); setToast({ tone: 'success', message }); }}
        />
      ) : null}

      {splitting ? (
        <ConfirmDialog
          title={t('curriculum.split.title', { name: splitting.subjectNameAr })}
          consequence={
            splitHasExam
              ? t('curriculum.split.consequenceWithExam', { name: splitting.subjectNameAr })
              : t('curriculum.split.consequence', { name: splitting.subjectNameAr })
          }
          confirmLabel={t('curriculum.split.confirm')}
          cancelLabel={t('curriculum.cancel')}
          tone={splitHasExam ? 'danger' : undefined}
          onConfirm={confirmSplit}
          onCancel={() => setSplitting(null)}
        />
      ) : null}

      {confirm ? (
        <ConfirmDialog
          title={t(confirm.kind === 'row' ? 'curriculum.deleteRowTitle' : 'curriculum.books.removeTitle')}
          consequence={t(
            confirm.kind === 'row' ? 'curriculum.deleteRowConsequence' : 'curriculum.books.removeConfirm',
            { name: confirm.name },
          )}
          confirmLabel={t('curriculum.delete')}
          cancelLabel={t('curriculum.cancel')}
          onConfirm={confirmDelete}
          onCancel={() => setConfirm(null)}
        />
      ) : null}

      {toast ? (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <Toast tone={toast.tone} message={toast.message} onDismiss={() => setToast(null)} />
        </div>
      ) : null}
    </section>
  );
}

/** What this level and term actually commits to. «بلا كتاب» is the one worth
 *  watching: a مادة with no book prescribed is a syllabus nobody can teach from. */
function PlanSummary({ subjects }: { subjects: CurriculumRow[] }) {
  const { t } = useTranslation();
  if (subjects.length === 0) return <span />;

  const mandatory = subjects.filter((row) => row.isMandatory).length;
  const withoutBook = subjects.filter((row) => row.isExaminable && row.units.length === 0).length;

  return (
    <p className="m-0 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500">
      <span>{t('curriculum.summary.subjects', { count: formatNumber(subjects.length) })}</span>
      <span>{t('curriculum.summary.mandatory', { count: formatNumber(mandatory) })}</span>
      {withoutBook > 0 ? (
        <span className="text-warning">
          {t('curriculum.summary.withoutBook', { count: formatNumber(withoutBook) })}
        </span>
      ) : null}
    </p>
  );
}
