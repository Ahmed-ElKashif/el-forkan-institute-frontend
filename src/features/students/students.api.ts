import { api } from '../../shared/api/api';
import { DEFAULT_PAGE_SIZE, toQueryString, type Page } from '../../shared/api/pagination';
import type { Student, StudentsQuery } from './student.model';

const studentsApi = api.injectEndpoints({
  endpoints: (build) => ({
    listStudents: build.query<Page<Student>, StudentsQuery>({
      query: ({ page, search }) => ({
        path: `/students?${toQueryString({ page, pageSize: DEFAULT_PAGE_SIZE, search })}`,
      }),
      // Each distinct (page, search) is cached separately by RTK Query, so
      // paging back and forth is instant after the first visit. The tag lets a
      // future create/edit mutation invalidate the whole list in one line.
      providesTags: ['Student'],
    }),
  }),
});

export const { useListStudentsQuery } = studentsApi;
