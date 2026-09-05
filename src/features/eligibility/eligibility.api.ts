import { api } from '../../shared/api/api';
import type { EligibilityRow, EligibilityTally } from './eligibility.model';

const eligibilityApi = api.injectEndpoints({
  endpoints: (build) => ({
    // The materialised list for an exam. Empty until it has been computed once.
    examEligibility: build.query<EligibilityRow[], string>({
      query: (examId) => ({ path: `/exams/${examId}/eligibility` }),
      providesTags: (_result, _error, examId) => [{ type: 'Eligibility', id: examId }],
    }),
    // Runs the engine over the exam's candidates and persists the verdicts —
    // this is the "save". Re-reads the list via the tag on success.
    computeEligibility: build.mutation<EligibilityTally, string>({
      query: (examId) => ({ method: 'POST', path: `/exams/${examId}/eligibility/compute` }),
      invalidatesTags: (_result, _error, examId) => [{ type: 'Eligibility', id: examId }],
    }),
    // §4.6: the head teacher may flip a verdict, and the reason is mandatory —
    // it is what an auditor reads a year later. Re-reads the exam's list.
    overrideEligibility: build.mutation<
      EligibilityRow,
      { examId: string; id: string; isEligible: boolean; reasonNote: string; seatNo: string | null }
    >({
      query: ({ id, isEligible, reasonNote, seatNo }) => ({
        method: 'PATCH',
        path: `/exam-eligibility/${id}`,
        body: { isEligible, reasonNote, seatNo },
      }),
      invalidatesTags: (_result, _error, { examId }) => [{ type: 'Eligibility', id: examId }],
    }),
  }),
});

export const {
  useExamEligibilityQuery,
  useComputeEligibilityMutation,
  useOverrideEligibilityMutation,
} = eligibilityApi;
