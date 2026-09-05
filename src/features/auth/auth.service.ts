import { SessionExpiredError } from './auth.errors';
import type {
  AuthUser,
  Credentials,
  OtpVerification,
  PasswordResetConfirm,
  PasswordResetRequest,
} from './auth.model';
import type { AuthGateway } from './auth.gateway';
import type { TokenStore } from './auth.ports';

/* ---------------------------------------------------------------------------
   Auth use cases.

   Depends on ports only — no fetch, no React, no router. Everything here is
   exercised in auth.service.test.ts with plain fakes.
--------------------------------------------------------------------------- */

export class AuthService {
  /** Guards the refresh endpoint against a stampede: when several requests
   *  401 at once, they must share one refresh, not fire one each. The API
   *  rotates the refresh token on every call, so concurrent refreshes would
   *  invalidate each other and log the user out mid-session. */
  private inFlightRefresh: Promise<string> | null = null;

  constructor(
    private readonly gateway: AuthGateway,
    private readonly tokens: TokenStore,
  ) {}

  /** First factor: verify the password and get an OTP challenge id. No token is
   *  stored yet — there is no session until the code is verified. */
  async beginSignIn(credentials: Credentials): Promise<string> {
    const { challengeId } = await this.gateway.login(credentials);
    return challengeId;
  }

  /** Second factor: exchange the emailed code for a session. */
  async completeSignIn(verification: OtpVerification): Promise<AuthUser> {
    const { accessToken, user } = await this.gateway.verifyOtp(verification);
    this.tokens.set(accessToken);
    return user;
  }

  /** Forgot-password, step one: request a reset code, get back a challenge id.
   *  Stores no token — there is no session until the user signs in afresh. */
  async requestPasswordReset(request: PasswordResetRequest): Promise<string> {
    const { challengeId } = await this.gateway.requestPasswordReset(request);
    return challengeId;
  }

  /** Forgot-password, step two: set the new password. Deliberately does not sign
   *  the user in — they return to the login screen and authenticate normally. */
  async confirmPasswordReset(confirm: PasswordResetConfirm): Promise<void> {
    await this.gateway.confirmPasswordReset(confirm);
  }

  /** Rehydrate on page load. The access token is gone (it only ever lived in
   *  memory) but the refresh cookie may still be valid.
   *
   *  `null` means "no session", which is an ordinary outcome for a first visit
   *  or an expired cookie. Anything else — the server unreachable, a 500 —
   *  propagates: a network outage is not the same fact as "not signed in", and
   *  collapsing the two would hide a real fault behind a login screen. */
  async restore(): Promise<AuthUser | null> {
    try {
      await this.refreshAccessToken();
    } catch (error) {
      this.tokens.clear();
      if (error instanceof SessionExpiredError) return null;
      throw error;
    }
    return this.gateway.fetchCurrentUser();
  }

  /** Single-flight. Concurrent callers await the same promise and receive the
   *  same token. */
  refreshAccessToken(): Promise<string> {
    this.inFlightRefresh ??= this.gateway
      .refresh()
      .then((token) => {
        this.tokens.set(token);
        return token;
      })
      .finally(() => {
        this.inFlightRefresh = null;
      });

    return this.inFlightRefresh;
  }

  /** Local state is cleared even if the network call fails — a user who
   *  presses "sign out" must end up signed out of this tab regardless. */
  async signOut(): Promise<void> {
    try {
      await this.gateway.logout();
    } finally {
      this.tokens.clear();
    }
  }

  getAccessToken(): string | null {
    return this.tokens.get();
  }
}
