import { createContext, useContext } from 'react';
import type { AuthUser, Credentials, OtpVerification } from './auth.model';

/** `checking` is the brief window on boot while `restore()` decides whether
 *  the refresh cookie still yields a session. Rendering the login screen
 *  during it would flash a sign-in form at an already-signed-in user. */
export type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** First factor. Resolves to the OTP challenge id; the session is not yet
   *  open, so `status` stays `anonymous` until {@link verifyOtp} succeeds. */
  beginSignIn: (credentials: Credentials) => Promise<string>;
  /** Second factor. On success `status` becomes `authenticated`. */
  verifyOtp: (verification: OtpVerification) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return value;
}
