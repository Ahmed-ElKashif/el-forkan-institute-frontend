export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface HttpRequest {
  method: HttpMethod;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Send cookies. Required only for `/auth/refresh*`, whose refresh and CSRF
   *  cookies are scoped to that path; every other call is Bearer-only. */
  withCredentials?: boolean;
  /** Do not attach the access token. */
  anonymous?: boolean;
  /** Do not attempt a refresh-and-retry on 401. The auth endpoints set this,
   *  since refreshing in reaction to a failed refresh would loop. */
  noRetry?: boolean;
  /** `'blob'` returns the raw response body (for a file download) instead of
   *  parsing it as JSON. The token-attach and 401 refresh-and-replay still
   *  apply, so an authenticated export goes through the same seam. */
  responseType?: 'json' | 'blob';
}

/** The seam every gateway talks through. Keeping it an interface is what lets
 *  a gateway be unit-tested against a stub with no network and no MSW. */
export interface HttpClient {
  request<T>(request: HttpRequest): Promise<T>;
}

/** What the client needs from the auth layer to attach and renew tokens.
 *
 *  `AuthService` satisfies this structurally, which keeps the dependency
 *  pointing inward: the client depends on this small interface, not on
 *  AuthService, and AuthService knows nothing about the client. */
export interface AccessTokenProvider {
  getAccessToken(): string | null;
  refreshAccessToken(): Promise<string>;
}
