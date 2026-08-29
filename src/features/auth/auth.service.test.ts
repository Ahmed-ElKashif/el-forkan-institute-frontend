import { describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';
import { AuthGateway } from './auth.gateway';
import { MemoryTokenStore } from './memory-token.store';
import { NetworkError } from './auth.errors';
import type { AuthUser } from './auth.model';
import { HttpError, NetworkFailureError } from '../../shared/http/http.errors';
import { stubHttpClient, type StubRoutes } from '../../test/stub-http-client';

const USER: AuthUser = {
  id: 'a1',
  fullName: 'محمود عبد الله',
  username: 'headteacher',
  gender: 'male',
  role: 'head_teacher',
  branchId: 1,
  phone: '+201000000000',
  email: null,
  isActive: true,
};

const HAPPY: StubRoutes = {
  'POST /auth/login': { accessToken: 'access-1', user: USER },
  'GET /auth/refresh/csrf-token': { csrfToken: 'csrf-1' },
  'POST /auth/refresh': { accessToken: 'access-2' },
  'POST /auth/logout': undefined,
  'GET /users/me': USER,
};

function makeService(routes: StubRoutes = HAPPY) {
  const http = stubHttpClient(routes);
  const tokens = new MemoryTokenStore();
  return { service: new AuthService(new AuthGateway(http), tokens), tokens, http };
}

function throws(error: unknown) {
  return () => {
    throw error;
  };
}

describe('signIn', () => {
  it('stores the access token so subsequent requests are authenticated', async () => {
    const { service, tokens } = makeService();

    const user = await service.signIn({ username: 'headteacher', password: 'pw' });

    expect(user).toEqual(USER);
    expect(tokens.get()).toBe('access-1');
  });
});

describe('refreshAccessToken', () => {
  /* The API rotates the refresh token on every call, so two concurrent
     refreshes would invalidate each other and end the session. */
  it('shares one exchange between concurrent callers', async () => {
    const { service, http } = makeService();

    const [first, second] = await Promise.all([
      service.refreshAccessToken(),
      service.refreshAccessToken(),
    ]);

    expect(first).toBe('access-2');
    expect(second).toBe('access-2');
    expect(http.countOf('POST /auth/refresh')).toBe(1);
  });

  it('allows a later refresh after one fails', async () => {
    let attempt = 0;
    const { service, tokens } = makeService({
      ...HAPPY,
      'POST /auth/refresh': () => {
        attempt += 1;
        if (attempt === 1) throw new HttpError(401, { message: 'Refresh token expired' });
        return { accessToken: 'access-3' };
      },
    });

    await expect(service.refreshAccessToken()).rejects.toThrow();
    await expect(service.refreshAccessToken()).resolves.toBe('access-3');
    expect(tokens.get()).toBe('access-3');
  });
});

describe('restore', () => {
  it('returns the current user when the refresh cookie is still valid', async () => {
    const { service, tokens } = makeService();

    await expect(service.restore()).resolves.toEqual(USER);
    expect(tokens.get()).toBe('access-2');
  });

  it('reports no session, rather than throwing, when the cookie has expired', async () => {
    const { service, tokens, http } = makeService({
      ...HAPPY,
      'POST /auth/refresh': throws(new HttpError(401, { message: 'Refresh token expired' })),
    });

    await expect(service.restore()).resolves.toBeNull();
    expect(tokens.get()).toBeNull();
    expect(http.countOf('GET /users/me')).toBe(0);
  });

  /* "The server is unreachable" is not the same fact as "you are not signed
     in". Collapsing the two would hide an outage behind a login screen. */
  it('propagates a fault that is not an expired session', async () => {
    const { service } = makeService({
      ...HAPPY,
      'GET /auth/refresh/csrf-token': throws(new NetworkFailureError()),
    });

    await expect(service.restore()).rejects.toBeInstanceOf(NetworkError);
  });
});

describe('signOut', () => {
  /* Pressing "sign out" must sign you out of this tab whatever the network
     does — otherwise a user on a shared classroom machine walks away still
     authenticated. */
  it('clears the token even when the logout call fails', async () => {
    const { service, tokens } = makeService({
      ...HAPPY,
      'POST /auth/logout': throws(new NetworkFailureError()),
    });
    tokens.set('access-1');

    await expect(service.signOut()).rejects.toBeInstanceOf(NetworkError);
    expect(tokens.get()).toBeNull();
  });
});
