import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser, Credentials, OtpVerification } from './auth.model';
import { useContainer } from '../../shared/di/DiProvider';
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context';

/** Holds session state for the React tree and nothing else.
 *
 *  Every decision — what a failed login means, whether a refresh is in flight,
 *  where the token lives — belongs to `AuthService`. This component's only job
 *  is turning that service's results into rendered state, which is why it has
 *  no `try/catch` around `signIn`: the domain error is the caller's to display. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth } = useContainer();
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [user, setUser] = useState<AuthUser | null>(null);

  /* On boot the access token is gone — it only ever lived in memory — but the
     httpOnly refresh cookie may still be valid, so a reload keeps the session.

     `restore()` already distinguishes "no session" from a real fault. Both end
     up anonymous here because there is only one thing to render either way, but
     a fault is not silently lost: the user lands on the sign-in screen, and the
     next attempt reports the actual cause — "could not reach the server" rather
     than a blank page. */
  useEffect(() => {
    let cancelled = false;

    void auth
      .restore()
      .catch(() => null)
      .then((restored) => {
        if (cancelled) return;
        setUser(restored);
        setStatus(restored ? 'authenticated' : 'anonymous');
      });

    return () => {
      cancelled = true;
    };
  }, [auth]);

  /* First factor: no session yet, so no state change — the caller gets the
     challenge id and moves to the code step. */
  const beginSignIn = useCallback(
    (credentials: Credentials) => auth.beginSignIn(credentials),
    [auth],
  );

  const verifyOtp = useCallback(
    async (verification: OtpVerification) => {
      const signedIn = await auth.completeSignIn(verification);
      setUser(signedIn);
      setStatus('authenticated');
    },
    [auth],
  );

  const signOut = useCallback(async () => {
    await auth.signOut();
    setUser(null);
    setStatus('anonymous');
  }, [auth]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, beginSignIn, verifyOtp, signOut }),
    [status, user, beginSignIn, verifyOtp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
