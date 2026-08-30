import { Outlet } from 'react-router-dom';
import type { Role } from './auth.model';
import { useAuth } from './auth-context';
import { ForbiddenPage } from './ForbiddenPage';

/** Route-level authorisation. Renders the guarded routes only for `allow`;
 *  every other role gets the 403 screen — never a disabled or hidden control.
 *
 *  Presentation only. The API enforces the same rule server-side on 54 of its
 *  115 routes, and refuses a teacher's request to a head-teacher route there
 *  regardless of what the client renders. This spares the teacher a request
 *  that would 403 anyway; it does not secure anything.
 *
 *  Always nested inside `ProtectedRoute`, so a user is present; a missing user
 *  fails closed to the 403. */
export function RequireRole({ allow }: { allow: Role }) {
  const { user } = useAuth();
  return user?.role === allow ? <Outlet /> : <ForbiddenPage />;
}
