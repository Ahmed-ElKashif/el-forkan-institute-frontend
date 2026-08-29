import { createContext, useContext } from 'react';
import type { AuthUser, Credentials } from './auth.model';

/** `checking` is the brief window on boot while `restore()` decides whether
 *  the refresh cookie still yields a session. Rendering the login screen
 *  during it would flash a sign-in form at an already-signed-in user. */
export type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (credentials: Credentials) => Promise<void>;
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
