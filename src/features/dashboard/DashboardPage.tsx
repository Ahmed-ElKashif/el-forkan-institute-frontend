import { useTranslation } from 'react-i18next';
import { Alert, EmptyState, Skeleton, StatCard, formatNumber, type IconName } from '../../ds';
import { useCurrentAcademicYearQuery, useDashboardSummaryQuery } from './dashboard.api';
import type { DashboardSummary } from './dashboard.model';

/** The signed-in landing page: the current year's headline numbers, scoped by
 *  the API to what this user may see. Read-only — every figure comes straight
 *  from `/reports/summary`, so it is a faithful mirror of the API, not a second
 *  computation that could disagree. */
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

  return <SummaryGrid summary={summary.data} caption={t('dashboard.yearCaption', {
    year: formatNumber(summary.data.hijriYear),
  })} />;
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
    <section aria-label={caption}>
      <p className="mb-4 text-sm text-ink-500">{caption}</p>
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
    </section>
  );
}

function StatGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="rounded-lg border border-subtle bg-surface px-6 py-4 shadow-card">
          <Skeleton width="40%" />
          <Skeleton height={28} width="60%" className="mt-3" />
        </div>
      ))}
    </div>
  );
}
