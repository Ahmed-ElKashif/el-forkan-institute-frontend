import { api } from '../../shared/api/api';
import { toQueryString } from '../../shared/api/pagination';
import type { AttendanceEntry, AttendanceGrid, SaveAttendanceResult } from './attendance.model';

const attendanceApi = api.injectEndpoints({
  endpoints: (build) => ({
    // The student × session sheet: a whole term (columns 1…15) or, with a date,
    // just that class day's periods. `termId` anchors the running absence count
    // either way.
    attendanceGrid: build.query<
      AttendanceGrid,
      { sectionId: string; termId: number; date?: string }
    >({
      query: ({ sectionId, termId, date }) => ({
        path: `/sections/${sectionId}/attendance?${toQueryString({ termId, date })}`,
      }),
      providesTags: ['Attendance'],
    }),
    // One session column at a time (see the save model in AttendanceSheet).
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
