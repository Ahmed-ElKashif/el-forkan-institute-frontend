import { describe, expect, it, vi } from 'vitest';
import { AuthGateway } from './auth.gateway';
import {
  AccountInactiveError,
  InvalidCredentialsError,
  NetworkError,
  SessionExpiredError,
  TooManyAttemptsError,
  UnexpectedAuthError,
} from './auth.errors';
import { HttpError, NetworkFailureError } from '../../shared/http/http.errors';
import type { HttpClient, HttpRequest } from '../../shared/http/http.port';

function clientReturning(handler: (request: HttpRequest) => unknown): HttpClient {
  return { request: vi.fn(async (request: HttpRequest) => handler(request) as never) };
}

function clientRejecting(error: unknown): HttpClient {
  return { request: vi.fn().mockRejectedValue(error) };
}

describe('refresh', () => {
  /* csrf-csrf binds the CSRF secret to a hash of the refresh cookie, so the
     token must be fetched first and echoed back in the header. Getting this
     order or this header name wrong makes every refresh fail with a 403. */
  it('fetches a CSRF token, then exchanges the cookie with that token in the header', async () => {
    const seen: HttpRequest[] = [];
    const http = clientReturning((request) => {
      seen.push(request);
      return request.path.endsWith('/csrf-token')
        ? { csrfToken: 'csrf-abc' }
        : { accessToken: 'access-9' };
    });

    await expect(new AuthGateway(http).refresh()).resolves.toBe('access-9');

    expect(seen.map((r) => `${r.method} ${r.path}`)).toEqual([
      'GET /auth/refresh/csrf-token',
      'POST /auth/refresh',
    ]);
    expect(seen[1].headers).toEqual({ 'x-csrf-token': 'csrf-abc' });
  });

  it('sends cookies on both calls, since both are scoped to /auth/refresh', async () => {
    const seen: HttpRequest[] = [];
    const http = clientReturning((request) => {
      seen.push(request);
      return { csrfToken: 'c', accessToken: 'a' };
    });

    await new AuthGateway(http).refresh();

    expect(seen.every((r) => r.withCredentials)).toBe(true);
  });
});

describe('error translation', () => {
  /* A 401 means "wrong password" on login and "session over" everywhere else.
     The response body cannot be used to tell them apart: the API returns a
     bare 401 for a bad password and for four refresh failures, one of which
     ("Account no longer active") mentions neither. */
  it('reads a 401 on login as bad credentials', async () => {
    const http = clientRejecting(new HttpError(401, { message: 'Invalid username or password' }));

    await expect(new AuthGateway(http).login({ username: 'a', password: 'b' })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it('reads a 401 on refresh as an expired session', async () => {
    const http = clientRejecting(new HttpError(401, { message: 'Account no longer active' }));

    await expect(new AuthGateway(http).refresh()).rejects.toBeInstanceOf(SessionExpiredError);
  });

  /* On login a 403 means one thing: a deactivated account. A locked account is
     answered with a generic 401, not a 403 (the API refuses to make lockout an
     enumeration oracle), so there is no lockout case to separate here. */
  it('reads a 403 "inactive" on login as a deactivated account', async () => {
    const http = clientRejecting(new HttpError(403, { message: 'Account is inactive' }));

    await expect(
      new AuthGateway(http).login({ username: 'a', password: 'b' }),
    ).rejects.toBeInstanceOf(AccountInactiveError);
  });

  /* Confirmed against the running API: a refresh with no valid cookie is
     rejected by csrf-csrf with 403 "invalid csrf token" before the auth code
     runs, because the CSRF secret is bound to a hash of that cookie. */
  it('reads a CSRF rejection during refresh as an expired session', async () => {
    const http = clientRejecting(new HttpError(403, { message: 'invalid csrf token' }));

    await expect(new AuthGateway(http).refresh()).rejects.toBeInstanceOf(SessionExpiredError);
  });

  it('does not read a CSRF rejection on login as an expired session', async () => {
    const http = clientRejecting(new HttpError(403, { message: 'invalid csrf token' }));

    await expect(
      new AuthGateway(http).login({ username: 'a', password: 'b' }),
    ).rejects.toBeInstanceOf(UnexpectedAuthError);
  });

  it('does not guess at an unrecognised 403', async () => {
    const http = clientRejecting(new HttpError(403, { message: 'Something else entirely' }));

    await expect(
      new AuthGateway(http).login({ username: 'a', password: 'b' }),
    ).rejects.toBeInstanceOf(UnexpectedAuthError);
  });

  it('reads a 429 as the login throttle', async () => {
    const http = clientRejecting(new HttpError(429, { message: 'ThrottlerException' }));

    await expect(
      new AuthGateway(http).login({ username: 'a', password: 'b' }),
    ).rejects.toBeInstanceOf(TooManyAttemptsError);
  });

  it('reads a transport failure as a network error', async () => {
    const http = clientRejecting(new NetworkFailureError());

    await expect(new AuthGateway(http).fetchCurrentUser()).rejects.toBeInstanceOf(NetworkError);
  });
});
