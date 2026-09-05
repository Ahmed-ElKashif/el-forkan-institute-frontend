/* Term results (§4 — الحصيلة الفصلية), mirrored from the API
   (backend src/assessment/results.service.ts `TermResultView`). A section+term's
   totals per student: `compute` returns the current standing (and stores it),
   `finalize` locks it. `decision` is one of the promotion decisions the DS
   `ResultPill` knows; `finalizedAt` is set once the head teacher finalizes. */

export interface TermResult {
  enrollmentId: string;
  studentName: string;
  totalScore: number | null;
  maxTotal: number | null;
  percentage: number | null;
  subjectsFailed: number;
  mandatoryFailed: number;
  result: string;
  decision: string | null;
  finalizedAt: string | null;
}
