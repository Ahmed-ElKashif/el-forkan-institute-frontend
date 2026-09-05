export { SectionsPage, type SectionsPageProps } from './SectionsPage';
export { SectionsAdminPage } from './SectionsAdminPage';
/* The attendance and score grids read a section for their heading and scoping;
   the sections feature owns section data, so it exposes the read through its
   barrel rather than each grid reaching for `/sections/:id` itself. */
export { useGetSectionQuery, useListSectionsQuery } from './sections.api';
export type { SectionDetail, Section } from './section.model';
