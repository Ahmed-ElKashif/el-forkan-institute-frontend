import { api } from '../../shared/api/api';
import { toQueryString, type Page } from '../../shared/api/pagination';
import type { CorrectScorePayload, CreateExamInput, Exam, ScoreEntry, ScoreGrid, ScoreRow } from './score.model';

/* Exams per level+term are few, so the picker reads them in one page rather than
   paginating. `pageSize` sits at the API's ceiling. */
const EXAMS_PAGE_SIZE = 100;

const scoresApi = api.injectEndpoints({
  endpoints: (build) => ({
    /* Omitting `levelId` reads every level the viewer may see — how the Scores
       nav lists the exams still awaiting marks. `isLocked` goes over the wire as
       a string because the API parses it with zod's `stringbool`. */
    listExams: build.query<
      Page<Exam>,
      { levelId?: number; termId?: number; date?: string; isLocked?: boolean }
    >({
      query: ({ levelId, termId, date, isLocked }) => ({
        path: `/exams?${toQueryString({
          levelId,
          termId,
          date,
          isLocked: isLocked === undefined ? undefined : String(isLocked),
          page: 1,
          pageSize: EXAMS_PAGE_SIZE,
        })}`,
      }),
      providesTags: ['ExamScores'],
    }),
    // Create & schedule an exam (head-teacher; the API gates it). Invalidates the
    // exam list so the picker shows it immediately.
    createExam: build.mutation<Exam, CreateExamInput>({
      query: (body) => ({ method: 'POST', path: '/exams', body }),
      invalidatesTags: ['ExamScores'],
    }),
    scoreGrid: build.query<ScoreGrid, string>({
      query: (examId) => ({ path: `/exams/${examId}/scores` }),
      providesTags: ['ExamScores'],
    }),
    saveScores: build.mutation<{ saved: number }, { examId: string; entries: ScoreEntry[] }>({
      query: ({ examId, entries }) => ({
        method: 'POST',
        path: `/exams/${examId}/scores`,
        body: { entries },
      }),
      invalidatesTags: ['ExamScores'],
    }),
    setExamLock: build.mutation<{ isLocked: boolean }, { examId: string; locked: boolean }>({
      query: ({ examId, locked }) => ({
        method: 'POST',
        path: `/exams/${examId}/${locked ? 'lock' : 'unlock'}`,
      }),
      invalidatesTags: ['ExamScores'],
    }),
    correctScore: build.mutation<ScoreRow, { resultId: string; payload: CorrectScorePayload }>({
      query: ({ resultId, payload }) => ({
        method: 'PATCH',
        path: `/exam-results/${resultId}`,
        body: payload,
      }),
      invalidatesTags: ['ExamScores'],
    }),
  }),
});

export const {
  useListExamsQuery,
  useCreateExamMutation,
  useScoreGridQuery,
  useSaveScoresMutation,
  useSetExamLockMutation,
  useCorrectScoreMutation,
} = scoresApi;
