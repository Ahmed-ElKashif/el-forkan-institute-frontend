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

/* Progression rules (§4.3) — the only inputs the promotion engine reads besides
   the results themselves. Shaped like the attendance policies above: a per-level
   row, falling back to the year-wide row with `levelId: null`. When neither
   exists the engine refuses to decide and blocks the enrolment, which is why
   these need to be editable rather than seed-only.

   `failureCountingUnit` exists on the API and is deliberately absent here: the
   rules engine never reads it, so offering it would promise behaviour that does
   not happen. */

export interface ProgressionRule {
  id: number;
  academicYearId: number;
  /** null = the year-wide rule that applies to every level without its own. */
  levelId: number | null;
  maxCarriedSubjects: number;
  makeupRoundEnabled: boolean;
  carryForwardEnabled: boolean;
  mandatoryCanBeCarried: boolean;
}

/** The body of the upsert (PUT by year + level).
 *
 *  Every field is required because the API's schema is strict but **not**
 *  partial: each key has a default, so anything omitted is silently reset rather
 *  than left alone. Sending the whole rule is the only safe call. */
export interface ProgressionRuleInput {
  levelId: number | null;
  maxCarriedSubjects: number;
  makeupRoundEnabled: boolean;
  carryForwardEnabled: boolean;
  mandatoryCanBeCarried: boolean;
}
