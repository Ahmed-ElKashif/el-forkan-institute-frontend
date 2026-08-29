import type { ReactNode } from 'react';
import type { Role } from './SideNav';

export interface RoleGateProps {
  role: Role;
  allow?: Role;
  fallback?: ReactNode;
  children: ReactNode;
}

/** Renders children only for the allowed role.
 *
 *  The teacher UI shows nothing — never a disabled control. This mirrors the
 *  API, where 54 of the 115 routes are head-teacher-only and a teacher's call
 *  is refused outright rather than degraded.
 *
 *  This is presentation only. It hides controls; it does not secure anything.
 *  Authorisation is the API's job and every gated route is checked there. */
export function RoleGate({ role, allow = 'head_teacher', fallback = null, children }: RoleGateProps) {
  return <>{role === allow ? children : fallback}</>;
}
