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
  email: string;
  password: string;
}

/** What `POST /auth/login` yields now: not a session, but the id of an OTP
 *  challenge (F12). A password alone proves the first factor; the emailed code
 *  is the second. */
export interface LoginChallenge {
  challengeId: string;
}

/** The second-factor submission — the challenge id plus the six-digit code from
 *  the email. */
export interface OtpVerification {
  challengeId: string;
  code: string;
}

/** Forgot-password, step one: the email a reset code is sent to. */
export interface PasswordResetRequest {
  email: string;
}

/** Forgot-password, step two: the challenge id from step one, the emailed code,
 *  and the new password. */
export interface PasswordResetConfirm {
  challengeId: string;
  code: string;
  newPassword: string;
}

/** What `POST /auth/verify-otp` yields — the actual session. The refresh token
 *  is deliberately absent: it lives in an httpOnly cookie the client can never
 *  read. */
export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}
