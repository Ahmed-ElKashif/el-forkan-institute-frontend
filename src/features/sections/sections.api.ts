import { api } from '../../shared/api/api';
import { DEFAULT_PAGE_SIZE, toQueryString, type Page } from '../../shared/api/pagination';
import type {
  CreateSectionInput,
  Enrollment,
  Section,
  SectionDetail,
  SectionsQuery,
  UpdateSectionInput,
} from './section.model';

const sectionsApi = api.injectEndpoints({
  endpoints: (build) => ({
    listSections: build.query<Page<Section>, SectionsQuery>({
      query: ({ academicYearId, page, branchId, pageSize }) => ({
        path: `/sections?${toQueryString({
          academicYearId,
          page,
          pageSize: pageSize ?? DEFAULT_PAGE_SIZE,
          branchId,
        })}`,
      }),
      // The API scopes the rows to what the viewer may see (a teacher gets their
      // own sections). The tag lets a future section create/edit invalidate the
      // list in one line.
      providesTags: ['Section'],
    }),
    getSection: build.query<SectionDetail, string>({
      query: (id) => ({ path: `/sections/${id}` }),
      providesTags: ['Section'],
    }),
    /* The class roster. Tagged 'Section' so a transfer, a new enrolment or a
       withdrawal refreshes the list the roster is showing. `status` narrows to a
       cohort's active / withdrawn / completed members (who took the level off). */
    listEnrollments: build.query<
      Page<Enrollment>,
      { sectionId: string; page: number; status?: string }
    >({
      query: ({ sectionId, page, status }) => ({
        path: `/enrollments?${toQueryString({
          sectionId,
          page,
          pageSize: DEFAULT_PAGE_SIZE,
          status,
        })}`,
      }),
      providesTags: ['Section'],
    }),
    /* Withdraw a student from a class (status → 'withdrawn') or bring a returning
       one back ('active'). The student record is untouched — the institute's
       students take years off and re-enrol, so this is reversible, not a delete.
       Invalidates 'Student' too so the profile's enrolment history stays current. */
    updateEnrollment: build.mutation<Enrollment, { id: string; status: string }>({
      query: ({ id, status }) => ({ method: 'PATCH', path: `/enrollments/${id}`, body: { status } }),
      invalidatesTags: ['Section', 'Student'],
    }),
    createSection: build.mutation<Section, CreateSectionInput>({
      query: (body) => ({ method: 'POST', path: '/sections', body }),
      invalidatesTags: ['Section'],
    }),
    /* Creates the year's whole class list — one per level per gender. This is
       how classes come into existence; `createSection` survives only for the
       import's recovery path. Idempotent, so pressing it twice is harmless. */
    provisionSections: build.mutation<
      { created: number; total: number },
      { academicYearId: number; branchId?: number | null }
    >({
      query: (body) => ({ method: 'POST', path: '/sections/provision', body }),
      invalidatesTags: ['Section'],
    }),
    updateSection: build.mutation<Section, { id: string; patch: UpdateSectionInput }>({
      query: ({ id, patch }) => ({ method: 'PATCH', path: `/sections/${id}`, body: patch }),
      invalidatesTags: ['Section'],
    }),
    // A section may hold several teachers, one of them primary; assign and
    // unassign both re-read the list so the roster of teachers stays current.
    assignTeacher: build.mutation<void, { sectionId: string; userId: string; isPrimary: boolean }>({
      query: ({ sectionId, userId, isPrimary }) => ({
        method: 'POST',
        path: `/sections/${sectionId}/teachers`,
        body: { userId, isPrimary },
      }),
      invalidatesTags: ['Section'],
    }),
    unassignTeacher: build.mutation<void, { sectionId: string; userId: string }>({
      query: ({ sectionId, userId }) => ({
        method: 'DELETE',
        path: `/sections/${sectionId}/teachers/${userId}`,
      }),
      invalidatesTags: ['Section'],
    }),
  }),
});

export const {
  useListSectionsQuery,
  useGetSectionQuery,
  useListEnrollmentsQuery,
  useUpdateEnrollmentMutation,
  useCreateSectionMutation,
  useProvisionSectionsMutation,
  useUpdateSectionMutation,
  useAssignTeacherMutation,
  useUnassignTeacherMutation,
} = sectionsApi;
