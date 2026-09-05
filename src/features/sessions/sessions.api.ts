import { api } from '../../shared/api/api';
import { DEFAULT_PAGE_SIZE, toQueryString, type Page } from '../../shared/api/pagination';
import type { Session, SessionsQuery, UpdateSessionInput } from './session.model';

const sessionsApi = api.injectEndpoints({
  endpoints: (build) => ({
    listSessions: build.query<Page<Session>, SessionsQuery>({
      query: ({ sectionId, page }) => ({
        path: `/sessions?${toQueryString({ sectionId, page, pageSize: DEFAULT_PAGE_SIZE })}`,
      }),
      providesTags: ['Session'],
    }),
    // Reschedule or cancel a single session. Also invalidates the attendance
    // grid, whose columns are these sessions.
    updateSession: build.mutation<Session, { id: string; patch: UpdateSessionInput }>({
      query: ({ id, patch }) => ({ method: 'PATCH', path: `/sessions/${id}`, body: patch }),
      invalidatesTags: ['Session', 'Attendance'],
    }),
  }),
});

export const { useListSessionsQuery, useUpdateSessionMutation } = sessionsApi;
