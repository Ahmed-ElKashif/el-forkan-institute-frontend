import type { TokenStore } from './auth.ports';

/** The access token lives in a closure variable and nowhere else.
 *
 *  Not `localStorage`, not `sessionStorage`, not a cookie this script can
 *  read: a token in storage outlives the tab and is readable by any injected
 *  script. Persistence across reloads is already provided by the httpOnly
 *  refresh cookie, which JavaScript cannot touch — so storing the access
 *  token would add risk and buy nothing. */
export class MemoryTokenStore implements TokenStore {
  private token: string | null = null;

  get(): string | null {
    return this.token;
  }

  set(token: string): void {
    this.token = token;
  }

  clear(): void {
    this.token = null;
  }
}
