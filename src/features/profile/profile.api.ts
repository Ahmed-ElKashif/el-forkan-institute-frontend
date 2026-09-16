import { api } from '../../shared/api/api';

/** Edit your own details. There is no `PATCH /users/me`; the head teacher edits
 *  their own row through the same `PATCH /users/:id` the users screen uses (and
 *  is head-teacher-gated), so this is scoped to the admin's own account. */
export interface UpdateProfileInput {
  id: string;
  fullName: string;
  username: string;
  gender: 'male' | 'female';
  phone: string;
  email: string | null;
}

/** `POST /users/me/password` — the current password is required so a stolen
 *  access token alone cannot lock the owner out (F10). */
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

const profileApi = api.injectEndpoints({
  endpoints: (build) => ({
    updateMyProfile: build.mutation<void, UpdateProfileInput>({
      query: ({ id, ...body }) => ({ method: 'PATCH', path: `/users/${id}`, body }),
      // The users list shows this row too; keep it in step.
      invalidatesTags: ['User'],
    }),
    changeMyPassword: build.mutation<void, ChangePasswordInput>({
      query: (body) => ({ method: 'POST', path: '/users/me/password', body }),
    }),
  }),
});

export const { useUpdateMyProfileMutation, useChangeMyPasswordMutation } = profileApi;
