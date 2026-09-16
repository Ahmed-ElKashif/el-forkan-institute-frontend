export { CataloguePage } from './CataloguePage';
/* The level hub edits a single level's progression flags from its header, so it
   reuses this dialog the same way it embeds the catalogue. */
export { LevelEditDialog } from './LevelEditDialog';

/* Reference reads the curriculum builder composes on top of — levels, and the
   whole active subject/book sets for its pickers. Exposed through the barrel
   (never a deep import) the same way the sections picker is reused elsewhere. */
export { useLevelsQuery, useSubjectOptionsQuery, useBookOptionsQuery } from './catalogue.api';
export type { Level, Subject, Book } from './catalogue.model';
