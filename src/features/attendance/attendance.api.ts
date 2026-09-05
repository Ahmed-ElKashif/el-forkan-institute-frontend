import { api } from '../../shared/api/api';
import { toQueryString } from '../../shared/api/pagination';
import type { AttendanceEntry, AttendanceGrid, SaveAttendanceResult } from './attendance.model';

const attendanceApi = api.injectEndpoints({
  endpoints: (build) => ({
    // The whole student × session sheet for a term, in one read.
    attendanceGrid: build.query<AttendanceGrid, { sectionId: string; termId: number }>({
      query: ({ sectionId, termId }) => ({
        path: `/sections/${sectionId}/attendance?${toQueryString({ termId })}`,
      }),
      providesTags: ['Attendance'],
    }),
    // One session column at a time (see the save model in AttendanceGridPage).
    // The invalidation refetches the grid so the saved column reflects server
    // truth; the page keeps its unsaved edits in component state and overlays
    // them on the refetch, so other in-progress columns are not lost.
    saveSessionAttendance: build.mutation<
      SaveAttendanceResult,
      { sessionId: string; entries: AttendanceEntry[] }
    >({
      query: ({ sessionId, entries }) => ({
        method: 'POST',
        path: `/sessions/${sessionId}/attendance`,
        body: { entries },
      }),
      invalidatesTags: ['Attendance'],
    }),
  }),
});

export const { useAttendanceGridQuery, useSaveSessionAttendanceMutation } = attendanceApi;
