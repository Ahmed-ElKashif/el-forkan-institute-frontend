import type { IconName } from '../../ds';

export interface NavDestination {
  /** Stable id; also the SideNav active key. */
  key: string;
  /** The route this destination owns. */
  path: string;
  /** i18n key for both the sidebar label and the page title. */
  labelKey: string;
  /** i18n key for the sidebar group heading. */
  groupKey: string;
  icon: IconName;
  /** Filtered out of a teacher's sidebar, and its route gated here as well as
   *  server-side. 54 of the API's 115 routes are head-teacher-only. */
  headTeacherOnly?: boolean;
  /** The build phase that replaces this destination's placeholder with the
   *  real screen. Shown, honestly, on the placeholder. */
  phase: string;
}

/** Every destination in the product, in sidebar order.
 *
 *  The single source of truth for three things that must not drift apart: the
 *  sidebar, the page titles, and which routes are gated. The route table and
 *  the role guard both read `headTeacherOnly` from here, so a new
 *  head-teacher-only screen is gated the moment it is added to this list. */
export const DESTINATIONS: NavDestination[] = [
  { key: 'dashboard', path: '/', labelKey: 'nav.dashboard', groupKey: 'nav.groups.general', icon: 'chart-column', phase: 'F1' },
  { key: 'students', path: '/students', labelKey: 'nav.students', groupKey: 'nav.groups.general', icon: 'users', phase: 'F1' },
  // Teaching before administration: attendance and scores are the daily work, so
  // the group listing them sits right under General (SideNav orders groups by
  // first appearance here).
  { key: 'attendance', path: '/attendance', labelKey: 'nav.attendance', groupKey: 'nav.groups.teaching', icon: 'clipboard-check', phase: 'F2' },
  { key: 'scores', path: '/scores', labelKey: 'nav.scores', groupKey: 'nav.groups.teaching', icon: 'clipboard-list', phase: 'F3' },
  { key: 'sections', path: '/sections', labelKey: 'nav.sections', groupKey: 'nav.groups.administration', icon: 'book-open', headTeacherOnly: true, phase: 'F6' },
  { key: 'users', path: '/users', labelKey: 'nav.users', groupKey: 'nav.groups.administration', icon: 'user', headTeacherOnly: true, phase: 'F6' },
  { key: 'catalogue', path: '/catalogue', labelKey: 'nav.catalogue', groupKey: 'nav.groups.administration', icon: 'book-open', headTeacherOnly: true, phase: 'F6' },
  // No `curriculum` destination: the curriculum is assembled out of the levels,
  // subjects and books on the catalogue screen, so it is a tab there
  // (`/catalogue?tab=curriculum`). `/curriculum` redirects into that tab.
  // No `timetable` destination: a class's weekly grid is a tab on that class
  // (`/sections/:id?tab=timetable`), so a separate entry would have asked the
  // head teacher to pick the same class twice. `/timetable/:id` still resolves —
  // App.tsx redirects it into the tab.
  { key: 'whatsapp', path: '/whatsapp', labelKey: 'nav.whatsapp', groupKey: 'nav.groups.administration', icon: 'message-circle', headTeacherOnly: true, phase: 'F6' },
  // One entry for both directions of the same workbook; `/exports` redirects
  // into this screen's export tab.
  { key: 'imports', path: '/imports', labelKey: 'nav.imports', groupKey: 'nav.groups.administration', icon: 'file-spreadsheet', headTeacherOnly: true, phase: 'F4' },
  { key: 'certificates', path: '/certificates', labelKey: 'nav.certificates', groupKey: 'nav.groups.administration', icon: 'award', headTeacherOnly: true, phase: 'F5' },
  { key: 'promotion', path: '/promotion', labelKey: 'nav.promotion', groupKey: 'nav.groups.administration', icon: 'rotate-ccw', headTeacherOnly: true, phase: 'F6' },
  { key: 'audit', path: '/audit', labelKey: 'nav.audit', groupKey: 'nav.groups.administration', icon: 'history', headTeacherOnly: true, phase: 'F6' },
  { key: 'settings', path: '/settings', labelKey: 'nav.settings', groupKey: 'nav.groups.administration', icon: 'settings', headTeacherOnly: true, phase: 'F6' },
];

/** The destination that owns the current path.
 *
 *  Exact match for the root, longest matching prefix for the rest — so
 *  `/students/42` still resolves to Students once that screen has children.
 *  Unmatched paths never render the shell (the router redirects them), so the
 *  dashboard fallback only guards the return type. */
export function activeDestination(pathname: string): NavDestination {
  const matches = DESTINATIONS.filter((d) =>
    d.path === '/' ? pathname === '/' : pathname.startsWith(d.path),
  );
  const best = [...matches].sort((a, b) => b.path.length - a.path.length)[0];
  return best ?? DESTINATIONS[0];
}
