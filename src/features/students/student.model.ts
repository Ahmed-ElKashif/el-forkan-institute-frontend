/* The student list row, typed to the columns the table renders. The API's
   `StudentView` (src/students/students.service.ts) carries more — address,
   markaz, birth date, national-id presence — none of which the list shows, so
   they are not modelled here. A national ID never rides along in a list
   response at all; it has its own audited endpoint. */
/** Absence-risk in the current term against the level's policy (§4.8). */
export type AttendanceRisk = 'none' | 'warning' | 'over';

export interface Student {
  id: string;
  fullName: string;
  gender: string;
  phone: string | null;
  status: string;
  /** The student's study year — the level of their current-year enrollment, or
   *  null when they are not enrolled this year (shown as "—"). */
  levelId: number | null;
  levelName: string | null;
  /** Current-term absences and the level's thresholds; `attendanceRisk` is the
   *  derived badge the roster shows in place of the lifecycle status. */
  absences: number;
  warnAt: number | null;
  maxAbsences: number | null;
  attendanceRisk: AttendanceRisk;
}

/** The list query the screen owns. `pageSize` is fixed (`DEFAULT_PAGE_SIZE`),
 *  so the page, the search term and the study-year filter vary. An empty term
 *  means "no filter"; an absent `levelId` means "all study years". */
export interface StudentsQuery {
  page: number;
  search: string;
  levelId?: number;
  /** 'male' | 'female' — the men's/women's group filter; absent = both. */
  gender?: string;
}

/** The full student record behind the profile page — the fields `GET
 *  /students/:id` returns. The list `Student` above is a deliberate subset; the
 *  profile needs the contact and registration detail the roster never shows.
 *  `levelId`/`levelName` come back null here (the single read does not join the
 *  enrollment); the profile reads the study year from the newest enrollment. */
export interface StudentDetail {
  id: string;
  studentCode: string;
  fullName: string;
  gender: string;
  branchId: number | null;
  phone: string | null;
  whatsappPhone: string | null;
  governorateId: number | null;
  markazId: number | null;
  address: string | null;
  birthDate: string | null;
  hasNationalId: boolean;
  status: string;
  whatsappOptIn: boolean;
  notes: string | null;
}

/** The editable fields of a student record — the body of `PATCH /students/:id`.
 *  Every field is optional: an omitted key leaves that column untouched, an
 *  explicit `null` clears it. `nationalId` is write-only here (the current value
 *  is never returned with the record), so blank means "leave unchanged". */
export interface StudentPatch {
  fullName?: string;
  phone?: string | null;
  whatsappPhone?: string | null;
  birthDate?: string | null;
  governorateId?: number | null;
  markazId?: number | null;
  address?: string | null;
  nationalId?: string | null;
  notes?: string | null;
  whatsappOptIn?: boolean;
  status?: string;
}

/** One year of the student's enrollment timeline (newest first). */
export interface EnrollmentHistoryItem {
  id: string;
  academicYearId: number;
  hijriYear: number | null;
  status: string;
  entryType: string;
  isHistorical: boolean;
  sectionId: string;
  sectionName: string;
  levelId: number | null;
  levelName: string | null;
}

/** A single session in the recent-attendance window. */
export interface AttendanceRecord {
  sessionDate: string;
  mode: string;
  sectionName: string;
  subjectName: string;
  status: string;
  attendedMode: string | null;
  minutesLate: number | null;
}

/** The current-term absence standing that drives the profile's warning banner. */
export interface AbsencePosition {
  absences: number;
  warnAt: number;
  maxAbsences: number;
  risk: AttendanceRisk;
  /** When an absence warning was last sent this term, or null. */
  warningSentAt: string | null;
}

/** Attendance tallies across every enrollment, plus the recent window and the
 *  current-term absence position (null when not enrolled / no policy). */
export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  recent: AttendanceRecord[];
  position: AbsencePosition | null;
}

/** One exam result on the profile's scores panel. */
export interface ExamResult {
  id: string;
  subjectName: string;
  termNumber: number;
  examType: string;
  score: number | null;
  maxScore: number;
  passScore: number;
  isAbsent: boolean;
  result: string;
}

/** A placement/entrance assessment — `GET /students/:id/placements`. */
export interface Placement {
  id: string;
  method: string;
  score: number | null;
  maxScore: number | null;
  passScore: number | null;
  isPassed: boolean | null;
  placedLevelId: number;
  assessedOn: string;
  notes: string | null;
}
