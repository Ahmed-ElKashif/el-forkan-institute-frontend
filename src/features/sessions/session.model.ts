/* A scheduled/held/cancelled session, mirrored from the API
   (backend src/teaching/sessions.service.ts `SessionView`), narrowed to what the
   management screen shows and edits. Times are `HH:MM` in the form; the list
   read may carry seconds, so a helper trims them. */

export interface Session {
  id: string;
  subjectId: number;
  subjectNameAr: string;
  sheikhName: string | null;
  sessionNo: number | null;
  sessionDate: string;
  startsAt: string;
  endsAt: string;
  mode: string;
  room: string | null;
  meetingUrl: string | null;
  status: string;
  cancelReason: string | null;
}

/** Which cohorts a class-day period runs for. `both` is one sheikh teaching boys
 *  and girls together (girls in a separate room on speakers); it becomes one
 *  session per cohort so each keeps its own attendance. */
export type PeriodGenderScope = 'both' | 'male' | 'female';

/** One period of a class day, before it is fanned out to the level's cohorts. */
export interface ClassDayPeriodInput {
  subjectId: number;
  slotOrder: number;
  startsAt: string;
  endsAt: string;
  sheikhName: string | null;
  genderScope: PeriodGenderScope;
}

/** `POST /levels/:levelId/class-days`. The level owns both cohorts, so a class
 *  day is created for the level, not a single gendered section. */
export interface CreateClassDayInput {
  levelId: number;
  academicYearId: number;
  sessionDate: string;
  periods: ClassDayPeriodInput[];
}

/** `PATCH /sessions/:id` — edit one period of an upcoming class day. Every field
 *  optional; an omitted key is left as is. Scope is fixed at creation (it maps to
 *  which cohorts hold the period), so it is not editable here. */
export interface UpdateSessionInput {
  subjectId?: number;
  startsAt?: string;
  endsAt?: string;
  sheikhName?: string | null;
}

export interface SessionsQuery {
  sectionId: string;
  page: number;
}
