import { api } from '../../shared/api/api';
import type { TermResult } from './termresults.model';

/* Both are POSTs that return the current standing — compute recomputes and
   stores it, finalize locks it — so the screen holds the returned rows in local
   state rather than caching a query. */
const termResultsApi = api.injectEndpoints({
  endpoints: (build) => ({
    computeTermResults: build.mutation<TermResult[], { sectionId: string; termId: number }>({
      query: ({ sectionId, termId }) => ({
        method: 'POST',
        path: `/sections/${sectionId}/term-results/${termId}/compute`,
      }),
    }),
    finalizeTermResults: build.mutation<TermResult[], { sectionId: string; termId: number }>({
      query: ({ sectionId, termId }) => ({
        method: 'POST',
        path: `/sections/${sectionId}/term-results/${termId}/finalize`,
      }),
    }),
  }),
});

export const { useComputeTermResultsMutation, useFinalizeTermResultsMutation } = termResultsApi;
