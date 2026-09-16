/* The class-days (schedule) tab is hosted by the level hub, so it is exposed
   through the barrel the same way the sections picker is reused elsewhere. The
   attendance tab reads the same session list to offer its date picker. */
export { ClassDaysTab } from './ClassDaysTab';
export { useListSessionsQuery } from './sessions.api';
