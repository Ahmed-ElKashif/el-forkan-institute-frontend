/* Curriculum shapes, mirrored from the API (src/curriculum/curriculum.service.ts
   and dto/curriculum.schema.ts). The curriculum is the syllabus for one
   (year, level, term): a set of مواد, each optionally holding فروع one level
   deep (§4.1 caps nesting at two), and each row holding units — a book plus the
   scope of what it covers. */

export type GradingMode = 'score' | 'pass_fail';
export type AssessmentType = 'written' | 'oral' | 'memorization' | 'research' | 'practical';

/** One book/scope entry under a curriculum row. `bookId` is optional — some
 *  units are a scope of memorization with no printed book. */
export interface CurriculumUnit {
  id: number;
  bookId: number | null;
  bookTitleAr: string | null;
  unitLabel: string | null;
  syllabusScopeAr: string;
  /** Same group number on two units marks them «أو» alternatives on the sheet. */
  alternativeGroup: number | null;
  sortOrder: number;
}

/** One curriculum row: a مادة (parent null) or a فرع (parent set). A row with
 *  children is a container — the exam, pass mark and weight belong to the
 *  children, and `isExaminable` is false. */
export interface CurriculumRow {
  id: number;
  academicYearId: number;
  levelId: number;
  termNumber: number;
  subjectId: number;
  subjectNameAr: string;
  parentCurriculumId: number | null;
  isExaminable: boolean;
  isMandatory: boolean;
  gradingMode: GradingMode;
  assessmentType: AssessmentType;
  maxScore: number;
  passScore: number;
  weight: number;
  teachingOrder: number | null;
  units: CurriculumUnit[];
}

/** A top-level مادة with its فروع nested. The API builds the tree; the reader
 *  never recurses because depth is capped at two. */
export type CurriculumTreeNode = CurriculumRow & { children: CurriculumRow[] };

export interface CreateCurriculumInput {
  subjectId: number;
  termNumber: number;
  /** null for a top-level مادة; a parent row's id nests this as its فرع. */
  parentCurriculumId: number | null;
  isExaminable: boolean;
  isMandatory: boolean;
  gradingMode: GradingMode;
  assessmentType: AssessmentType;
  maxScore: number;
  passScore: number;
  weight: number;
  teachingOrder: number | null;
}

/** subjectId and termNumber are the row's identity (year+level+term+subject is
 *  the DDL's UNIQUE), so changing either is a delete-plus-create, not an edit. */
export type UpdateCurriculumInput = Partial<Omit<CreateCurriculumInput, 'subjectId' | 'termNumber'>>;

export interface CurriculumUnitInput {
  bookId: number | null;
  unitLabel: string | null;
  syllabusScopeAr: string;
  alternativeGroup: number | null;
  sortOrder: number;
}
