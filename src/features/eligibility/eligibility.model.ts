/* Exam eligibility (§4.6 / R7 — مستحقو الامتحانات), mirrored from the API
   (backend src/assessment/exams.service.ts `EligibilityRow`). The engine decides
   who may sit an exam from their term attendance against the level's absence
   policy; `reasonCode` says why. The list is materialised server-side by the
   compute call, so it is saved the moment it is generated. */

/** The reason an enrolment is on (or off) the list. `low_attendance` is the
 *  attendance exclusion this whole flow exists for; the rest place an eligible
 *  student in the right bucket (§4.6). Mirrors `EligibilityReason` in the API. */
export type EligibilityReason =
  | 'new'
  | 'skipped_prep'
  | 'repeater'
  | 'carrying_subjects'
  | 'clearing_for_comp'
  | 'low_attendance'
  | 'already_passed'
  | 'not_in_scope';

export interface EligibilityRow {
  id: string;
  enrollmentId: string;
  studentName: string;
  studentCode: string;
  isEligible: boolean;
  reasonCode: string;
  reasonNote: string | null;
  seatNo: string | null;
  overriddenBy: string | null;
}

/** The count the compute call returns — how many the engine admitted vs. held. */
export interface EligibilityTally {
  eligible: number;
  ineligible: number;
}

/** The screen's client-side view filter over the fetched rows. */
export type EligibilityFilter = 'all' | 'eligible' | 'ineligible';
