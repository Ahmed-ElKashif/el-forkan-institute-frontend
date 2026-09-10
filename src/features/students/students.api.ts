import { api } from '../../shared/api/api';
import { DEFAULT_PAGE_SIZE, toQueryString, type Page } from '../../shared/api/pagination';
import type {
  AttendanceSummary,
  CarriedSubjectGroup,
  EnrollmentHistoryItem,
  ExamResult,
  Placement,
  Student,
  StudentDetail,
  StudentPatch,
  StudentsQuery,
} from './student.model';

const studentsApi = api.injectEndpoints({
  endpoints: (build) => ({
    listStudents: build.query<Page<Student>, StudentsQuery>({
      query: ({ page, search, levelId, gender }) => ({
        path: `/students?${toQueryString({ page, pageSize: DEFAULT_PAGE_SIZE, search, levelId, gender })}`,
      }),
      // Each distinct (page, search, levelId) is cached separately by RTK Query,
      // so paging and filtering back and forth is instant after the first visit.
      providesTags: ['Student'],
    }),
    // Set a student's study year by enrolling them into a section of the target
    // level for the current year (§5). The legacy import lands students with no
    // year — this is how the head teacher assigns it. Invalidates the student so
    // the study year and roster refresh.
    assignEnrollment: build.mutation<unknown, { studentId: string; sectionId: string }>({
      query: (body) => ({ method: 'POST', path: '/enrollments', body }),
      invalidatesTags: (_result, _error, { studentId }) => [{ type: 'Student', id: studentId }, 'Student'],
    }),
    // Correct a wrong study year: move the existing enrollment to another
    // section (`PATCH` can't — the section is a composite-FK identity).
    transferEnrollment: build.mutation<
      unknown,
      { enrollmentId: string; sectionId: string; studentId: string }
    >({
      query: ({ enrollmentId, sectionId }) => ({
        method: 'POST',
        path: `/enrollments/${enrollmentId}/transfer`,
        body: { sectionId },
      }),
      invalidatesTags: (_result, _error, { studentId }) => [{ type: 'Student', id: studentId }, 'Student'],
    }),

    // The profile edit: a partial record patch. Invalidating the whole `Student`
    // type refreshes both the roster and every panel of the edited profile.
    updateStudent: build.mutation<StudentDetail, { id: string; patch: StudentPatch }>({
      query: ({ id, patch }) => ({
        method: 'PATCH',
        path: `/students/${id}`,
        body: patch,
      }),
      invalidatesTags: ['Student'],
    }),

    // The profile page: the full record plus its three record panels and the
    // placement history. Each is tagged by the student id so a status edit (or
    // any future write) can refresh just this student's cached reads.
    getStudent: build.query<StudentDetail, string>({
      query: (id) => ({ path: `/students/${id}` }),
      providesTags: (_result, _error, id) => [{ type: 'Student', id }],
    }),
    studentEnrollments: build.query<EnrollmentHistoryItem[], string>({
      query: (id) => ({ path: `/students/${id}/enrollments` }),
      providesTags: (_result, _error, id) => [{ type: 'Student', id }],
    }),
    studentAttendance: build.query<AttendanceSummary, string>({
      query: (id) => ({ path: `/students/${id}/attendance` }),
      providesTags: (_result, _error, id) => [{ type: 'Student', id }],
    }),
    studentExamResults: build.query<ExamResult[], string>({
      query: (id) => ({ path: `/students/${id}/exam-results` }),
      providesTags: (_result, _error, id) => [{ type: 'Student', id }],
    }),
    /* Tagged per-student like its sibling panels, so a mark that settles a carry
       refreshes this list along with the scores that settled it. */
    studentCarriedSubjects: build.query<CarriedSubjectGroup[], string>({
      query: (id) => ({ path: `/students/${id}/carried-subjects` }),
      providesTags: (_result, _error, id) => [{ type: 'Student', id }],
    }),
    studentPlacements: build.query<Placement[], string>({
      query: (id) => ({ path: `/students/${id}/placements` }),
      providesTags: (_result, _error, id) => [{ type: 'Student', id }],
    }),
    // Head-teacher only and audited server-side, so it is a lazy query fired by
    // an explicit "reveal" click rather than loaded with the profile.
    revealNationalId: build.query<{ nationalId: string | null }, string>({
      query: (id) => ({ path: `/students/${id}/national-id` }),
    }),
    // The profile's "warn now" button: sends the Arabic absence warning on
    // demand. Invalidates the student so the attendance panel re-reads the
    // "warning sent" status.
    warnAbsence: build.mutation<
      { status: string; absences: number; threshold: number | null },
      string
    >({
      query: (id) => ({ method: 'POST', path: `/students/${id}/absence-warning` }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Student', id }],
    }),
  }),
});

export const {
  useListStudentsQuery,
  useAssignEnrollmentMutation,
  useTransferEnrollmentMutation,
  useUpdateStudentMutation,
  useGetStudentQuery,
  useStudentEnrollmentsQuery,
  useStudentAttendanceQuery,
  useStudentExamResultsQuery,
  useStudentCarriedSubjectsQuery,
  useStudentPlacementsQuery,
  useLazyRevealNationalIdQuery,
  useWarnAbsenceMutation,
} = studentsApi;
