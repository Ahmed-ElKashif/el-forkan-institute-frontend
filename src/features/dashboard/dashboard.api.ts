import { api } from '../../shared/api/api';
import { toQueryString } from '../../shared/api/pagination';
import type {
  AttendancePoint,
  DashboardSummary,
  HeadcountCell,
  MarkazCount,
  PassRateRow,
} from './dashboard.model';

/* The dashboard is two chained reads: the current academic year (from the
   shared calendar endpoint — the sections list and the grid read it too), then
   that year's summary, cached separately because every screen's data feeds it. */
const dashboardApi = api.injectEndpoints({
  endpoints: (build) => ({
    dashboardSummary: build.query<DashboardSummary, number>({
      query: (academicYearId) => ({
        path: `/reports/summary?${toQueryString({ academicYearId })}`,
      }),
      providesTags: ['Dashboard'],
    }),
    // Chart feeds — same year scope as the summary, cached under the same tag.
    headcountByLevel: build.query<HeadcountCell[], number>({
      query: (academicYearId) => ({
        path: `/reports/headcount-by-level?${toQueryString({ academicYearId })}`,
      }),
      providesTags: ['Dashboard'],
    }),
    passRates: build.query<PassRateRow[], number>({
      query: (academicYearId) => ({
        path: `/reports/pass-rates?${toQueryString({ academicYearId })}`,
      }),
      providesTags: ['Dashboard'],
    }),
    headcountByMarkaz: build.query<MarkazCount[], number>({
      query: (academicYearId) => ({
        path: `/reports/headcount-by-markaz?${toQueryString({ academicYearId })}`,
      }),
      providesTags: ['Dashboard'],
    }),
    // Keyed by term, not year — the trend is a term's session days.
    attendanceTrend: build.query<AttendancePoint[], number>({
      query: (termId) => ({ path: `/reports/attendance-trend?${toQueryString({ termId })}` }),
      providesTags: ['Dashboard'],
    }),
  }),
});

export const {
  useDashboardSummaryQuery,
  useHeadcountByLevelQuery,
  usePassRatesQuery,
  useHeadcountByMarkazQuery,
  useAttendanceTrendQuery,
} = dashboardApi;
