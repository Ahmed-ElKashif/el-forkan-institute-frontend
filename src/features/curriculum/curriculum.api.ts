import { api } from '../../shared/api/api';
import { toQueryString } from '../../shared/api/pagination';
import type {
  CreateCurriculumInput,
  CurriculumRow,
  CurriculumTreeNode,
  CurriculumUnit,
  CurriculumUnitInput,
  UpdateCurriculumInput,
} from './curriculum.model';

/* One read (the whole tree for a year/level/term) and the six writes. Every
   write invalidates `Curriculum`, so a create, edit, delete or unit change
   re-reads the tree — there is no local overlay to keep in sync. */
const curriculumApi = api.injectEndpoints({
  endpoints: (build) => ({
    curriculumTree: build.query<CurriculumTreeNode[], { yearId: number; levelId: number; termNumber: number }>({
      query: ({ yearId, levelId, termNumber }) => ({
        path: `/academic-years/${yearId}/curriculum?${toQueryString({ levelId, termNumber })}`,
      }),
      providesTags: ['Curriculum'],
    }),

    createCurriculum: build.mutation<CurriculumRow, { yearId: number; levelId: number; body: CreateCurriculumInput }>({
      query: ({ yearId, levelId, body }) => ({
        method: 'POST',
        path: `/academic-years/${yearId}/levels/${levelId}/curriculum`,
        body,
      }),
      invalidatesTags: ['Curriculum'],
    }),
    updateCurriculum: build.mutation<CurriculumRow, { id: number; patch: UpdateCurriculumInput }>({
      query: ({ id, patch }) => ({ method: 'PATCH', path: `/curriculum/${id}`, body: patch }),
      invalidatesTags: ['Curriculum'],
    }),
    removeCurriculum: build.mutation<void, number>({
      query: (id) => ({ method: 'DELETE', path: `/curriculum/${id}` }),
      invalidatesTags: ['Curriculum'],
    }),

    addCurriculumUnit: build.mutation<CurriculumUnit, { curriculumId: number; body: CurriculumUnitInput }>({
      query: ({ curriculumId, body }) => ({ method: 'POST', path: `/curriculum/${curriculumId}/units`, body }),
      invalidatesTags: ['Curriculum'],
    }),
    updateCurriculumUnit: build.mutation<CurriculumUnit, { id: number; patch: Partial<CurriculumUnitInput> }>({
      query: ({ id, patch }) => ({ method: 'PATCH', path: `/curriculum-units/${id}`, body: patch }),
      invalidatesTags: ['Curriculum'],
    }),
    removeCurriculumUnit: build.mutation<void, number>({
      query: (id) => ({ method: 'DELETE', path: `/curriculum-units/${id}` }),
      invalidatesTags: ['Curriculum'],
    }),
  }),
});

export const {
  useCurriculumTreeQuery,
  useCreateCurriculumMutation,
  useUpdateCurriculumMutation,
  useRemoveCurriculumMutation,
  useAddCurriculumUnitMutation,
  useUpdateCurriculumUnitMutation,
  useRemoveCurriculumUnitMutation,
} = curriculumApi;
