import { AuthGateway, AuthService, MemoryTokenStore } from '../../features/auth';
import { FetchHttpClient } from '../http/fetch-http-client';
import type { HttpClient } from '../http/http.port';

/* ---------------------------------------------------------------------------
   Composition root.

   This is the ONLY module that names concrete implementations. Everything else
   depends on the interfaces declared in the `core` layer's port files, which is
   what makes the use cases testable without a network and swappable without a
   rewrite — the same Dependency Inversion the API expresses with its `useClass`
   bindings in `auth.module.ts`.

   Swapping the transport, or the place the access token lives, is a one-line
   change here and nowhere else.
--------------------------------------------------------------------------- */

/** What the React layer is allowed to consume. Deliberately narrow: adding a
 *  service here is a visible decision, not a side effect of an import. */
export interface AppContainer {
  readonly auth: AuthService;
  /** The one transport, exposed so the RTK Query store's `baseQuery` runs
   *  through the same client — same token attach, same 401 replay. Data
   *  features reach it through RTK Query hooks, never this reference directly. */
  readonly http: HttpClient;
}

export interface ContainerOptions {
  baseUrl: string;
}

export function createContainer({ baseUrl }: ContainerOptions): AppContainer {
  const tokens = new MemoryTokenStore();

  /* The client needs a token provider, the provider is the AuthService, and
     the AuthService is built from a gateway that needs the client. The cycle
     is closed with a getter rather than an instance, so nothing is constructed
     out of order and nothing holds a stale reference. */
  let auth: AuthService | undefined;
  const http = new FetchHttpClient({
    baseUrl,
    tokenProvider: () => auth ?? null,
  });

  auth = new AuthService(new AuthGateway(http), tokens);

  return { auth, http };
}
