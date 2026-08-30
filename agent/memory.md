# Memory — gotchas that cost real time

Frontend companion to [`agent/memory.md`](https://github.com/Ahmed-ElKashif/el-forkan-institute/blob/main/agent/memory.md) in the backend repo. Each entry is something that
was diagnosed the hard way. Read this before debugging anything that looks
similar. Not product code; reference for humans and future Claude sessions.

Companion docs: [architecture.md](architecture.md), [build-plan.md](build-plan.md),
[progress.md](progress.md).

---

## Refreshing without a cookie answers 403, not 401

Verified against the running API, and it contradicts the obvious assumption.

`POST /auth/refresh` with no valid refresh cookie returns:

```json
{"statusCode":403,"message":"invalid csrf token"}
```

`csrf-csrf` rejects the request **before any auth code runs**, because the CSRF
secret is bound to a hash of that same refresh cookie ([`src/auth/csrf.ts`](https://github.com/Ahmed-ElKashif/el-forkan-institute/blob/main/src/auth/csrf.ts)).
So the session-expired path arrives as a 403 with a CSRF message, not the 401 the
endpoint's own exceptions suggest.

`auth.gateway.ts` maps a CSRF-flavoured 403 in a session context to
`SessionExpiredError`. Without that it surfaced to users as "unexpected error".

## A 401's meaning depends on the caller, not the body

The API returns a bare 401 for a wrong password **and** for four distinct refresh
failures: `Invalid refresh token`, `Refresh token expired`, `Refresh token reuse
detected`, and `Account no longer active`. The last mentions neither "refresh"
nor "token", so any substring match on the message misfiles it.

`toAuthError()` therefore takes a `context` argument (`'credentials' | 'session'`).
The call site always knows which call it made. Do not replace this with message
matching.

## 403 on login means one thing only: a deactivated account

Since the backend's 2026-08-30 security remediation (finding **F9**), a **locked
account no longer returns 403** — it returns the same generic **401 "Invalid
username or password"** as a wrong password, so lockout cannot be used to
enumerate accounts. The lockout *mechanism* still exists (5 failed attempts still
lock the row); the UI simply can no longer tell the user their account is locked,
by design. The old `AccountLockedError` type, its `auth.errors.accountLocked`
message and the `detail.includes('locked')` branch were **removed** — the path was
unreachable. A 403 on login now maps solely to `AccountInactiveError`
(`Account is inactive`, returned only *after* a correct password). Do not
reintroduce a lockout error type without first confirming the API emits a 403 for
it again. On refresh, a 403 is still the csrf-csrf rejection → `SessionExpiredError`.

## The login throttle will lock you out during development

5 attempts per minute, keyed on **IP *and* username**
([`src/auth/guards/login-throttler.guard.ts`](https://github.com/Ahmed-ElKashif/el-forkan-institute/blob/main/src/auth/guards/login-throttler.guard.ts)). You will hit this. It
surfaces as a 429, which the UI reports as a throttle rather than a bad
password — recognise the message before you start debugging credentials.

Seeded head teacher: `headteacher` / `ChangeMe123!`
([`prisma/seed-head-teacher.ts`](https://github.com/Ahmed-ElKashif/el-forkan-institute/blob/main/prisma/seed-head-teacher.ts)).

## The refresh cookie will silently vanish in production

Not yet hit, because nothing is deployed — but it is the reason F0d sits before
F1 in the build plan. `SameSite=Strict` plus two separate Render subdomains means
backend and frontend are cross-site, and the browser drops the refresh cookie
without an error. Login appears to work and every refresh fails. Fix is a custom
domain under one registrable root, or `SameSite=None; Secure` as a stopgap. Full
writeup in [`agent/memory.md`](https://github.com/Ahmed-ElKashif/el-forkan-institute/blob/main/agent/memory.md) in the backend repo.

---

## The Latin font subset carries the digits

`@fontsource/ibm-plex-sans-arabic` splits by script. Importing only the `arabic-*`
subsets renders Arabic correctly and leaves **every numeral** to a fallback font —
and every number in this product is a Latin digit by design. `styles/index.css`
imports both `arabic-*` and `latin-*` for all four weights.

## `erasableSyntaxOnly` bans constructor injection

The Vite React-TS template enables it. It forbids TypeScript parameter properties
(`constructor(private readonly gateway: AuthGateway)`), which is the DI idiom this
codebase and the API both use. Turned **off** in `tsconfig.app.json` with a
comment; its only benefit is running the source under Node's native
type-stripping, which nothing here does.

## `*/` inside a block comment ends the comment

Writing `core/**/*.ports.ts` in a `/* … */` header closed the comment early and
produced eight baffling parse errors in `container.ts`. Same trap for any glob
containing `*/`.

## oxlint exits 0 on warnings

The adherence config shipped by Claude Design set every rule to `warn`, so the
barrel rule was documented as enforced while enforcing nothing — `oxlint` printed
the warning and exited 0. Both rules are now `error`. If you add a rule here,
verify enforcement by writing a deliberate violation and checking the exit code.

## oxlint does not implement `no-restricted-syntax`

Most of the handoff's `.oxlintrc.json` used it, and the config would not even
parse until that block was removed (along with a `x-omelette` key oxlint rejects
as unknown). Most of what it carried — per-component prop and enum validation —
is now TypeScript's job and enforced more strictly. The one part still worth
having, "no raw hex outside `tokens.css`", lives in `scripts/check-tokens.mjs`
and runs as part of `npm run lint`.

## Testing Library needs explicit cleanup here

Vitest runs without globals, so RTL's automatic `afterEach(cleanup)` never
registers itself and renders pile up across tests — the symptom is "Found
multiple elements" on the second test, not the first. `app/src/app/App.test.tsx` calls
`afterEach(cleanup)` itself.

## A controlled input with no `onChange` warns

`Checkbox`, `Switch` and `ScoreInput` always pass `checked`/`value` to the DOM
input, so *any* consumer that omits `onChange` got a React warning. They now mark
themselves `readOnly` in that case. This was a component bug, not a test problem.

---

## Standing conventions

These are enforced by tooling; breaking them fails `npm run lint` or `tsc`.

- **Import a feature through its barrel.** `**/features/*/*` is a lint error.
- **Import design-system components from `../ds`.** Deep imports into
  `ds/core/*` and siblings are a lint error.
- **No raw hex outside `tokens.css`.** `scripts/check-tokens.mjs` fails the build.
- **No Arabic string literals in application components** — everything under
  `features/` and `app/` goes through `shared/i18n/ar.json`. The Arabic inside
  `ds/` is the design system's own fixed labels and stays there.
- **Latin digits everywhere**, via `formatNumber` / `formatScore` from the `ds`
  barrel plus the `.ef-num` class. Those pin `ar-EG-u-nu-latn`, and the `-u-nu-latn`
  is load-bearing: `Intl.NumberFormat('ar-EG')` resolves to the `arab` numbering
  system and prints ١٬٤٤٧. (Bare `ar` happens to resolve to `latn`, so testing
  with it hides the problem.) `ar.json` therefore does no number interpolation.
- **Logical CSS properties only** — `ps-`/`pe-`, `ms-`/`me-`, `start-`/`end-`,
  `text-start`. Nothing uses `left`/`right`.
- **Gold is ceremony only** — certificates, seals, graduation. `Button
  variant="ceremony"` exists so misuse is visible in review.
- **`RoleGate` hides, it does not secure.** Authorisation is the API's job; the
  head-teacher-only routes enforce the rule server-side.

## RTK Query runs through `FetchHttpClient`, not around it (F1)

The data layer is RTK Query, but its `baseQuery` (`shared/api/baseQuery.ts`)
does **not** fetch — it calls `extra.http.request(...)`, i.e. the one
`FetchHttpClient` the container built. That client is handed to every thunk as
its `extra` argument in `makeStore(http)`. Do **not** switch to
`fetchBaseQuery` or a module-singleton client: that would bypass the token
attach, the single-flight refresh and the one-shot 401 replay, and the session
would silently stop recovering. The store is created in `App.tsx` from
`container.http`; a test builds its own store from a `stubHttpClient`.

## A list endpoint's query string lives in `path`, and `toQueryString` sorts it

`HttpClient` has no params channel, so query params go into the endpoint's
`path`. Build them with `toQueryString` (`shared/api/pagination.ts`), which
**sorts keys and drops empties** — so the same query always yields the same URL,
which is both RTK Query's cache key and the test stub's route key. In a test,
build the expected stub key with the *same* helper
(``\`GET /students?${toQueryString({ page, pageSize, search })}\```) rather than
hand-writing it — `URLSearchParams` percent-encodes Arabic search terms, and
transcribing that by hand is how the key silently fails to match.
