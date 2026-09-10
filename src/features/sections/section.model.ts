/* One section row for the attendance picker, typed to the columns the list
   renders. The API's `SectionView` (src/sections/sections.service.ts) also
   carries branch/year/level ids, delivery mode, supervisor and WhatsApp group —
   none of which the list shows, so they are not modelled here. */

export interface SectionTeacher {
  userId: string;
  fullName: string;
  isPrimary: boolean;
}

export interface Section {
  id: string;
  name: string;
  gender: string;
  levelId: number;
  defaultMode: string;
  enrolledCount: number;
  capacity: number | null;
  teachers: SectionTeacher[];
}

/** The body of `POST /sections`. Level, gender, branch and year are the section's
 *  identity (composite-FK targets), so they are set only at creation. */
export interface CreateSectionInput {
  branchId: number;
  academicYearId: number;
  levelId: number;
  gender: 'male' | 'female';
  name: string;
  defaultMode: string;
  capacity: number | null;
}

/** `PATCH /sections/:id` — only the mutable fields. */
export interface UpdateSectionInput {
  name?: string;
  defaultMode?: string;
  capacity?: number | null;
}

/** The list query. Scoped to one academic year (the list would otherwise mix
 *  years). The picker passes only year+page; the import form also scopes by
 *  branch and raises `pageSize` to load a branch's sections in one page for its
 *  section-mapping dropdowns. The API has no text search on sections. */
export interface SectionsQuery {
  academicYearId: number;
  page: number;
  branchId?: number;
  pageSize?: number;
}

/** A single section, read by a grid for its heading and for scoping: the year
 *  (to load its terms), the level and gender (to find the section's exams). */
export interface SectionDetail {
  id: string;
  name: string;
  gender: string;
  levelId: number;
  branchId: number;
  academicYearId: number;
  /* The API's `SectionView` has always carried these; they were left unmodelled
     while only the attendance and score grids read a class. The class detail
     screen shows the roster count and drives its teachers tab from them. */
  defaultMode: string;
  capacity: number | null;
  enrolledCount: number;
  teachers: SectionTeacher[];
}

/** One enrolment row on a class roster — `GET /enrollments?sectionId=`. */
export interface Enrollment {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  entryType: string;
  status: string;
  isHistorical: boolean;
}
