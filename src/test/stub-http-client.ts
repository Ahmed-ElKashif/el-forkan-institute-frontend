import type { HttpClient, HttpRequest } from '../shared/http/http.port';

/* ---------------------------------------------------------------------------
   The one test double this codebase needs.

   `HttpClient` is the network boundary, and with `AuthGateway` concrete it is
   also the only seam tests substitute at. Stubbing here rather than faking a
   gateway means every test runs the real request construction and the real
   translation from HTTP failure to domain error — the parts most likely to
   drift from the API.
--------------------------------------------------------------------------- */

/** Keyed by `"<METHOD> <path>"`. A function is invoked (and may throw to
 *  simulate a failure); anything else is returned as the response body. */
export type StubRoutes = Record<string, unknown>;

export interface StubHttpClient extends HttpClient {
  readonly calls: HttpRequest[];
  /** How many times a route was requested. */
  countOf(key: string): number;
}

export function stubHttpClient(routes: StubRoutes): StubHttpClient {
  const calls: HttpRequest[] = [];

  return {
    calls,
    countOf: (key) => calls.filter((c) => `${c.method} ${c.path}` === key).length,
    request<T>(request: HttpRequest): Promise<T> {
      calls.push(request);
      const key = `${request.method} ${request.path}`;

      if (!(key in routes)) {
        /* Loud rather than undefined: an unrouted call means the code under
           test called something the test did not expect, which is a finding. */
        return Promise.reject(new Error(`stubHttpClient: no route for "${key}"`));
      }

      const handler = routes[key];
      try {
        return Promise.resolve((typeof handler === 'function' ? handler() : handler) as T);
      } catch (error) {
        return Promise.reject(error);
      }
    },
  };
}
