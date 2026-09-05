import { api } from '../../shared/api/api';
import type { AttendancePolicy, AttendancePolicyInput } from './settings.model';

const settingsApi = api.injectEndpoints({
  endpoints: (build) => ({
    attendancePolicies: build.query<AttendancePolicy[], number>({
      query: (yearId) => ({ path: `/academic-years/${yearId}/attendance-policies` }),
      providesTags: (_result, _error, yearId) => [{ type: 'Settings', id: `att-${yearId}` }],
    }),
    // PUT upsert: keyed by (year, level), so adding an override and editing an
    // existing one are the same call. Re-reads the list via the tag.
    upsertAttendancePolicy: build.mutation<
      AttendancePolicy,
      { yearId: number; body: AttendancePolicyInput }
    >({
      query: ({ yearId, body }) => ({
        method: 'PUT',
        path: `/academic-years/${yearId}/attendance-policies`,
        body,
      }),
      invalidatesTags: (_result, _error, { yearId }) => [{ type: 'Settings', id: `att-${yearId}` }],
    }),
  }),
});

export const { useAttendancePoliciesQuery, useUpsertAttendancePolicyMutation } = settingsApi;
