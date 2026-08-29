/* ---------------------------------------------------------------------------
   Auth domain model.

   Framework-free by design: nothing in `src/core/` may import React, `fetch`,
   Redux or anything browser-specific. That is what lets the use cases in
   auth.service.ts be tested as plain functions, and what would let this same
   logic run under a different UI or a different transport unchanged.
--------------------------------------------------------------------------- */

/** The API has exactly two roles (`user_role_t`). There is no third. */
export type Role = 'head_teacher' | 'teacher';

/** The API's `PublicUser` — the shape `toPublicUser` guarantees never carries
 *  `password_hash`, `failed_logins` or delete metadata. */
export interface AuthUser {
  id: string;
  fullName: string;
  username: string;
  gender: string;
  role: Role;
  branchId: number | null;
  phone: string;
  email: string | null;
  isActive: boolean;
}

export interface Credentials {
  username: string;
  password: string;
}

/** What `POST /auth/login` yields. The refresh token is deliberately absent:
 *  it lives in an httpOnly cookie the client can never read. */
export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}
