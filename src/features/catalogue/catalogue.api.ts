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

    // Whole active set for the unit-book picker, same reasoning as subjectOptions.
    bookOptions: build.query<Book[], void>({
      query: () => ({ path: `/books?${toQueryString({ page: 1, pageSize: 100 })}` }),
      transformResponse: (response: Page<Book>) => response.items,
      providesTags: ['Catalogue'],
    }),

    books: build.query<Page<Book>, { page: number }>({
      query: ({ page }) => ({ path: `/books?${toQueryString({ page, pageSize: DEFAULT_PAGE_SIZE })}` }),
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
  useBookOptionsQuery,
  useBooksQuery,
  useCreateBookMutation,
  useUpdateBookMutation,
} = catalogueApi;
