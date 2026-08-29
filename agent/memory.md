# Memory — gotchas that cost real time

Frontend companion to `backend/agent/memory.md`. Each entry is something that
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
secret is bound to a hash of that same refresh cookie (`backend/src/auth/csrf.ts`).
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

## 403 on login is genuinely ambiguous

It covers both a lockout (`Account temporarily locked. Try again later.`) and a
deactivated account (`Account is inactive`), separated only by the message. That
match *is* fragile, so an unrecognised 403 falls through to `UnexpectedAuthError`
rather than guessing. Do not add a third guess without checking the API.

## The login throttle will lock you out during development

5 attempts per minute, keyed on **IP *and* username**
(`backend/src/auth/guards/login-throttler.guard.ts`). You will hit this. It
surfaces as a 429, which the UI reports as a throttle rather than a bad
password — recognise the message before you start debugging credentials.

Seeded head teacher: `headteacher` / `ChangeMe123!`
(`backend/prisma/seed-head-teacher.ts`).

## The refresh cookie will silently vanish in production

Not yet hit, because nothing is deployed — but it is the reason F0d sits before
F1 in the build plan. `SameSite=Strict` plus two separate Render subdomains means
backend and frontend are cross-site, and the browser drops the refresh cookie
without an error. Login appears to work and every refresh fails. Fix is a custom
domain under one registrable root, or `SameSite=None; Secure` as a stopgap. Full
writeup in `backend/agent/memory.md`.

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
- **`RoleGate` hides, it does not secure.** Authorisation is the API's job; 54 of
  its 115 routes enforce the head-teacher rule server-side.
