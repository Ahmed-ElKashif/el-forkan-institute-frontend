export { CurriculumPage } from './CurriculumPage';
// The exam-creation dialog reads examinable rows to pick the subject an exam
// belongs to (an exam points at a curriculum row, §4.2).
export { useCurriculumTreeQuery } from './curriculum.api';
export type { CurriculumRow, CurriculumTreeNode } from './curriculum.model';
