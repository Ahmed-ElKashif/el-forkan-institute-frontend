import {
  AccountInactiveError,
  InvalidCredentialsError,
  NetworkError,
  SessionExpiredError,
  TooManyAttemptsError,
  UnexpectedAuthError,
} from './auth.errors';
import type { AuthUser, Credentials, LoginResult } from './auth.model';
import { HttpError, NetworkFailureError } from '../../shared/http/http.errors';
import type { HttpClient } from '../../shared/http/http.port';

/* The CSRF cookie and the refresh cookie are both scoped to Path=/auth/refresh,
   which is why the token endpoint sits underneath it — see the API's
   `src/auth/csrf.ts`. Requests to this path must send cookies. */
const REFRESH_PATH = '/auth/refresh';
const CSRF_HEADER = 'x-csrf-token';

interface CsrfTokenResponse {
  csrfToken: string;
}

interface RefreshResponse {
  accessToken: string;
}

/** Speaks HTTP to the API's `/auth` routes and translates every failure into
 *  the auth domain's vocabulary, so nothing above it branches on a status code.
 *
 *  Concrete on purpose: it has one implementation, and the seam that matters
 *  is `HttpClient` underneath it. Tests stub the client and let the real
 *  translation run. */
export class AuthGateway {
  constructor(private readonly http: HttpClient) {}

  async login(credentials: Credentials): Promise<LoginResult> {
    return this.translating('credentials', () =>
      this.http.request<LoginResult>({
        method: 'POST',
        path: '/auth/login',
        body: credentials,
        /* The response sets the refresh cookie, so the browser must be
           allowed to store it. */
        withCredentials: true,
        anonymous: true,
        noRetry: true,
      }),
    );
  }

  /** Two calls, in this order, because `csrf-csrf` binds the CSRF secret to a
   *  hash of the refresh cookie: the token is only valid once that cookie is
   *  present, and it must be echoed back in the `x-csrf-token` header. */
  async refresh(): Promise<string> {
    return this.translating('session', async () => {
      const { csrfToken } = await this.http.request<CsrfTokenResponse>({
        method: 'GET',
        path: `${REFRESH_PATH}/csrf-token`,
        withCredentials: true,
        anonymous: true,
        noRetry: true,
      });

      const { accessToken } = await this.http.request<RefreshResponse>({
        method: 'POST',
        path: REFRESH_PATH,
        headers: { [CSRF_HEADER]: csrfToken },
        withCredentials: true,
        anonymous: true,
        noRetry: true,
      });

      return accessToken;
    });
  }

  async logout(): Promise<void> {
    await this.translating('session', () =>
      this.http.request<void>({
        method: 'POST',
        path: '/auth/logout',
        withCredentials: true,
        noRetry: true,
      }),
    );
  }

  async fetchCurrentUser(): Promise<AuthUser> {
    return this.translating('session', () =>
      this.http.request<AuthUser>({ method: 'GET', path: '/users/me' }),
    );
  }

  private async translating<T>(context: Context, call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch (error) {
      throw toAuthError(error, context);
    }
  }
}

/** Which call failed. A 401 means different things depending on where it came
 *  from, and the caller knows reliably where it came from — the response
 *  message does not say. The API returns a bare 401 for a bad password and
 *  also for four distinct refresh failures ("Invalid refresh token",
 *  "Refresh token expired", "Refresh token reuse detected", "Account no longer
 *  active"), so matching on the text would misfile the last of those. */
type Context = 'credentials' | 'session';

/** The single translation table from transport failure to domain meaning.
 *
 *  On login a 403 now means exactly one thing — a deactivated account. A locked
 *  account is answered with a generic 401 (F9), never a 403, so there is no
 *  lockout case to disambiguate. On refresh a 403 is the csrf-csrf rejection.
 *  Any 403 that matches neither falls through to `UnexpectedAuthError` rather
 *  than guessing. */
function toAuthError(error: unknown, context: Context): Error {
  if (error instanceof NetworkFailureError) return new NetworkError();
  if (!(error instanceof HttpError)) {
    return error instanceof Error ? error : new UnexpectedAuthError();
  }

  switch (error.status) {
    case 401:
      return context === 'credentials'
        ? new InvalidCredentialsError()
        : new SessionExpiredError();
    case 403: {
      const detail = error.detail.toLowerCase();
      if (detail.includes('inactive')) return new AccountInactiveError();
      /* Verified against the running API: refreshing without a valid refresh
         cookie answers 403 "invalid csrf token", not 401 — csrf-csrf rejects
         the request before the auth code ever runs, because the CSRF secret is
         bound to a hash of that same cookie. It means the session is over. */
      if (context === 'session' && detail.includes('csrf')) return new SessionExpiredError();
      return new UnexpectedAuthError(error.detail);
    }
    case 429:
      return new TooManyAttemptsError();
    default:
      return new UnexpectedAuthError(error.detail);
  }
}
