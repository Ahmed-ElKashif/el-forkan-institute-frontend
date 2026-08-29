/* ---------------------------------------------------------------------------
   The auth feature's one port.

   This codebase keeps DI seams deliberately scarce — an interface exists only
   where something genuinely varies or where a test cannot proceed without a
   substitute. There are exactly two in the whole app:

     · `HttpClient` (shared/http)  — the network boundary, stubbed by every test
     · `TokenStore` (here)         — where the access token lives

   `AuthGateway` is NOT a port. It is a concrete class over `HttpClient`, and
   tests stub the client underneath it rather than faking the gateway, so the
   real error translation is exercised instead of bypassed. Feature gateways
   added later follow the same rule.
--------------------------------------------------------------------------- */

/** Where the access token lives while the tab is open.
 *
 *  A port because it is a security decision, not an implementation detail: the
 *  current answer is "in a closure, nowhere else", and swapping it is the kind
 *  of change that should be one line in the composition root and visible in
 *  review. A token in `localStorage` outlives the tab and is readable by any
 *  injected script; the httpOnly refresh cookie already covers persistence. */
export interface TokenStore {
  get(): string | null;
  set(token: string): void;
  clear(): void;
}
