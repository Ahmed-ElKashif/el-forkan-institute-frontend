import { useTranslation } from 'react-i18next';
import {
  Alert,
  BarChart,
  Card,
  Donut,
  EmptyState,
  LineChart,
  Skeleton,
  StatCard,
  formatNumber,
  type BarRow,
  type IconName,
  type LinePoint,
} from '../../ds';
import { useAcademicYearQuery, useCurrentAcademicYearQuery, defaultTerm } from '../../shared/api/calendar';
import {
  useAttendanceTrendQuery,
  useDashboardSummaryQuery,
  useHeadcountByLevelQuery,
  useHeadcountByMarkazQuery,
  usePassRatesQuery,
} from './dashboard.api';
import type { DashboardSummary } from './dashboard.model';

/** The signed-in landing page: the current year's headline numbers plus two
 *  analytics — enrolment by level and exam outcomes — all scoped by the API to
 *  what this user may see. Read-only; every figure and chart mirrors a report
 *  endpoint rather than a second computation that could disagree. */
export function DashboardPage() {
  const { t } = useTranslation();
  const year = useCurrentAcademicYearQuery();
  const summary = useDashboardSummaryQuery(year.data?.id ?? 0, {
    // Nothing to summarise until the year is known; asking with id 0 would 404.
    skip: year.data == null,
  });

  if (year.isLoading || summary.isLoading) return <StatGridSkeleton />;

  if (year.isError || summary.isError) {
    return <Alert tone="danger" title={t('dashboard.error')} />;
  }

  // The API answered, but the institute has no academic year yet — an honest
  // empty state, not a grid of zeros that looks like real data.
  if (year.data == null || summary.data == null) {
    return (
      <EmptyState
        icon="calendar-days"
        title={t('dashboard.noYear.title')}
        description={t('dashboard.noYear.description')}
      />
    );
  }

  return (
    <SummaryGrid
      summary={summary.data}
      caption={t('dashboard.yearCaption', { year: formatNumber(summary.data.hijriYear) })}
    />
  );
}

interface StatDescriptor {
  key: string;
  labelKey: string;
  icon: IconName;
  value: number;
  unit?: string;
  detail?: string;
}

function SummaryGrid({ summary, caption }: { summary: DashboardSummary; caption: string }) {
  const { t } = useTranslation();
  const { students } = summary;

  const stats: StatDescriptor[] = [
    { key: 'students', labelKey: 'dashboard.cards.activeStudents', icon: 'users', value: students.active },
    { key: 'sections', labelKey: 'dashboard.cards.sections', icon: 'book-open', value: summary.sections },
    {
      key: 'phone',
      labelKey: 'dashboard.cards.phoneCoverage',
      icon: 'message-circle',
      value: students.phoneCoverage,
      unit: '%',
      detail: t('dashboard.cards.withPhoneDetail', {
        withPhone: formatNumber(students.withPhone),
        total: formatNumber(students.active),
      }),
    },
    { key: 'carries', labelKey: 'dashboard.cards.pendingCarries', icon: 'rotate-ccw', value: summary.pendingCarries },
    { key: 'certificates', labelKey: 'dashboard.cards.certificates', icon: 'award', value: summary.certificatesIssued },
  ];

  return (
    <section aria-label={caption} className="space-y-6">
      <p className="m-0 text-sm text-ink-500">{caption}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <StatCard
            key={stat.key}
            icon={stat.icon}
            label={t(stat.labelKey)}
            value={formatNumber(stat.value)}
            unit={stat.unit}
            trend={stat.detail}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title={t('dashboard.charts.headcountTitle')} className="lg:col-span-2">
          <HeadcountChart yearId={summary.academicYearId} />
        </Card>
        <Card title={t('dashboard.charts.passRatesTitle')}>
          <PassRatesChart yearId={summary.academicYearId} />
        </Card>
        <Card title={t('dashboard.charts.markazTitle')}>
          <MarkazChart yearId={summary.academicYearId} />
        </Card>
        <Card title={t('dashboard.charts.trendTitle')} className="lg:col-span-2">
          <AttendanceTrendChart yearId={summary.academicYearId} />
        </Card>
      </div>
    </section>
  );
}

/** Students per level, split boys/girls. */
function HeadcountChart({ yearId }: { yearId: number }) {
  const { t } = useTranslation();
  const query = useHeadcountByLevelQuery(yearId);

  if (query.isLoading) return <Skeleton rows={5} height={24} />;
  if (query.isError) return <Alert tone="danger" title={t('dashboard.charts.error')} />;

  const cells = (query.data ?? []).filter((cell) => cell.total > 0);
  if (cells.length === 0) {
    return <EmptyState icon="users" title={t('dashboard.charts.headcountEmpty')} />;
  }

  const boys = t('dashboard.charts.boys');
  const girls = t('dashboard.charts.girls');
  const rows: BarRow[] = cells.map((cell) => ({
    label: cell.levelNameAr,
    segments: [
      { value: cell.male, className: 'bg-teal-500', label: boys },
      { value: cell.female, className: 'bg-gold-400', label: girls },
    ],
  }));

  return (
    <BarChart
      rows={rows}
      formatValue={formatNumber}
      legend={[
        { label: boys, className: 'bg-teal-500' },
        { label: girls, className: 'bg-gold-400' },
      ]}
    />
  );
}

/** Exam outcomes across every subject, as a pass/fail/absent ring. */
function PassRatesChart({ yearId }: { yearId: number }) {
  const { t } = useTranslation();
  const query = usePassRatesQuery(yearId);

  if (query.isLoading) return <Skeleton rows={4} height={24} />;
  if (query.isError) return <Alert tone="danger" title={t('dashboard.charts.error')} />;

  const rows = query.data ?? [];
  const passed = sumBy(rows, (r) => r.passed);
  const failed = sumBy(rows, (r) => r.failed);
  const absent = sumBy(rows, (r) => r.absent);
  const graded = passed + failed + absent;

  if (graded === 0) {
    return <EmptyState icon="file-text" title={t('dashboard.charts.passRatesEmpty')} />;
  }

  const rate = Math.round((passed / graded) * 100);
  const legend = [
    { label: t('scores.result.pass'), value: passed, dot: 'bg-success', stroke: 'stroke-success' },
    { label: t('scores.result.fail'), value: failed, dot: 'bg-danger', stroke: 'stroke-danger' },
    { label: t('scores.result.absent'), value: absent, dot: 'bg-ink-400', stroke: 'stroke-ink-400' },
  ];

  return (
    <div className="flex flex-col items-center gap-4">
      <Donut
        segments={legend.map((item) => ({ value: item.value, className: item.stroke, label: item.label }))}
        centerValue={`${formatNumber(rate)}%`}
        centerLabel={t('dashboard.charts.passRate')}
      />
      <ul className="m-0 grid w-full list-none gap-1.5 p-0">
        {legend.map((item) => (
          <li key={item.label} className="flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-2 text-ink-700">
              <span className={`size-2.5 rounded-full ${item.dot}`} aria-hidden="true" />
              {item.label}
            </span>
            <span className="ef-num font-semibold text-ink-900">{formatNumber(item.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Students per markaz — a horizontal bar list. */
function MarkazChart({ yearId }: { yearId: number }) {
  const { t } = useTranslation();
  const query = useHeadcountByMarkazQuery(yearId);

  if (query.isLoading) return <Skeleton rows={4} height={24} />;
  if (query.isError) return <Alert tone="danger" title={t('dashboard.charts.error')} />;

  const cells = (query.data ?? []).filter((cell) => cell.count > 0);
  if (cells.length === 0) {
    return <EmptyState icon="users" title={t('dashboard.charts.markazEmpty')} />;
  }

  const rows: BarRow[] = cells.map((cell) => ({
    label: cell.markazNameAr,
    segments: [{ value: cell.count, className: 'bg-teal-500', label: cell.markazNameAr }],
  }));
  return <BarChart rows={rows} formatValue={formatNumber} />;
}

/** Attendance rate across the current term's session days — a trend line. */
function AttendanceTrendChart({ yearId }: { yearId: number }) {
  const { t } = useTranslation();
  const year = useAcademicYearQuery(yearId);
  const termId = defaultTerm(year.data?.terms ?? [])?.id ?? null;
  const query = useAttendanceTrendQuery(termId ?? 0, { skip: termId == null });

  if (year.isLoading || query.isLoading) return <Skeleton rows={4} height={24} />;
  if (query.isError) return <Alert tone="danger" title={t('dashboard.charts.error')} />;

  const points: LinePoint[] = (query.data ?? []).map((p) => ({
    label: p.sessionDate.slice(5),
    value: p.attendanceRate,
  }));
  if (points.length === 0) {
    return <EmptyState icon="calendar-days" title={t('dashboard.charts.trendEmpty')} />;
  }

  return <LineChart points={points} max={100} formatValue={(v) => `${formatNumber(v)}%`} />;
}

function sumBy<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((sum, item) => sum + pick(item), 0);
}

function StatGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="rounded-xl border border-subtle bg-surface p-5 shadow-card">
          <Skeleton width="40%" />
          <Skeleton height={28} width="60%" className="mt-3" />
        </div>
      ))}
    </div>
  );
}
