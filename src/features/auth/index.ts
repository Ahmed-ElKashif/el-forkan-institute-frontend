/* ---------------------------------------------------------------------------
   The auth feature's public surface.

   Everything outside `features/auth/` imports from here. What is not exported
   is private to the feature — `auth-context.ts`, `auth-error-message.ts` and
   the gateway's error-translation table are implementation, and keeping them
   unexported is what lets the feature be reshaped without a hunt through the
   rest of the app.
--------------------------------------------------------------------------- */

/* Screens and React bindings — consumed by the route table. */
export { AuthProvider } from './AuthProvider';
export { ProtectedRoute } from './ProtectedRoute';
export { RequireRole } from './RequireRole';
export { LoginPage } from './LoginPage';
export { ResetPasswordPage } from './ResetPasswordPage';
export { useAuth, type AuthContextValue, type AuthStatus } from './auth-context';

/* Construction — consumed only by the composition root. */
export { AuthService } from './auth.service';
export { AuthGateway } from './auth.gateway';
export { MemoryTokenStore } from './memory-token.store';
export type { TokenStore } from './auth.ports';

/* Domain vocabulary other features will need (a `Role` gates their nav items). */
export type { AuthUser, Credentials, LoginResult, Role } from './auth.model';
export {
  AuthError,
  AccountInactiveError,
  InvalidCredentialsError,
  InvalidOtpError,
  NetworkError,
  SessionExpiredError,
  TooManyAttemptsError,
  UnexpectedAuthError,
  isAuthError,
} from './auth.errors';
