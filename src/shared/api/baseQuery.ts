import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { HttpClient, HttpMethod } from '../http/http.port';
import { HttpError, NetworkFailureError } from '../http/http.errors';

/** What an endpoint's `query` returns. Only the three fields a REST call needs;
 *  query parameters are already baked into `path` (see `toQueryString`), because
 *  `HttpClient` carries no separate params channel. */
export interface ApiRequest {
  method?: HttpMethod;
  path: string;
  body?: unknown;
}

/** A transport failure, flattened to what a screen can branch on. `status` is
 *  the HTTP code, or `'FETCH_ERROR'` when the request never reached the API.
 *  `detail` is the API's English message — never shown to a user, but enough to
 *  tell two same-status failures apart. */
export interface ApiError {
  status: number | 'FETCH_ERROR';
  detail: string;
}

/** The bridge from RTK Query to the app's single transport.
 *
 *  Every query and mutation runs through `FetchHttpClient`, so the access-token
 *  attach, the single-flight refresh and the one-shot 401 replay all still
 *  apply — RTK Query adds a cache on top, it does not become a second way to
 *  reach the network. The client is injected as the thunk's `extra` argument
 *  (see `makeStore`), so this stays a pure function with no module singleton and
 *  is trivial to exercise against a stub client. */
export const httpBaseQuery: BaseQueryFn<ApiRequest, unknown, ApiError> = async (
  { method = 'GET', path, body },
  { extra },
) => {
  const { http } = extra as { http: HttpClient };
  try {
    const data = await http.request<unknown>({ method, path, body });
    return { data };
  } catch (error) {
    if (error instanceof HttpError) {
      return { error: { status: error.status, detail: error.detail } };
    }
    if (error instanceof NetworkFailureError) {
      return { error: { status: 'FETCH_ERROR', detail: 'network' } };
    }
    /* `FetchHttpClient` only ever throws the two types above, so this is a guard
       against a future transport, not a live path. RTK Query's contract is to
       return an error, never throw — so classify it as "no HTTP response" and
       keep the specifics in `detail` rather than letting it escape as an
       unhandled rejection. */
    return { error: { status: 'FETCH_ERROR', detail: String(error) } };
  }
};
