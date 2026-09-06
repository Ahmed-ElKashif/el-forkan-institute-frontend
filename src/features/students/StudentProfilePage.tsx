import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Icon,
  IconButton,
  RoleGate,
  StatCard,
  Toast,
  formatNumber,
  type BadgeProps,
  type Column,
} from '../../ds';
import { useCurrentAcademicYearQuery } from '../../shared/api/calendar';
import { ListSkeleton } from '../../shared/react/PagedList';
import { useGovernoratesQuery, useMarkazesQuery } from '../../shared/api/reference';
import { useAuth } from '../auth';
import { AssignYearDialog } from './AssignYearDialog';
import { StudentFormDialog } from './StudentFormDialog';
import {
  useGetStudentQuery,
  useLazyRevealNationalIdQuery,
  useStudentAttendanceQuery,
  useStudentEnrollmentsQuery,
  useStudentExamResultsQuery,
  useStudentPlacementsQuery,
  useWarnAbsenceMutation,
} from './students.api';
import type {
  AbsencePosition,
  AttendanceRecord,
  EnrollmentHistoryItem,
  ExamResult,
  Placement,
  StudentDetail,
} from './student.model';

/** Status → chip tone. Graduation is the one ceremony (gold) case. */
const STATUS_TONE: Record<string, NonNullable<BadgeProps['tone']>> = {
  active: 'success',
  graduated: 'ceremony',
  withdrawn: 'danger',
  suspended: 'warning',
};

/** Exam/attendance verdict → chip tone, shared by the scores and attendance
 *  panels (pass/present are the same green, absent the same red). */
const OUTCOME_TONE: Record<string, NonNullable<BadgeProps['tone']>> = {
  pass: 'success',
  present: 'success',
  late: 'warning',
  excused: 'info',
  fail: 'danger',
  absent: 'danger',
  pending: 'neutral',
};

/**
 * A student's profile: identity and contact record on one side, the academic
 * record — attendance, exam results, enrollment timeline, placements — on the
 * other. Each panel owns its own query so one slow or failed record read never
 * blanks the rest of the page; RTK Query dedupes the enrollment read the header
 * and the timeline panel share.
 */
export function StudentProfilePage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const student = useGetStudentQuery(id, { skip: id === '' });

  if (student.isLoading) return <ListSkeleton />;
  if (student.isError || !student.data) {
    return (
      <EmptyState
        icon="user"
        title={t('students.profile.notFound.title')}
        description={t('students.profile.notFound.description')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <ProfileHeader student={student.data} />
      <div className="grid gap-6 lg:grid-cols-3">
        <InfoCard student={student.data} />
        <div className="space-y-6 lg:col-span-2">
          <AttendancePanel id={id} />
          <ScoresPanel id={id} />
          <EnrollmentPanel id={id} />
          <PlacementsPanel id={id} />
        </div>
      </div>
    </div>
  );
}

function ProfileHeader({ student }: { student: StudentDetail }) {
  const { t } = useTranslation();
  // The study year is the current-year enrollment's level. The timeline panel
  // already has this query in flight, so this read is free.
  const enrollments = useStudentEnrollmentsQuery(student.id);
  const currentYear = useCurrentAcademicYearQuery();
  const currentEnrollment =
    enrollments.data?.find((e) => e.academicYearId === currentYear.data?.id) ?? null;
  const studyYear = currentEnrollment?.levelName ?? null;
  const [assigning, setAssigning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Link
        to="/students"
        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-text hover:underline"
      >
        <Icon name="chevron-right" size={16} mirror />
        {t('students.profile.back')}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-ink-900">{student.fullName}</h1>
        <Badge tone={STATUS_TONE[student.status] ?? 'neutral'}>
          {t(`students.status.${student.status}`)}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
        <span>
          {t('students.profile.code')}: <span className="ef-num">{student.studentCode}</span>
        </span>
        <span>{t(`students.gender.${student.gender}`)}</span>
        {studyYear ? (
          // Year on file, but correctable — a wrong year from the legacy import
          // is fixed by transferring the enrollment to the right section.
          <span className="inline-flex items-center gap-1">
            {t('students.columns.studyYear')}: {studyYear}
            <IconButton
              icon="pencil"
              label={t('students.profile.assignYear.editButton')}
              size="sm"
              variant="outline"
              onClick={() => setAssigning(true)}
            />
          </span>
        ) : (
          // Legacy imports arrive with no year on the row; assign it here.
          <Button size="sm" variant="secondary" icon="pencil" onClick={() => setAssigning(true)}>
            {t('students.profile.assignYear.button')}
          </Button>
        )}
      </div>

      {assigning ? (
        <AssignYearDialog
          studentId={student.id}
          gender={student.gender}
          enrollmentId={currentEnrollment?.id}
          onClose={() => setAssigning(false)}
          onSaved={(message) => {
            setAssigning(false);
            setToast(message);
          }}
        />
      ) : null}
      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}

function InfoCard({ student }: { student: StudentDetail }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Resolve the governorate/markaz ids to names for the read view. Both lists
  // are small and cached; the markaz read waits until a governorate is set.
  const governorates = useGovernoratesQuery();
  const markazes = useMarkazesQuery(student.governorateId ?? 0, {
    skip: student.governorateId == null,
  });
  const govName =
    governorates.data?.items.find((g) => g.id === student.governorateId)?.nameAr ?? null;
  const markazName =
    markazes.data?.items.find((m) => m.id === student.markazId)?.nameAr ?? null;

  return (
    <Card
      title={t('students.profile.info.title')}
      className="self-start lg:col-span-1"
      action={
        <Button size="sm" variant="secondary" icon="pencil" onClick={() => setEditing(true)}>
          {t('students.form.edit')}
        </Button>
      }
    >
      <dl className="space-y-3">
        <InfoRow label={t('students.profile.info.phone')} value={student.phone} numeric />
        <InfoRow label={t('students.profile.info.whatsapp')} value={student.whatsappPhone} numeric />
        <InfoRow label={t('students.profile.info.birthDate')} value={student.birthDate} numeric />
        <InfoRow label={t('students.form.governorate')} value={govName} />
        <InfoRow label={t('students.form.markaz')} value={markazName} />
        <InfoRow label={t('students.profile.info.address')} value={student.address} />
        <InfoRow label={t('students.profile.info.notes')} value={student.notes} />
        <NationalIdRow student={student} />
      </dl>

      {editing ? (
        <StudentFormDialog
          student={student}
          onClose={() => setEditing(false)}
          onSaved={(message) => {
            setEditing(false);
            setToast(message);
          }}
        />
      ) : null}
      {toast ? (
        <Toast tone="success" message={toast} onDismiss={() => setToast(null)} />
      ) : null}
    </Card>
  );
}

function InfoRow({
  label,
  value,
  numeric = false,
}: {
  label: string;
  value: string | null;
  numeric?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-sm text-ink-500">{label}</dt>
      <dd className={`m-0 text-end text-sm font-medium text-ink-900 ${numeric ? 'ef-num' : ''}`}>
        {value ? value : <span className="text-ink-400">—</span>}
      </dd>
    </div>
  );
}

/** The national ID is head-teacher only and audited, so it is never loaded with
 *  the profile — a reveal button fetches it on demand. */
function NationalIdRow({ student }: { student: StudentDetail }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reveal, revealed] = useLazyRevealNationalIdQuery();

  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-sm text-ink-500">{t('students.profile.info.nationalId')}</dt>
      <dd className="m-0 text-end text-sm font-medium text-ink-900">
        {revealed.data ? (
          <span className="ef-num">{revealed.data.nationalId ?? '—'}</span>
        ) : !student.hasNationalId ? (
          <span className="text-ink-400">{t('students.profile.info.nationalIdNone')}</span>
        ) : (
          <RoleGate
            role={user?.role ?? 'teacher'}
            allow="head_teacher"
            fallback={<Badge tone="neutral" icon="lock">{t('students.profile.info.onFile')}</Badge>}
          >
            <Button
              size="sm"
              variant="secondary"
              icon="eye"
              loading={revealed.isLoading}
              onClick={() => reveal(student.id)}
            >
              {t('students.profile.info.reveal')}
            </Button>
          </RoleGate>
        )}
      </dd>
    </div>
  );
}

function AttendancePanel({ id }: { id: string }) {
  const { t } = useTranslation();
  const query = useStudentAttendanceQuery(id);

  const columns: Column<AttendanceRecord>[] = [
    { key: 'date', header: t('students.profile.attendance.date'), numeric: true, render: (r) => r.sessionDate },
    { key: 'subject', header: t('students.profile.attendance.subject'), render: (r) => r.subjectName },
    { key: 'section', header: t('students.profile.attendance.section'), render: (r) => r.sectionName },
    {
      key: 'status',
      header: t('students.profile.attendance.status'),
      render: (r) => (
        <Badge tone={OUTCOME_TONE[r.status] ?? 'neutral'}>
          {t(`students.profile.att.${r.status}`)}
        </Badge>
      ),
    },
  ];

  const position = query.data?.position ?? null;

  return (
    <Card title={t('students.profile.attendance.title')}>
      {query.isError ? (
        <Alert tone="danger" title={t('students.profile.attendance.error')} />
      ) : query.data && (query.data.total > 0 || position) ? (
        <div className="space-y-4">
          {position && position.risk !== 'none' ? (
            <AbsenceBanner id={id} position={position} />
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t('students.profile.att.present')} value={formatNumber(query.data.present)} />
            <StatCard label={t('students.profile.att.absent')} value={formatNumber(query.data.absent)} />
            <StatCard label={t('students.profile.att.late')} value={formatNumber(query.data.late)} />
            <StatCard label={t('students.profile.att.excused')} value={formatNumber(query.data.excused)} />
          </div>
          {query.data.recent.length > 0 ? (
            <DataTable columns={columns} rows={query.data.recent} getRowKey={(_, i) => i} />
          ) : null}
        </div>
      ) : (
        <EmptyState icon="calendar-days" title={t('students.profile.attendance.empty')} />
      )}
    </Card>
  );
}

/** The absence-limit banner: how close the student is this term, when a warning
 *  was last sent, and a button to send the Arabic WhatsApp warning on demand. */
function AbsenceBanner({ id, position }: { id: string; position: AbsencePosition }) {
  const { t } = useTranslation();
  const [warn, warnState] = useWarnAbsenceMutation();
  const [toast, setToast] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);

  async function send() {
    try {
      const result = await warn(id).unwrap();
      const ok = result.status === 'sent' || result.status === 'queued';
      setToast({ tone: ok ? 'success' : 'danger', message: t(`students.profile.warn.${result.status}`) });
    } catch {
      setToast({ tone: 'danger', message: t('students.profile.warn.error') });
    }
  }

  return (
    <>
      <Alert
        tone={position.risk === 'over' ? 'danger' : 'warning'}
        title={t(`students.profile.absence.${position.risk}`, {
          count: formatNumber(position.absences),
          max: formatNumber(position.maxAbsences),
        })}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm">
            {position.warningSentAt
              ? t('students.profile.warn.sentAt', { date: position.warningSentAt.slice(0, 10) })
              : t('students.profile.warn.notSent')}
          </span>
          <Button size="sm" variant="secondary" icon="message-circle" onClick={send} loading={warnState.isLoading}>
            {t('students.profile.warn.send')}
          </Button>
        </div>
      </Alert>
      {toast ? <Toast tone={toast.tone} message={toast.message} onDismiss={() => setToast(null)} /> : null}
    </>
  );
}

function ScoresPanel({ id }: { id: string }) {
  const { t } = useTranslation();
  const query = useStudentExamResultsQuery(id);

  const columns: Column<ExamResult>[] = [
    { key: 'subject', header: t('students.profile.scores.subject'), render: (r) => r.subjectName },
    { key: 'type', header: t('students.profile.scores.type'), render: (r) => t(`scores.examType.${r.examType}`) },
    {
      key: 'score',
      header: t('students.profile.scores.score'),
      numeric: true,
      render: (r) =>
        r.isAbsent ? '—' : `${formatNumber(r.score ?? 0)} / ${formatNumber(r.maxScore)}`,
    },
    {
      key: 'result',
      header: t('students.profile.scores.result'),
      render: (r) => (
        <Badge tone={OUTCOME_TONE[r.result] ?? 'neutral'}>{t(`scores.result.${r.result}`)}</Badge>
      ),
    },
  ];

  return (
    <Card title={t('students.profile.scores.title')}>
      {query.isError ? (
        <Alert tone="danger" title={t('students.profile.scores.error')} />
      ) : query.data && query.data.length > 0 ? (
        <DataTable columns={columns} rows={query.data} getRowKey={(r) => r.id} />
      ) : (
        <EmptyState icon="file-text" title={t('students.profile.scores.empty')} />
      )}
    </Card>
  );
}

function EnrollmentPanel({ id }: { id: string }) {
  const { t } = useTranslation();
  const query = useStudentEnrollmentsQuery(id);

  const columns: Column<EnrollmentHistoryItem>[] = [
    {
      key: 'year',
      header: t('students.profile.enrollments.year'),
      numeric: true,
      render: (r) => (r.hijriYear != null ? formatNumber(r.hijriYear) : '—'),
    },
    { key: 'level', header: t('students.profile.enrollments.level'), render: (r) => r.levelName ?? '—' },
    { key: 'section', header: t('students.profile.enrollments.section'), render: (r) => r.sectionName },
    {
      key: 'status',
      header: t('students.profile.enrollments.status'),
      render: (r) => t(`students.profile.enrollmentStatus.${r.status}`),
    },
  ];

  return (
    <Card title={t('students.profile.enrollments.title')}>
      {query.isError ? (
        <Alert tone="danger" title={t('students.profile.enrollments.error')} />
      ) : query.data && query.data.length > 0 ? (
        <DataTable columns={columns} rows={query.data} getRowKey={(r) => r.id} />
      ) : (
        <EmptyState icon="history" title={t('students.profile.enrollments.empty')} />
      )}
    </Card>
  );
}

function PlacementsPanel({ id }: { id: string }) {
  const { t } = useTranslation();
  const query = useStudentPlacementsQuery(id);

  const columns: Column<Placement>[] = [
    { key: 'date', header: t('students.profile.placements.date'), numeric: true, render: (r) => r.assessedOn },
    { key: 'method', header: t('students.profile.placements.method'), render: (r) => r.method },
    {
      key: 'score',
      header: t('students.profile.placements.score'),
      numeric: true,
      render: (r) =>
        r.score != null && r.maxScore != null
          ? `${formatNumber(r.score)} / ${formatNumber(r.maxScore)}`
          : '—',
    },
    {
      key: 'result',
      header: t('students.profile.placements.result'),
      render: (r) =>
        r.isPassed == null ? (
          <span className="text-ink-400">—</span>
        ) : (
          <Badge tone={r.isPassed ? 'success' : 'danger'}>
            {t(r.isPassed ? 'students.profile.placements.passed' : 'students.profile.placements.failed')}
          </Badge>
        ),
    },
  ];

  return (
    <Card title={t('students.profile.placements.title')}>
      {query.isError ? (
        <Alert tone="danger" title={t('students.profile.placements.error')} />
      ) : query.data && query.data.length > 0 ? (
        <DataTable columns={columns} rows={query.data} getRowKey={(r) => r.id} />
      ) : (
        <EmptyState icon="clipboard-list" title={t('students.profile.placements.empty')} />
      )}
    </Card>
  );
}
