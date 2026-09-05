import type { AttendanceStatus } from '../../ds';

/* The grid the API returns (src/teaching/attendance.service.ts, `AttendanceGrid`),
   typed to the fields this screen renders. The API's cell also carries
   attendedMode/minutesLate/note; the grid does not show them, so they are not
   modelled. `AttendanceStatus` is reused from the design system so the four
   states have one definition, not two. */

export interface AttendanceCellData {
  sessionId: string;
  status: AttendanceStatus | null;
}

export interface AttendanceGridRow {
  enrollmentId: string;
  studentName: string;
  studentCode: string;
  cells: AttendanceCellData[];
  absenceCount: number;
}

export interface AttendanceSession {
  id: string;
  sessionNo: number | null;
  sessionDate: string;
}

export interface AttendanceGrid {
  sectionId: string;
  sessions: AttendanceSession[];
  rows: AttendanceGridRow[];
}

/** One student's status, sent when a whole session column is saved. */
export interface AttendanceEntry {
  enrollmentId: string;
  status: AttendanceStatus;
}

/** A student who crossed an absence threshold, returned by a column save. Drives
 *  the warning badge — the threshold is not on the grid read, only here. */
export interface AbsenceWarning {
  enrollmentId: string;
  absenceCount: number;
  threshold: number | null;
  blocksExams: boolean;
}

export interface SaveAttendanceResult {
  saved: number;
  warnings: AbsenceWarning[];
}
