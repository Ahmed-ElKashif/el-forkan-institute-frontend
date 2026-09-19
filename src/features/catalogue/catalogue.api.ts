import { api } from '../../shared/api/api';
import { DEFAULT_PAGE_SIZE, toQueryString, type Page } from '../../shared/api/pagination';
import type {
  Book,
  CreateBookInput,
  CreateSubjectInput,
  Level,
  LevelFlags,
  Subject,
  UpdateBookInput,
  UpdateSubjectInput,
} from './catalogue.model';

const catalogueApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Levels are a fixed, short list (not paginated); only their flags change.
    levels: build.query<Level[], void>({
      query: () => ({ path: '/levels' }),
      providesTags: ['Catalogue'],
    }),
    updateLevel: build.mutation<Level, { id: number; flags: LevelFlags }>({
      query: ({ id, flags }) => ({ method: 'PATCH', path: `/levels/${id}`, body: flags }),
      invalidatesTags: ['Catalogue'],
    }),

    // The whole active set for a picker (the curriculum builder). The paginated
    // `subjects` query caps at one page; a dropdown needs all of them, so this
    // asks for the API's page cap (100) and returns the flat list.
    subjectOptions: build.query<Subject[], void>({
      query: () => ({ path: `/subjects?${toQueryString({ page: 1, pageSize: 100 })}` }),
      transformResponse: (response: Page<Subject>) => response.items,
      providesTags: ['Catalogue'],
    }),

    subjects: build.query<Page<Subject>, { page: number; search: string; includeInactive: boolean }>({
      query: ({ page, search, includeInactive }) => ({
        path: `/subjects?${toQueryString({
          page,
          pageSize: DEFAULT_PAGE_SIZE,
          search,
          includeInactive: includeInactive ? 'true' : undefined,
        })}`,
      }),
      providesTags: ['Catalogue'],
    }),
    createSubject: build.mutation<Subject, CreateSubjectInput>({
      query: (body) => ({ method: 'POST', path: '/subjects', body }),
      invalidatesTags: ['Catalogue'],
    }),
    updateSubject: build.mutation<Subject, { id: number; patch: UpdateSubjectInput }>({
      query: ({ id, patch }) => ({ method: 'PATCH', path: `/subjects/${id}`, body: patch }),
      invalidatesTags: ['Catalogue'],
    }),

    /* Only a subject nothing has used yet; the API refuses the rest and names
       what is holding it. A taught subject is deactivated (`isActive`) instead —
       curriculum rows, sessions and carried subjects point at it. */
    removeSubject: build.mutation<void, number>({
      query: (id) => ({ method: 'DELETE', path: `/subjects/${id}` }),
      invalidatesTags: ['Catalogue'],
    }),

    /* Aliases are how the Excel import recognises a subject written the way the
       sheets write it (§6.2 — the real files contain both `سيرة` and `سيره`).
       The endpoints have always existed; nothing in the app called them, so the
       only aliases in the database were the ones seeds put there. */
    addSubjectAlias: build.mutation<unknown, { subjectId: number; aliasAr: string }>({
      query: ({ subjectId, aliasAr }) => ({
        method: 'POST',
        path: `/subjects/${subjectId}/aliases`,
        body: { aliasAr },
      }),
      invalidatesTags: ['Catalogue'],
    }),
    removeSubjectAlias: build.mutation<void, number>({
      query: (aliasId) => ({ method: 'DELETE', path: `/subject-aliases/${aliasId}` }),
      invalidatesTags: ['Catalogue'],
    }),

    // Whole active set for the unit-book picker, same reasoning as subjectOptions.
    bookOptions: build.query<Book[], void>({
      query: () => ({ path: `/books?${toQueryString({ page: 1, pageSize: 100 })}` }),
      transformResponse: (response: Page<Book>) => response.items,
      providesTags: ['Catalogue'],
    }),

    books: build.query<Page<Book>, { page: number; search: string; includeInactive: boolean }>({
      query: ({ page, search, includeInactive }) => ({
        path: `/books?${toQueryString({
          page,
          pageSize: DEFAULT_PAGE_SIZE,
          search,
          includeInactive: includeInactive ? 'true' : undefined,
        })}`,
      }),
      providesTags: ['Catalogue'],
    }),
    createBook: build.mutation<Book, CreateBookInput>({
      query: (body) => ({ method: 'POST', path: '/books', body }),
      invalidatesTags: ['Catalogue'],
    }),
    updateBook: build.mutation<Book, { id: number; patch: UpdateBookInput }>({
      query: ({ id, patch }) => ({ method: 'PATCH', path: `/books/${id}`, body: patch }),
      invalidatesTags: ['Catalogue'],
    }),
  }),
});

export const {
  useLevelsQuery,
  useUpdateLevelMutation,
  useSubjectOptionsQuery,
  useSubjectsQuery,
  useCreateSubjectMutation,
  useUpdateSubjectMutation,
  useRemoveSubjectMutation,
  useAddSubjectAliasMutation,
  useRemoveSubjectAliasMutation,
  useBookOptionsQuery,
  useBooksQuery,
  useCreateBookMutation,
  useUpdateBookMutation,
} = catalogueApi;
