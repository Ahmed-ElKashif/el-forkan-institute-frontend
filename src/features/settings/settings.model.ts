/* Attendance policy settings (§3 — "Set … absence limits"), mirrored from the
   API (backend src/settings/settings.service.ts `AttendancePolicyView`). A policy
   with `levelId: null` is the year-wide default; a per-level row overrides it.
   `maxAbsences` + `exceedingAction: 'block_exam'` is what the eligibility engine
   uses to hold a student out of an exam, so this screen is what powers that. */

/** What happens when a student passes `maxAbsences`. */
export type ExceedingAction = 'warn_only' | 'block_exam';

export interface AttendancePolicy {
  id: number;
  academicYearId: number;
  /** null = the year-wide default that applies to every level without its own. */
  levelId: number | null;
  maxAbsences: number;
  warnAtAbsences: number;
  autoWarnEnabled: boolean;
  exceedingAction: string;
}

/** The body of the upsert (PUT by year + level). */
export interface AttendancePolicyInput {
  levelId: number | null;
  maxAbsences: number;
  warnAtAbsences: number;
  autoWarnEnabled: boolean;
  exceedingAction: ExceedingAction;
}
