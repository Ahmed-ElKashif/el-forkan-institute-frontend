import { api } from '../../shared/api/api';
import type { Page } from '../../shared/api/pagination';
import { toQueryString } from '../../shared/api/pagination';
import type { AcademicYear, DashboardSummary } from './dashboard.model';

/* The dashboard is two chained reads: find the current academic year, then ask
   for that year's summary. Split into two endpoints so RTK Query caches the year
   (it rarely changes) independently of the summary (which every screen's data
   feeds into). */
const dashboardApi = api.injectEndpoints({
  endpoints: (build) => ({
    currentAcademicYear: build.query<AcademicYear | null, void>({
      // Newest first (the API orders by hijri_year desc), so the first row is
      // the current year. One row is all the dashboard needs.
      query: () => ({ path: `/academic-years?${toQueryString({ page: 1, pageSize: 1 })}` }),
      transformResponse: (response: Page<AcademicYear>) => response.items[0] ?? null,
    }),
    dashboardSummary: build.query<DashboardSummary, number>({
      query: (academicYearId) => ({
        path: `/reports/summary?${toQueryString({ academicYearId })}`,
      }),
      providesTags: ['Dashboard'],
    }),
  }),
});

export const { useCurrentAcademicYearQuery, useDashboardSummaryQuery } = dashboardApi;
