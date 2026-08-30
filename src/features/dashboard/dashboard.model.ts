/* The two API reads the dashboard needs, typed to the fields it renders.

   `/reports/summary` (src/reporting/reporting.service.ts, `DashboardSummary`)
   is scoped by the API: a teacher's numbers are their own sections, the head
   teacher's are the branch or the institute. The client renders whatever the
   scope returns — it does not re-scope. */

/** One row of `GET /academic-years`, newest first. The dashboard needs only the
 *  id (to ask for the summary) and the Hijri year (to caption it). */
export interface AcademicYear {
  id: number;
  hijriYear: number;
}

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
