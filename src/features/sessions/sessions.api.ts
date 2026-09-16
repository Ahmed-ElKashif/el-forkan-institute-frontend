import { api } from '../../shared/api/api';
import { DEFAULT_PAGE_SIZE, toQueryString, type Page } from '../../shared/api/pagination';
import type {
  CreateClassDayInput,
  Session,
  SessionsQuery,
  UpdateSessionInput,
} from './session.model';

const sessionsApi = api.injectEndpoints({
  endpoints: (build) => ({
    listSessions: build.query<Page<Session>, SessionsQuery>({
      query: ({ sectionId, page }) => ({
        path: `/sessions?${toQueryString({ sectionId, page, pageSize: DEFAULT_PAGE_SIZE })}`,
      }),
      providesTags: ['Session'],
    }),
    // Create a class day for a level: one date's periods, each fanned out to the
    // cohorts its gender scope names (server-side). Invalidates the attendance
    // grid, whose columns are these sessions.
    createClassDay: build.mutation<{ created: number; skipped: number }, CreateClassDayInput>({
      query: ({ levelId, academicYearId, sessionDate, periods }) => ({
        method: 'POST',
        path: `/levels/${levelId}/class-days`,
        body: { academicYearId, sessionDate, periods },
      }),
      invalidatesTags: ['Session', 'Attendance'],
    }),
    // Edit one period of an upcoming class day (subject, times, sheikh).
    updateSession: build.mutation<Session, { id: string; patch: UpdateSessionInput }>({
      query: ({ id, patch }) => ({ method: 'PATCH', path: `/sessions/${id}`, body: patch }),
      invalidatesTags: ['Session', 'Attendance'],
    }),
    // Remove one period (head-teacher). Its attendance cascades server-side.
    deleteSession: build.mutation<void, string>({
      query: (id) => ({ method: 'DELETE', path: `/sessions/${id}` }),
      invalidatesTags: ['Session', 'Attendance'],
    }),
  }),
});

export const {
  useListSessionsQuery,
  useCreateClassDayMutation,
  useUpdateSessionMutation,
  useDeleteSessionMutation,
} = sessionsApi;
