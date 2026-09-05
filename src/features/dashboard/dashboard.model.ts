/* The two API reads the dashboard needs, typed to the fields it renders.

   `/reports/summary` (src/reporting/reporting.service.ts, `DashboardSummary`)
   is scoped by the API: a teacher's numbers are their own sections, the head
   teacher's are the branch or the institute. The client renders whatever the
   scope returns — it does not re-scope. */

export interface DashboardSummary {
  academicYearId: number;
  hijriYear: number;
  students: {
    active: number;
    withPhone: number;
    /** Whole-number percent, 0–100 — already computed by the API. */
    phoneCoverage: number;
  };
  enrollments: number;
  sections: number;
  pendingCarries: number;
  certificatesIssued: number;
}

/** One level's enrolment split, from `/reports/headcount-by-level` — the source
 *  for the "students per level" chart. */
export interface HeadcountCell {
  levelId: number;
  levelCode: string;
  levelNameAr: string;
  male: number;
  female: number;
  total: number;
}

/** One subject's outcome tally, from `/reports/pass-rates` — aggregated into the
 *  pass-rate ring. `sat` is how many took the exam. */
export interface PassRateRow {
  levelId: number;
  levelCode: string;
  subjectId: number;
  subjectNameAr: string;
  sat: number;
  passed: number;
  failed: number;
  absent: number;
}

/** Students per markaz, from `/reports/headcount-by-markaz`. `markazId` is null
 *  for students with no markaz on file. */
export interface MarkazCount {
  markazId: number | null;
  markazNameAr: string;
  count: number;
}

/** One session-day's attendance, from `/reports/attendance-trend` — the
 *  attendance-rate line. Ordered oldest first. */
export interface AttendancePoint {
  sessionDate: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
}
