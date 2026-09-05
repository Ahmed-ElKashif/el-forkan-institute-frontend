import { HttpError, NetworkFailureError, type ApiErrorBody } from './http.errors';
import type { AccessTokenProvider, HttpClient, HttpRequest } from './http.port';

export interface FetchHttpClientOptions {
  baseUrl: string;
  /* Resolved lazily because the token provider (AuthService) is built from a
     gateway that is itself built from this client. The container closes that
     cycle by handing over a getter rather than an instance. */
  tokenProvider?: () => AccessTokenProvider | null;
}

/** The one place in the app that calls `fetch`.
 *
 *  It owns two cross-cutting concerns and nothing else: attaching the access
 *  token, and recovering from a 401 by refreshing once and replaying the
 *  request. Business meaning is not its job — it throws HttpError and lets
 *  each gateway decide what a given status means. */
export class FetchHttpClient implements HttpClient {
  constructor(private readonly options: FetchHttpClientOptions) {}

  async request<T>(request: HttpRequest): Promise<T> {
    const response = await this.send(request);

    const final =
      response.status === 401 && !request.noRetry && !request.anonymous
        ? ((await this.refreshAndReplay(request)) ?? response)
        : response;

    return request.responseType === 'blob'
      ? this.parseBlob<T>(final)
      : this.parse<T>(final);
  }

  private async send(request: HttpRequest): Promise<Response> {
    const headers: Record<string, string> = { ...request.headers };
    const isMultipart = request.body instanceof FormData;

    /* JSON for ordinary bodies. For FormData (a file upload) the browser must
       set `Content-Type: multipart/form-data` itself, including the boundary —
       setting it here would send a body the server cannot parse. */
    if (request.body !== undefined && !isMultipart) {
      headers['Content-Type'] = 'application/json';
    }

    if (!request.anonymous) {
      const token = this.options.tokenProvider?.()?.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    try {
      return await fetch(`${this.options.baseUrl}${request.path}`, {
        method: request.method,
        headers,
        body:
          request.body === undefined
            ? undefined
            : isMultipart
              ? (request.body as FormData)
              : JSON.stringify(request.body),
        credentials: request.withCredentials ? 'include' : 'same-origin',
      });
    } catch (cause) {
      throw new NetworkFailureError(cause);
    }
  }

  /** Returns the replayed response, or `null` if the refresh itself failed —
   *  in which case the original 401 stands and the caller sees a real
   *  authentication failure rather than a confusing refresh error. */
  private async refreshAndReplay(request: HttpRequest): Promise<Response | null> {
    const provider = this.options.tokenProvider?.();
    if (!provider) return null;

    try {
      await provider.refreshAccessToken();
    } catch {
      return null;
    }

    return this.send(request);
  }

  private async parse<T>(response: Response): Promise<T> {
    /* Losing the connection mid-body is a transport failure like any other,
       so it is reported as one rather than as a parse problem. */
    let text: string;
    try {
      text = await response.text();
    } catch (cause) {
      throw new NetworkFailureError(cause);
    }

    if (!response.ok) {
      /* An error response whose body is missing or malformed is still an error
         with a status, and the status is what callers translate on. */
      throw new HttpError(response.status, parseJson<ApiErrorBody>(text));
    }

    /* 204 on logout, and any other empty success body. */
    if (!text) return undefined as T;

    /* A success body that will not parse is a real fault. Returning null here
       would hand the caller a silently wrong value instead. */
    return JSON.parse(text) as T;
  }

  /** For a file download: the body is bytes, not JSON. An error still carries a
   *  JSON body, so errors are read as text and translated like any other. */
  private async parseBlob<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let text = '';
      try {
        text = await response.text();
      } catch {
        /* An error with no readable body is still an error with a status. */
      }
      throw new HttpError(response.status, parseJson<ApiErrorBody>(text));
    }
    try {
      return (await response.blob()) as T;
    } catch (cause) {
      throw new NetworkFailureError(cause);
    }
  }
}

function parseJson<T>(text: string): T | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
