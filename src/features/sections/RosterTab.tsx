import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  SearchInput,
  Select,
  Toast,
  formatNumber,
  type ActionItem,
  type Column,
} from '../../ds';
import { PagedList } from '../../shared/react/PagedList';
import { useAuth } from '../auth';
/* Direct file imports, not the `../students` barrel: that barrel pulls
   StudentProfilePage → AssignYearDialog → this `../sections` barrel, which would
   make the two features a cycle. These modules have no path back to sections. */
import { AddToClassDialog } from '../students/AddToClassDialog';
import { StudentFormDialog } from '../students/StudentFormDialog';
import { useGetStudentQuery } from '../students/students.api';
import { useListEnrollmentsQuery, useUpdateEnrollmentMutation } from './sections.api';
import type { Enrollment } from './section.model';

type ToastState = { tone: 'success' | 'danger'; message: string };

/* Active is the live roster. Withdrawn is who dropped or took the level off.
   Completed is who was promoted out — offered because the alternative is a
   cohort vanishing without trace: once a level's intake is promoted, its roster
   is legitimately empty, and with no way to look at the completed enrolments the
   head teacher cannot tell that from a class that lost its students. */
const STATUS_FILTERS = ['active', 'completed', 'withdrawn'] as const;

/** A class roster, and the place a teacher manages its students. Both roles add
 *  and edit; only the head teacher withdraws (reversible — the student stays in
 *  the institute and can be brought back, which is how a year off then a return
 *  works). Search and the status filter fold the old standalone students page in:
 *  find who took the level off, or add someone new/returning. */
export function RosterTab({
  sectionId,
  sectionGender,
  sectionBranchId,
}: {
  sectionId: string;
  sectionGender: 'male' | 'female';
  sectionBranchId: number | null;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isHeadTeacher = user?.role === 'head_teacher';

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('active');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<Enrollment | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const list = useListEnrollmentsQuery({ sectionId, page, status });
  const [updateEnrollment] = useUpdateEnrollmentMutation();
  // The edit dialog needs the full record; fetch it only while a row is open.
  const editing = useGetStudentQuery(editingId ?? '', { skip: editingId == null });

  // Search filters the loaded page client-side — a class is small (one page in
  // practice). ponytail: add a server `search` param on GET /enrollments if a
  // cohort ever spans pages.
  const term = search.trim();
  const filtered = term === ''
    ? list.data?.items ?? []
    : (list.data?.items ?? []).filter((e) => e.studentName.includes(term));
  const view = list.data ? { ...list.data, items: filtered } : undefined;

  async function setEnrollmentStatus(enrollment: Enrollment, next: string, message: string) {
    try {
      await updateEnrollment({ id: enrollment.id, status: next }).unwrap();
      setToast({ tone: 'success', message });
    } catch {
      setToast({ tone: 'danger', message: t('sections.detail.roster.statusError') });
    }
  }

  const columns: Column<Enrollment>[] = [
    {
      key: 'student',
      header: t('sections.detail.roster.student'),
      // The whole row opens the profile (onRowClick below); the name is plain text.
      // A carry badge flags a subject still owed from an earlier level; the detail
      // is on the profile the row opens.
      render: (row) => (
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink-900">{row.studentName}</span>
          {row.pendingCarryCount > 0 ? (
            <Badge tone="warning" icon="triangle-alert">
              {t('sections.detail.roster.carries', { count: formatNumber(row.pendingCarryCount) })}
            </Badge>
          ) : null}
        </span>
      ),
    },
    { key: 'entry', header: t('sections.detail.roster.entry'), render: (row) => t(`sections.entryType.${row.entryType}`, row.entryType) },
    {
      key: 'status',
      header: t('sections.detail.roster.status'),
      render: (row) => (
        <Badge tone={row.status === 'active' ? 'success' : 'neutral'}>
          {t(`students.profile.enrollmentStatus.${row.status}`, row.status)}
        </Badge>
      ),
    },
  ];

  const rowActions = (row: Enrollment): ActionItem[] => {
    const actions: ActionItem[] = [
      { key: 'edit', label: t('sections.detail.roster.edit'), icon: 'pencil', onSelect: () => setEditingId(row.studentId) },
    ];
    // Withdraw / bring-back is the head teacher's call (the "delete" of a roster).
    if (isHeadTeacher) {
      if (row.status === 'active') {
        actions.push({ key: 'withdraw', label: t('sections.detail.roster.withdraw'), icon: 'log-out', tone: 'danger', onSelect: () => setWithdrawing(row) });
      } else {
        actions.push({ key: 'reactivate', label: t('sections.detail.roster.reactivate'), icon: 'rotate-ccw', onSelect: () => setEnrollmentStatus(row, 'active', t('sections.detail.roster.reactivated')) });
      }
    }
    return actions;
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t('sections.detail.roster.search')}
            placeholder={t('sections.detail.roster.search')}
          />
          <Field label={t('sections.detail.roster.statusFilter')} className="w-40">
            <Select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              aria-label={t('sections.detail.roster.statusFilter')}
              options={STATUS_FILTERS.map((value) => ({ value, label: t(`students.profile.enrollmentStatus.${value}`) }))}
            />
          </Field>
        </div>
        <Button size="sm" icon="plus" onClick={() => setAdding(true)}>
          {t('sections.detail.roster.add')}
        </Button>
      </div>

      <PagedList
        data={view}
        isLoading={list.isLoading}
        isError={list.isError}
        isFetching={list.isFetching}
        columns={columns}
        getRowKey={(row) => row.id}
        errorTitle={t('sections.detail.roster.error')}
        page={page}
        onPage={setPage}
        onRowClick={(row) => navigate(`/students/${row.studentId}`)}
        rowActions={rowActions}
        empty={
          term !== '' ? (
            <EmptyState icon="search" title={t('students.emptySearch.title')} description={t('students.emptySearch.description', { term })} />
          ) : (
            <EmptyState icon="users" title={t('sections.detail.roster.empty.title')} description={t('sections.detail.roster.emptyAdd')} />
          )
        }
      />

      {adding ? (
        <AddToClassDialog
          sectionId={sectionId}
          sectionGender={sectionGender}
          sectionBranchId={sectionBranchId}
          onClose={() => setAdding(false)}
          onDone={(message) => { setAdding(false); setToast({ tone: 'success', message }); }}
        />
      ) : null}

      {editingId != null && editing.data ? (
        <StudentFormDialog
          student={editing.data}
          onClose={() => setEditingId(null)}
          onSaved={(message) => { setEditingId(null); setToast({ tone: 'success', message }); }}
        />
      ) : null}

      {withdrawing ? (
        <ConfirmDialog
          title={t('sections.detail.roster.withdraw')}
          consequence={t('sections.detail.roster.withdrawConfirm', { name: withdrawing.studentName })}
          confirmLabel={t('sections.detail.roster.withdraw')}
          onConfirm={() => {
            const target = withdrawing;
            setWithdrawing(null);
            void setEnrollmentStatus(target, 'withdrawn', t('sections.detail.roster.withdrawn'));
          }}
          onCancel={() => setWithdrawing(null)}
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
