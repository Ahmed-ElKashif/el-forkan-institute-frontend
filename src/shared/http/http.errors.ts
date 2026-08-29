/* ---------------------------------------------------------------------------
   Transport-level failures.

   These stay generic — status codes and payloads, no domain meaning. Each
   gateway translates them into its own domain errors at its own boundary, so
   HTTP vocabulary never leaks past `src/infra/`.
--------------------------------------------------------------------------- */

/** The API's error envelope: `{ statusCode, error, message }`, where `message`
 *  is a string from Nest's exceptions or an array from the Zod pipe. */
export interface ApiErrorBody {
  statusCode?: number;
  error?: string;
  message?: string | string[];
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody | null,
  ) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
  }

  /** The API's message, flattened. Never shown to a user directly — it is
   *  English, and the UI renders a translated key instead — but it is what
   *  distinguishes two failures that share a status code. */
  get detail(): string {
    const message = this.body?.message;
    if (Array.isArray(message)) return message.join(' · ');
    return message ?? this.body?.error ?? '';
  }
}

/** The request never got a response: offline, DNS, CORS, server down. */
export class NetworkFailureError extends Error {
  constructor(cause?: unknown) {
    super('Network request failed');
    this.name = 'NetworkFailureError';
    this.cause = cause;
  }
}
