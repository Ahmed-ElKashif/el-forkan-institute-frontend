import { afterEach, describe, expect, it, vi } from 'vitest';
import { FetchHttpClient } from './fetch-http-client';
import { HttpError, NetworkFailureError } from './http.errors';
import type { AccessTokenProvider } from './http.port';

const BASE = 'http://api.test';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('authentication', () => {
  it('attaches the access token as a bearer credential', async () => {
    const fetchMock = stubFetch(jsonResponse(200, { ok: true }));
    const provider: AccessTokenProvider = {
      getAccessToken: () => 'token-1',
      refreshAccessToken: vi.fn(),
    };
    const client = new FetchHttpClient({ baseUrl: BASE, tokenProvider: () => provider });

    await client.request({ method: 'GET', path: '/users/me' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-1');
  });

  it('omits the token on anonymous requests', async () => {
    const fetchMock = stubFetch(jsonResponse(200, {}));
    const provider: AccessTokenProvider = {
      getAccessToken: () => 'token-1',
      refreshAccessToken: vi.fn(),
    };
    const client = new FetchHttpClient({ baseUrl: BASE, tokenProvider: () => provider });

    await client.request({ method: 'POST', path: '/auth/login', anonymous: true });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});

describe('401 recovery', () => {
  /* The access token lasts 15 minutes. Without this, every screen would have
     to handle its own expiry. */
  it('refreshes once and replays the original request', async () => {
    const fetchMock = stubFetch(jsonResponse(401, { message: 'Unauthorized' }), jsonResponse(200, { id: 'a1' }));
    const refreshAccessToken = vi.fn().mockResolvedValue('token-2');
    const client = new FetchHttpClient({
      baseUrl: BASE,
      tokenProvider: () => ({ getAccessToken: () => 'token-1', refreshAccessToken }),
    });

    await expect(client.request({ method: 'GET', path: '/students' })).resolves.toEqual({ id: 'a1' });
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('surfaces the original 401 when the refresh itself fails', async () => {
    stubFetch(jsonResponse(401, { message: 'Unauthorized' }));
    const client = new FetchHttpClient({
      baseUrl: BASE,
      tokenProvider: () => ({
        getAccessToken: () => 'token-1',
        refreshAccessToken: vi.fn().mockRejectedValue(new Error('expired')),
      }),
    });

    await expect(client.request({ method: 'GET', path: '/students' })).rejects.toBeInstanceOf(HttpError);
  });

  /* Refreshing in reaction to a failed refresh would loop forever. */
  it('does not attempt a refresh for requests marked noRetry', async () => {
    const fetchMock = stubFetch(jsonResponse(401, { message: 'Unauthorized' }));
    const refreshAccessToken = vi.fn();
    const client = new FetchHttpClient({
      baseUrl: BASE,
      tokenProvider: () => ({ getAccessToken: () => 't', refreshAccessToken }),
    });

    await expect(
      client.request({ method: 'POST', path: '/auth/refresh', noRetry: true }),
    ).rejects.toBeInstanceOf(HttpError);
    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('request body', () => {
  /* File upload: the browser must set multipart/form-data with its own boundary,
     so the client must not stringify the body or force a JSON content type. */
  it('sends a FormData body as multipart without a forced JSON content type', async () => {
    const fetchMock = stubFetch(jsonResponse(200, { id: 'job1' }));
    const client = new FetchHttpClient({ baseUrl: BASE });
    const form = new FormData();
    form.append('field', 'value');

    await client.request({ method: 'POST', path: '/imports', body: form });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    expect(init.body).toBe(form);
  });

  it('serialises a plain object body as JSON', async () => {
    const fetchMock = stubFetch(jsonResponse(200, {}));
    const client = new FetchHttpClient({ baseUrl: BASE });

    await client.request({ method: 'POST', path: '/x', body: { a: 1 } });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
  });
});

describe('responses', () => {
  it('returns undefined for a 204, which is what logout answers', async () => {
    stubFetch(new Response(null, { status: 204 }));
    const client = new FetchHttpClient({ baseUrl: BASE });

    await expect(client.request({ method: 'POST', path: '/auth/logout' })).resolves.toBeUndefined();
  });

  it('reports a failed connection as a network failure, not an HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const client = new FetchHttpClient({ baseUrl: BASE });

    await expect(client.request({ method: 'GET', path: '/health' })).rejects.toBeInstanceOf(
      NetworkFailureError,
    );
  });

  it('still raises an HttpError when the error body is not JSON', async () => {
    stubFetch(new Response('<html>502</html>', { status: 502 }));
    const client = new FetchHttpClient({ baseUrl: BASE });

    await expect(client.request({ method: 'GET', path: '/health' })).rejects.toMatchObject({
      status: 502,
    });
  });
});
