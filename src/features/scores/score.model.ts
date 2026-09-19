/* The assessment shapes this feature renders, mirrored from the API
   (src/assessment/exams.service.ts `ExamView`, results.service.ts `ScoreGrid` /
   `ScoreRow`), narrowed to the fields the screens use. */

export interface Exam {
  id: string;
  subjectNameAr: string;
  levelId: number;
  examType: string;
  gender: string | null;
  scheduledAt: string | null;
  isLocked: boolean;
  maxScore: number;
  passScore: number;
}

/** The exams one cohort sits: its own level's, and of those the ones set for its
 *  gender or shared between both — a null `gender` is a shared sitting (R3).
 *  Both the exam picker and the term-close readiness list ask this, and they
 *  must agree: a paper counted for one cohort and not the other would make a
 *  term look ready when it is not. */
export function examsForCohort(exams: Exam[], levelId: number, gender: string): Exam[] {
  return exams.filter(
    (exam) => exam.levelId === levelId && (exam.gender === null || exam.gender === gender),
  );
}

/** The body of `POST /exams`. The exam inherits max/pass from its curriculum
 *  row (§4.2), so neither is sent; `gender: null` is a shared sitting (R3). */
export interface CreateExamInput {
  branchId: number;
  termId: number;
  curriculumId: number;
  gender: 'male' | 'female' | null;
  examType: string;
  scheduledAt: string | null;
  durationMin: number | null;
  venue: string | null;
}

/** Possible `ScoreRow.result` values from the API. */
export type ScoreResult = 'pending' | 'pass' | 'fail' | 'absent';

export interface ScoreRow {
  enrollmentId: string;
  studentName: string;
  /** Null until the student has a stored result row (nothing entered yet). The
   *  correction endpoint addresses this id, so a row without one cannot be
   *  corrected, only entered. */
  resultId: string | null;
  score: number | null;
  isAbsent: boolean;
  result: ScoreResult;
}

export interface ScoreGrid {
  examId: string;
  subjectNameAr: string;
  maxScore: number;
  passScore: number;
  isLocked: boolean;
  rows: ScoreRow[];
}

/** One student's mark, sent when the whole exam is saved. */
export interface ScoreEntry {
  enrollmentId: string;
  score: number | null;
  isAbsent: boolean;
}

/** A head-teacher correction after lock. The reason is mandatory (R8) — it is
 *  what `grade_changes` records for the auditor. */
export interface CorrectScorePayload {
  score: number | null;
  isAbsent: boolean;
  reason: string;
}
