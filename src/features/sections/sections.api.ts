import { api } from '../../shared/api/api';
import { DEFAULT_PAGE_SIZE, toQueryString, type Page } from '../../shared/api/pagination';
import type {
  CreateSectionInput,
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
    createSection: build.mutation<Section, CreateSectionInput>({
      query: (body) => ({ method: 'POST', path: '/sections', body }),
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
  useCreateSectionMutation,
  useUpdateSectionMutation,
  useAssignTeacherMutation,
  useUnassignTeacherMutation,
} = sectionsApi;
