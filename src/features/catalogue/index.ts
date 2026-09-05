export { CataloguePage } from './CataloguePage';

/* Reference reads the curriculum builder composes on top of — levels, and the
   whole active subject/book sets for its pickers. Exposed through the barrel
   (never a deep import) the same way the sections picker is reused elsewhere. */
export { useLevelsQuery, useSubjectOptionsQuery, useBookOptionsQuery } from './catalogue.api';
export type { Level, Subject, Book } from './catalogue.model';
