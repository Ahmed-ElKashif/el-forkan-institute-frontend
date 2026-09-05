export { UsersPage } from './UsersPage';

/* The timetable editor assigns a teacher to a slot; teachers are users, so the
   options read is exposed through this barrel — the same cross-feature seam the
   sections picker and catalogue pickers use. */
export { useTeacherOptionsQuery } from './users.api';
export type { User } from './user.model';
