/* ---------------------------------------------------------------------------
   Domain errors.

   The UI must never branch on an HTTP status code. Adapters translate
   transport failures into these types once, at the boundary, so that a screen
   asks "were the credentials wrong?" rather than "was it a 401?".

   Each carries a `messageKey` that maps to `src/app/i18n/ar.json`, so no
   component ever holds an Arabic string literal.
--------------------------------------------------------------------------- */

export abstract class AuthError extends Error {
  abstract readonly messageKey: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** 401 on login — wrong username or password. The API deliberately does not
 *  say which, and neither does the UI. */
export class InvalidCredentialsError extends AuthError {
  readonly messageKey = 'auth.errors.invalidCredentials';
  constructor() {
    super('Invalid username or password');
  }
}

/** 403 — the account exists and the password was right, but it is deactivated.
 *  The API returns this only *after* a correct password, so it is not an
 *  enumeration oracle. A locked account is deliberately NOT distinguished: the
 *  API answers a lockout with the same generic 401 as a wrong password (F9), so
 *  there is no lockout error type here — the UI cannot and must not reveal it. */
export class AccountInactiveError extends AuthError {
  readonly messageKey = 'auth.errors.accountInactive';
  constructor() {
    super('Account is inactive');
  }
}

/** 429 — five login attempts per minute, keyed on IP *and* username.
 *  Hit routinely during development; it deserves its own message so it is not
 *  mistaken for a credentials problem. */
export class TooManyAttemptsError extends AuthError {
  readonly messageKey = 'auth.errors.tooManyAttempts';
  constructor() {
    super('Too many login attempts');
  }
}

/** The refresh cookie is missing, expired, or was rejected. The session is
 *  over; the only cure is signing in again. */
export class SessionExpiredError extends AuthError {
  readonly messageKey = 'auth.errors.sessionExpired';
  constructor() {
    super('Session expired');
  }
}

/** The request never reached the API — offline, DNS, CORS, server down. */
export class NetworkError extends AuthError {
  readonly messageKey = 'auth.errors.network';
  constructor() {
    super('Could not reach the server');
  }
}

/** Anything the adapter could not classify. Kept distinct so an unexpected
 *  500 is never silently displayed as "wrong password". */
export class UnexpectedAuthError extends AuthError {
  readonly messageKey = 'auth.errors.unexpected';
  constructor(message = 'Unexpected error') {
    super(message);
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}
