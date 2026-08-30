import { describe, expect, it } from 'vitest';
import type { BaseQueryApi } from '@reduxjs/toolkit/query';
import { httpBaseQuery } from './baseQuery';
import { HttpError, NetworkFailureError } from '../http/http.errors';
import { stubHttpClient } from '../../test/stub-http-client';

/* The one seam every query and mutation crosses. It must pass the request
   straight to the transport (so the token attach and 401 replay keep working)
   and flatten a transport failure into something a screen can branch on. */

function apiWith(http: unknown): BaseQueryApi {
  // baseQuery only ever reads `extra`; the rest of BaseQueryApi is irrelevant
  // here, so the cast keeps the test to what it is actually exercising.
  return { extra: { http } } as unknown as BaseQueryApi;
}

describe('httpBaseQuery', () => {
  it('delegates to the transport and returns its data', async () => {
    const http = stubHttpClient({ 'GET /students': { items: [], total: 0 } });

    const result = await httpBaseQuery({ path: '/students' }, apiWith(http), {});

    expect(result).toEqual({ data: { items: [], total: 0 } });
    expect(http.calls[0]).toMatchObject({ method: 'GET', path: '/students' });
  });

  it('forwards method and body for a write', async () => {
    const http = stubHttpClient({ 'POST /students': { id: 'x' } });

    await httpBaseQuery({ method: 'POST', path: '/students', body: { fullName: 'اسم' } }, apiWith(http), {});

    expect(http.calls[0]).toMatchObject({ method: 'POST', path: '/students', body: { fullName: 'اسم' } });
  });

  it('flattens an HTTP failure to its status and detail', async () => {
    const http = stubHttpClient({
      'GET /students': () => {
        throw new HttpError(403, { message: 'Forbidden' });
      },
    });

    const result = await httpBaseQuery({ path: '/students' }, apiWith(http), {});

    expect(result).toEqual({ error: { status: 403, detail: 'Forbidden' } });
  });

  it('reports a transport failure as FETCH_ERROR', async () => {
    const http = stubHttpClient({
      'GET /students': () => {
        throw new NetworkFailureError();
      },
    });

    const result = await httpBaseQuery({ path: '/students' }, apiWith(http), {});

    expect(result).toEqual({ error: { status: 'FETCH_ERROR', detail: 'network' } });
  });
});
