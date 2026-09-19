/* Promotion shapes, mirrored from the API (src/assessment/promotion.service.ts,
   src/rules/promotion.ts). §4.3 decides each enrolment's fate at year end. */

export type PromotionDecision =
  | 'promote'
  | 'promote_with_carry'
  | 'repeat'
  | 'makeup_required'
  | 'graduate';

export interface FailedSubject {
  subjectId: number;
  nameAr: string;
  isMandatory: boolean;
}

export interface PromotionOverride {
  decision: PromotionDecision;
  reason: string;
  overriddenBy: string;
  overriddenAt: string;
}

export interface PromotionRow {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  levelId: number;
  levelCode: string;
  failedSubjects: FailedSubject[];
  /** What will be written: the override if there is one, else `computedDecision`. */
  decision: PromotionDecision;
  /** What the engine worked out — shown beside an override so the head teacher
   *  can see what they are disagreeing with. */
  computedDecision: PromotionDecision;
  /** A recorded disagreement with the engine, or null when its verdict stands. */
  override: PromotionOverride | null;
  /** Set when the row cannot be decided (missing rule, historical enrolment).
   *  A blocked row is never written, so it is excluded from the confirm. */
  blocker: string | null;
  /** The verdict a prior confirm already applied to this enrolment (and when), so
   *  the screen shows run progress and marks a re-run's rows as already done. */
  finalDecision: PromotionDecision | null;
  decidedAt: string | null;
  /** Subjects still owed from an EARLIER level (R13/R14), shown beside this year's
   *  failures. Informational — the engine does not read it (carries gate COMP). */
  pendingCarries: CarriedFromEarlier[];
}

export interface CarriedFromEarlier {
  subjectId: number;
  nameAr: string;
  originLevelCode: string;
}

export interface PreviewParams {
  academicYearId: number;
  afterMakeup: boolean;
  /** Scopes the run to one level (both cohorts). Omitted = the whole year. */
  levelId?: number;
}

export interface ConfirmParams extends PreviewParams {
  /** Exactly the enrolments reviewed in the preview — so the confirm applies
   *  what was seen, not a recomputation. */
  enrollmentIds: string[];
  /** Where forward movement lands. Omitted records the decisions but moves
   *  nobody forward (valid when next year's sections do not exist yet). */
  targetAcademicYearId?: number;
}

export interface ConfirmResult {
  applied: number;
  enrollmentsCreated: number;
  carriesWritten: number;
  notMovedForward: number;
  /** Students who finished a terminal level and are now marked graduated. */
  graduated: number;
}

/** `PUT /promotion/overrides/:enrollmentId`. The reason is mandatory — it is
 *  what the audit log records. */
export interface OverrideParams {
  enrollmentId: string;
  decision: PromotionDecision;
  afterMakeup: boolean;
  reason: string;
}
