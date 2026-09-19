import { api } from '../../shared/api/api';
import type {
  AttendancePolicy,
  AttendancePolicyInput,
  ProgressionRule,
  ProgressionRuleInput,
} from './settings.model';

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

    /* The promotion engine's rules. Defined here beside the attendance policies
       because they are the same kind of per-year, per-level setting on the same
       controller — the study-plan screen imports them rather than declaring the
       endpoint a second time. */
    progressionRules: build.query<ProgressionRule[], number>({
      query: (yearId) => ({ path: `/academic-years/${yearId}/progression-rules` }),
      providesTags: (_result, _error, yearId) => [{ type: 'Settings', id: `prog-${yearId}` }],
    }),
    upsertProgressionRule: build.mutation<
      ProgressionRule,
      { yearId: number; body: ProgressionRuleInput }
    >({
      query: ({ yearId, body }) => ({
        method: 'PUT',
        path: `/academic-years/${yearId}/progression-rules`,
        body,
      }),
      invalidatesTags: (_result, _error, { yearId }) => [{ type: 'Settings', id: `prog-${yearId}` }],
    }),
  }),
});

export const {
  useAttendancePoliciesQuery,
  useUpsertAttendancePolicyMutation,
  useProgressionRulesQuery,
  useUpsertProgressionRuleMutation,
} = settingsApi;
