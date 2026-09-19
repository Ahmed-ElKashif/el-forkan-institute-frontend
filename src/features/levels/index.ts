/* The level hub's public surface. The hub is the product's main destination:
   the classes running this year, each opening onto its roster, catalogue, class
   days, attendance and scores. The picker lists cohorts, so a row already names
   one gendered class and the hub opens resolved. Consumed by the route table. */
export { LevelsPage } from './LevelsPage';
export { LevelDetailPage } from './LevelDetailPage';
/* Attendance is marked per class per day, so its nav entry stays on its own
   route (no bounce into the hub). Scores has no twin here: marks belong to an
   exam, so the Scores nav opens the exam worklist in `../scores` instead. */
export { LevelAttendancePage } from './LevelAttendancePage';
export { GENDERS, findSection, type Gender } from './level.model';
