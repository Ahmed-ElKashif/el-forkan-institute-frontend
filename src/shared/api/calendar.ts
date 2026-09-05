import { api } from './api';
import { toQueryString, type Page } from './pagination';

/** A term within an academic year. Pickers read `id`/`termNumber`/`status`; the
 *  years-management screen reads and edits the dates and exam windows too. */
export interface Term {
  id: number;
  academicYearId: number;
  termNumber: number;
  startsOn: string;
  endsOn: string;
  examStartsOn: string | null;
  examEndsOn: string | null;
  status: string;
}

/** An academic year: id and Hijri year for pickers, plus the stored dates and
 *  status the management screen edits, and its embedded terms. */
export interface AcademicYear {
  id: number;
  hijriYear: number;
  startsOn: string;
  endsOn: string;
  status: string;
  terms: Term[];
}

/* The calendar is read by more than one screen — the dashboard, the sections
   picker, the attendance/score grids, promotion, and years management — so it
   lives in `shared/`. Tagged `Calendar` so a year/term edit refreshes every
   reader. */
const calendarApi = api.injectEndpoints({
  endpoints: (build) => ({
    currentAcademicYear: build.query<AcademicYear | null, void>({
      // Newest first (the API orders by hijri_year desc), so the first row is
      // the current year. One row is all any caller needs.
      query: () => ({ path: `/academic-years?${toQueryString({ page: 1, pageSize: 1 })}` }),
      transformResponse: (response: Page<AcademicYear>) => response.items[0] ?? null,
      providesTags: ['Calendar'],
    }),
    academicYear: build.query<AcademicYear, number>({
      // By id, for a screen that already knows a year and needs its terms.
      query: (id) => ({ path: `/academic-years/${id}` }),
      providesTags: ['Calendar'],
    }),
    academicYears: build.query<AcademicYear[], void>({
      // The whole list, newest first — years are few, so no pagination.
      query: () => ({ path: `/academic-years?${toQueryString({ page: 1, pageSize: 100 })}` }),
      transformResponse: (response: Page<AcademicYear>) => response.items,
      providesTags: ['Calendar'],
    }),
  }),
});

export const { useCurrentAcademicYearQuery, useAcademicYearQuery, useAcademicYearsQuery } = calendarApi;

/** The term to select before a user picks one: the active term, else the first,
 *  else none. Shared by the attendance and score grids' term pickers. */
export function defaultTerm(terms: Term[]): Term | null {
  return terms.find((term) => term.status === 'active') ?? terms[0] ?? null;
}
