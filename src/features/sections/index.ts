export { SectionTeachersDialog } from './SectionTeachersDialog';
/* The attendance and score grids read a section for their heading and scoping;
   the sections feature owns section data, so it exposes the read through its
   barrel rather than each grid reaching for `/sections/:id` itself. The level
   hub (features/levels) reads the same section, its roster, manages its
   teachers, and provisions the year's classes, so those are exposed here too. */
export {
  useGetSectionQuery,
  useListSectionsQuery,
  useListEnrollmentsQuery,
  useUpdateEnrollmentMutation,
  useProvisionSectionsMutation,
} from './sections.api';
export type { SectionDetail, Section, Enrollment } from './section.model';
/* The class roster, with add/edit/withdraw. Owned here (section data) and shown
   in the level hub's roster tab (features/levels). */
export { RosterTab } from './RosterTab';
