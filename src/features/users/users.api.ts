import { api } from '../../shared/api/api';
import { DEFAULT_PAGE_SIZE, toQueryString, type Page } from '../../shared/api/pagination';
import type { CreateUserInput, UpdateUserInput, User, UsersQuery } from './user.model';

const usersApi = api.injectEndpoints({
  endpoints: (build) => ({
    // The whole active-teacher set for a picker (the timetable editor assigns a
    // teacher to a slot). The paginated list caps at one page; a dropdown wants
    // them all, so this asks for the API's page cap and returns the flat list.
    teacherOptions: build.query<User[], void>({
      query: () => ({ path: `/users?${toQueryString({ page: 1, pageSize: 100, role: 'teacher' })}` }),
      transformResponse: (response: Page<User>) => response.items,
      providesTags: ['User'],
    }),

    listUsers: build.query<Page<User>, UsersQuery>({
      query: ({ page, role, search, includeInactive }) => ({
        path: `/users?${toQueryString({
          page,
          pageSize: DEFAULT_PAGE_SIZE,
          role,
          search,
          includeInactive: includeInactive ? 'true' : undefined,
        })}`,
      }),
      providesTags: ['User'],
    }),
    createUser: build.mutation<User, CreateUserInput>({
      query: (body) => ({ method: 'POST', path: '/users', body }),
      invalidatesTags: ['User'],
    }),
    updateUser: build.mutation<User, { id: string; patch: UpdateUserInput }>({
      query: ({ id, patch }) => ({ method: 'PATCH', path: `/users/${id}`, body: patch }),
      invalidatesTags: ['User'],
    }),
    softDeleteUser: build.mutation<void, { id: string; reason: string }>({
      query: ({ id, reason }) => ({ method: 'DELETE', path: `/users/${id}`, body: { reason } }),
      invalidatesTags: ['User'],
    }),
    resetUserPassword: build.mutation<void, { id: string; newPassword: string }>({
      query: ({ id, newPassword }) => ({ method: 'POST', path: `/users/${id}/password`, body: { newPassword } }),
    }),
  }),
});

export const {
  useTeacherOptionsQuery,
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useSoftDeleteUserMutation,
  useResetUserPasswordMutation,
} = usersApi;
