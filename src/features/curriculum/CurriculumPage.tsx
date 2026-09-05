import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, ConfirmDialog, Field, Select, Toast, formatNumber, type SelectOption } from '../../ds';
import { ListSkeleton } from '../../shared/react/PagedList';
import { useAcademicYearsQuery } from '../../shared/api/calendar';
import { useBookOptionsQuery, useLevelsQuery, useSubjectOptionsQuery } from '../catalogue';
import {
  useCurriculumTreeQuery,
  useRemoveCurriculumMutation,
  useRemoveCurriculumUnitMutation,
} from './curriculum.api';
import { CurriculumRowCard, type RowActions } from './CurriculumRowCard';
import { CurriculumRowDialog, type RowDialogTarget } from './CurriculumRowDialog';
import { UnitDialog } from './UnitDialog';
import type { CurriculumUnit } from './curriculum.model';

const TERMS = [1, 2];

type ToastState = { tone: 'success' | 'danger'; message: string };
type UnitTarget = { curriculumId: number; unit: CurriculumUnit | null };
type DeleteTarget = { kind: 'row' | 'unit'; id: number; name: string };

/** The curriculum builder (head-teacher only, gated): pick a year, level and
 *  term, then build the syllabus tree — مواد, their فروع one level deep, and the
 *  units (book + scope) under each. Every write re-reads the tree via the
 *  `Curriculum` tag, so the screen has no local state to reconcile. */
export function CurriculumPage() {
  const { t } = useTranslation();
  const years = useAcademicYearsQuery();
  const levels = useLevelsQuery();
  const subjects = useSubjectOptionsQuery();
  const books = useBookOptionsQuery();

  const [pickedYear, setPickedYear] = useState<number | null>(null);
  const [pickedLevel, setPickedLevel] = useState<number | null>(null);
  const [termNumber, setTermNumber] = useState(1);

  // Default to the newest year and the first level until the user picks; derived
  // during render so there is no set-state-in-effect.
  const yearId = pickedYear ?? years.data?.[0]?.id ?? null;
  const levelId = pickedLevel ?? levels.data?.[0]?.id ?? null;
  const canQuery = yearId != null && levelId != null;

  const tree = useCurriculumTreeQuery(
    { yearId: yearId ?? 0, levelId: levelId ?? 0, termNumber },
    { skip: !canQuery },
  );

  const [rowDialog, setRowDialog] = useState<RowDialogTarget | null>(null);
  const [unitDialog, setUnitDialog] = useState<UnitTarget | null>(null);
  const [confirm, setConfirm] = useState<DeleteTarget | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [removeRow] = useRemoveCurriculumMutation();
  const [removeUnit] = useRemoveCurriculumUnitMutation();

  const actions: RowActions = {
    onEdit: (row) => setRowDialog({ mode: 'edit', row }),
    onDelete: (row) => setConfirm({ kind: 'row', id: row.id, name: row.subjectNameAr }),
    onAddChild: (row) => setRowDialog({ mode: 'create', parent: row }),
    onAddUnit: (row) => setUnitDialog({ curriculumId: row.id, unit: null }),
    onEditUnit: (row, unit) => setUnitDialog({ curriculumId: row.id, unit }),
    onDeleteUnit: (unit) => setConfirm({ kind: 'unit', id: unit.id, name: unit.syllabusScopeAr }),
  };

  async function confirmDelete() {
    if (!confirm) return;
    const run = confirm.kind === 'row' ? removeRow(confirm.id) : removeUnit(confirm.id);
    try {
      await run.unwrap();
      setToast({ tone: 'success', message: t('curriculum.deleted') });
    } catch {
      setToast({ tone: 'danger', message: t('curriculum.saveError') });
    } finally {
      setConfirm(null);
    }
  }

  const yearOptions: SelectOption[] = (years.data ?? []).map((y) => ({ value: y.id, label: `${formatNumber(y.hijriYear)} هـ` }));
  const levelOptions: SelectOption[] = (levels.data ?? []).map((l) => ({ value: l.id, label: l.nameAr }));
  const termOptions: SelectOption[] = TERMS.map((n) => ({ value: n, label: t('curriculum.term', { n: formatNumber(n) }) }));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t('curriculum.filters.year')} className="w-40">
          <Select options={yearOptions} value={yearId ?? ''} onChange={(e) => setPickedYear(Number(e.target.value))} aria-label={t('curriculum.filters.year')} />
        </Field>
        <Field label={t('curriculum.filters.level')} className="w-48">
          <Select options={levelOptions} value={levelId ?? ''} onChange={(e) => setPickedLevel(Number(e.target.value))} aria-label={t('curriculum.filters.level')} />
        </Field>
        <Field label={t('curriculum.filters.term')} className="w-40">
          <Select options={termOptions} value={termNumber} onChange={(e) => setTermNumber(Number(e.target.value))} aria-label={t('curriculum.filters.term')} />
        </Field>
        <Button
          className="ms-auto"
          icon="plus"
          disabled={!canQuery}
          onClick={() => setRowDialog({ mode: 'create', parent: null })}
        >
          {t('curriculum.addSubject')}
        </Button>
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
            <CurriculumRowCard key={node.id} node={node} actions={actions} />
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

      {unitDialog ? (
        <UnitDialog
          curriculumId={unitDialog.curriculumId}
          unit={unitDialog.unit}
          books={books.data ?? []}
          onClose={() => setUnitDialog(null)}
          onSaved={(message) => { setUnitDialog(null); setToast({ tone: 'success', message }); }}
        />
      ) : null}

      {confirm ? (
        <ConfirmDialog
          title={t(confirm.kind === 'row' ? 'curriculum.deleteRowTitle' : 'curriculum.deleteUnitTitle')}
          consequence={t(confirm.kind === 'row' ? 'curriculum.deleteRowConsequence' : 'curriculum.deleteUnitConsequence', { name: confirm.name })}
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
