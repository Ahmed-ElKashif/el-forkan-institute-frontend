# Progress — frontend milestone log

Mirrors the phase list in [build-plan.md](build-plan.md). One entry per phase,
updated as we go. Companion docs: [architecture.md](architecture.md) (the module
map and why), [memory.md](memory.md) (gotchas that cost real time).

**Where we are: F0a, F0b and F0c are done; F0d is prepared in code and waiting
on the deploy.** The app signs in against the live API, survives a reload, signs
out, and wraps every signed-in route in the role-scoped frame with route-level
403 gating. The F0d cookie trap is fixed at the source and the Render blueprints
exist; provisioning and the exit test are the remaining (account-bound) steps.
The frontend was reconciled against the backend's 2026-08-30 security
remediation (see the reconciliation entry below), and **F1 (dashboard +
students) is built** — RTK Query is now the data layer. **F2 (attendance grid)
is next.**

---

## Design system handoff (2026-08-29) ✅ done

Claude Design produced the handoff bundle `el-forkan-design-system/` from the backend repo
plus a `design-context/` brief written from the logo. It contains 40 components,
6 token files, 17 guideline cards, 8 prototype screens, a `.d.ts` per component,
an adherence lint config and a `SKILL.md`.

Reviewed in full before any code was written. Findings and their disposition are
in build-plan Part 1. The bundle is **read-only reference** — do not edit it and
do not import from it; `src/ds/` is the implementation. Note it sits **outside
this repository**, one level up in the working tree, so a fresh clone will not
have it.

---

## F0a — Vendor the design system ✅ done

Scaffolded this repo (Vite + React 19 + TypeScript + Tailwind v4), its own
git repo, nothing committed yet.

- Copied the token CSS in unchanged; mapped it into Tailwind with `@theme inline`
  so `tokens.css` stays the single source of truth (see architecture.md).
- Converted all 40 components `.jsx` → `.tsx`, folding each sibling `.d.ts` into
  its component. Props are now compile-checked, which supersedes most of the
  adherence lint's per-component rules.
- **Fixed the four blocking findings:** icons off `unpkg.com` → `lucide-react`;
  Google Fonts `@import` → self-hosted `@fontsource`; created the missing
  `src/ds/index.ts` barrel the lint config already assumed; noted that the
  bundle's login mock collected an email where the API takes `username`.
- Converted hover/press from React state to CSS variants. The bundle drove them
  from `onMouseEnter`/`onMouseLeave`, which re-renders on every hover and never
  fires for keyboard focus or touch — untenable in a grid of hundreds of cells.
  `Dialog` also gained Escape and scrim-click close, which the prototype lacked.
- Built the `/ds` gallery rendering all 40 components, in RTL.

**Verified:** lint, strict typecheck and build clean; a server-render of the
gallery contained every expected Arabic string and an icon for each component;
**zero third-party hosts** in `dist/` (the only external URLs are React and
React Router error-message strings, not fetches); the ported set diffed against
`_ds_manifest.json` — none missing, none extra. The last two are re-runnable:
grep `dist/` for `http`, and diff the barrel's exports against the manifest.

**Correction worth remembering:** the bundle has **40** components, not 41. An
earlier count was wrong and is fixed everywhere it appeared.

---

## F0b — Auth ✅ done

Sign-in, session refresh and sign-out, against the live API.

- `features/auth/` — domain model, seven domain error types each carrying an
  i18n `messageKey`, `AuthService` (sign in, restore, single-flight refresh,
  sign out), `AuthGateway` over HTTP, `MemoryTokenStore`.
- `shared/http/` — `FetchHttpClient`, the only `fetch` call in the app. Attaches
  the bearer token and recovers from a 401 by refreshing once and replaying.
- `shared/di/container.ts` — composition root; `main.tsx` builds the graph.
- `shared/i18n/` — i18next + `ar.json`. No Arabic string literals in
  application components.
- `LoginPage` (against **`username`**, not email), `ProtectedRoute`, and a
  placeholder `HomePage` that proves the session end to end.

**Verified against the running API, not assumed.** Installed the backend deps,
booted it, and ran the full flow with a cookie jar: login set `refresh_token`;
the CSRF endpoint issued a token; `POST /auth/refresh` with `x-csrf-token`
returned a fresh access token; `GET /users/me` accepted it. `PublicUser` matches
the frontend's `AuthUser` field for field. The real adapter stack was then run
in Node against the same API and returned `headteacher / head_teacher`.

**One API contract correction found by doing this**, not by reading: refreshing
without a valid cookie answers **403 `invalid csrf token`**, not 401 — see
[memory.md](memory.md).

### Deviation from the plan, taken deliberately

**RTK Query deferred to F1.** Reasoning in architecture.md. Recorded here so a
future session does not treat its absence as an oversight.

### Testing decision

28 tests, all passing, covering `features/auth/`, `shared/http/` and one
end-to-end wiring test.

Component unit tests were deliberately not written. `AuthProvider` turns service
results into state and `LoginPage` renders whichever key the error carries —
asserting on those would assert that React works. The single integration test in
`app/src/app/App.test.tsx` covers the path that spans every layer (container → providers
→ router → guarded route → real sign-in), which is where a component-level test
earns its cost.

---

## F0d — Deploy prep (cookie trap + blueprints) ⏳ prepared

Everything F0d needs that does not require a Render account. The deploy itself
and the exit test are the head teacher's / operator's to run.

- **The cookie trap is fixed at the source.** The refresh and CSRF cookies both
  hardcoded `SameSite=Strict`, which the browser silently drops between two
  cross-site `*.onrender.com` subdomains — login works, every refresh fails.
  Both now read `COOKIE_SAMESITE` through one shared helper
  (`backend/src/auth/cookie-security.ts`): default `strict` (local dev and a
  single-registrable-domain deploy), `none` for a cross-site deploy, and `none`
  forces `Secure`. Both cookies read the *same* helper, so they cannot disagree.
- **Blueprints.** The backend repo's `render.yaml` (Node web service, `/health`,
  `COOKIE_SAMESITE=none`, secrets as `sync:false`) and this repo's
  [`render.yaml`](../render.yaml) (static site, `dist`, `/* → /index.html`
  rewrite so deep links survive a hard refresh). Env docs updated in both
  `.env.example` files.
- **Runbook.** [`DEPLOY.md`](../DEPLOY.md) — the SameSite decision table, the two
  services, the URL cross-reference (`CORS_ORIGIN` ↔ `VITE_API_BASE_URL`), and
  the deployed-URL exit test.

The frontend needs no code change for cross-site: `FetchHttpClient` already
sends `credentials: 'include'` on the refresh calls, and the API's CORS already
sets `credentials: true` with a single explicit origin.

**Verified:** backend builds clean; 389 tests / 30 suites pass (+6 for the
cookie helper). The deploy and its exit test remain, by nature, manual.

---

## F0c — App frame and role gating ✅ done

The signed-in shell and route-level authorisation, over the design system's
`SideNav` / `TopBar` / `EmptyState`.

- `app/shell/navigation.ts` — one navigation registry driving the sidebar, the
  page titles and the route table. Each destination carries its path, i18n
  keys, icon, `headTeacherOnly` flag and the phase that replaces its
  placeholder. Single source, so paths and role gating cannot drift apart.
- `app/shell/AppShell.tsx` — role-scoped sidebar, header with sign-out, routed
  `<Outlet>`. Rendered inside `ProtectedRoute`. Replaced the F0b placeholder
  `home` feature, which was deleted.
- `app/shell/SectionPlaceholder.tsx` — one honest stand-in for the F1–F6
  screens: names the section and its phase, no fake data.
- `features/auth/RequireRole.tsx` + `ForbiddenPage.tsx` — a gated route wraps
  its children in `RequireRole`; a teacher gets the `denied` `EmptyState` in
  Arabic, fail-closed. Authorisation stays inside the auth feature; the route
  table only decides where to apply it.
- Routes are generated from the registry, so a new head-teacher-only screen is
  gated the moment it is added to the list.
- `/ds` is now dev-only and verified absent from the production bundle.

**Verified:** lint, strict typecheck and production build clean; 30 tests passed
at the time of F0c (+2 over F0b, both for role gating — a teacher's sidebar omits
the three head-teacher-only sections, and a teacher opening `/imports` directly
gets the 403). Both new tests drive a real sign-in through the DI seam with no
fetch mocking, matching the existing integration-test approach. (The count is now
**29** after the 2026-08-30 backend-sync reconciliation below removed one
now-impossible auth-error case; the two role-gating tests are unaffected.)

### Testing note

The +2 tests are role-gating outcomes, not "React renders" assertions — a
regression there would silently expose head-teacher routes to teachers, which
is the "silent and expensive" class the F0b testing decision reserved automated
coverage for. Consistent with that decision, not a departure from it.

---

## Restructure — feature modules + scarce DI (same session, after F0b) ✅ done

At the user's direction, replaced the `core/ infra/ app/` layering with feature
modules, and reduced DI to the two seams that earn it. Full reasoning in
[architecture.md](architecture.md).

Behaviour-preserving: a move-and-rename refactor plus the removal of the
`AuthGateway` interface. All 28 tests stayed green.

Two things improved as a side effect:

- **The tests got more realistic.** Removing the gateway fake forced the service
  tests onto a stubbed `HttpClient`, so they now exercise the real request
  construction and the real error translation rather than faking past them.
- **The module boundary became enforceable.** The new lint pattern caught four
  real deep-imports in `App.test.tsx` the moment it was switched on.

---

## Review gates run this session

`clean-code-guard`, `test-guard` and `docs-guard` were run over the F0b work.
What they changed, in case a future session wonders why the code looks like it
does:

- **clean-code-guard (9 fixes).** `restore()` swallowed every error, making a
  network outage indistinguishable from "not signed in" — now only
  `SessionExpiredError` yields `null`. `readBody` returned `null` for malformed
  *success* bodies, handing callers a silently wrong value. Deleted an unused
  export, a speculative container field, and an optional prop justified by a
  test that did not exist. Uninstalled `@testing-library/jest-dom`, installed and
  never used.
- **test-guard (2 removed).** One test could only ever prove "null stays null";
  one was fully subsumed by another.
- **docs-guard (4 fixes).** The README claimed `npm run lint` enforced the
  barrel rule — it did not; both oxlint rules were `warn`, and oxlint exits 0 on
  warnings. Promoted to `error` and re-verified in both directions. Also fixed a
  `@/ds` import example that could not resolve (no path alias exists) and a
  stale test count.

---

## Backend-sync reconciliation before F1 (2026-08-30) ✅ done

The backend landed a white-box security remediation (383 → 396 tests; new
`src/config/` boot-time env validation, branch-scoped authz across
assessment/import/students, F9 login hardening). Checked it against the
frontend before starting F1. Almost all of it is transport- or
deploy-internal and needs no frontend change; two things touched contracts the
frontend reads:

- **Login error contract changed (F9).** A locked account no longer answers
  **403 "locked"** — it now returns the same generic **401 "Invalid username or
  password"** as a wrong password, so lockout can't be used to enumerate
  accounts. That made the frontend's `AccountLockedError` path **unreachable**.
  Removed the error type, its `auth.errors.accountLocked` message, the
  `detail.includes('locked')` branch in `auth.gateway.ts`, the barrel export and
  the gateway test row. A 403 on login now maps solely to `AccountInactiveError`;
  a 403 on refresh is still the csrf rejection. See [memory.md](memory.md).
- **Our F0d cookie helper survived and was extended.** The backend folded
  `cookie-security.ts` into its F7 hardening: `secure` now defaults ON (was
  `NODE_ENV === 'production'`), opt out for local HTTP with `COOKIE_SECURE=false`.
  `COOKIE_SAMESITE` is unchanged. No frontend change; DEPLOY.md's decision table
  still holds, and CORS is now a fail-closed comma-separated allowlist (required
  in production) — our `render.yaml` already passes `CORS_ORIGIN` as a secret.

`/users/me`'s `PublicUser` shape is unchanged, so `AuthUser` still maps field for
field. Route count 115 → 117 (F10 password self-service — not an F1 surface).

**Verified:** lint, strict typecheck, tests all clean; **29 tests pass** (30 − 1,
the collapsed 403 case). F1 (dashboard + students) is unblocked: the students
routes and a `/reports` controller both exist on the API.

## F1 — Read-only breadth (dashboard + students) ✅ done

The first data screens, and the point where **RTK Query enters** as the data
layer — the deferral recorded in F0b and architecture.md is now settled.

- **RTK Query, bridged through the existing transport, not around it.**
  `shared/api/baseQuery.ts` is a custom `baseQuery` that calls the container's
  one `FetchHttpClient`, injected as the thunk's `extra` argument
  (`shared/api/store.ts`) — so the token attach, the single-flight refresh and
  the one-shot 401 replay all still apply, and RTK Query only adds a cache. One
  `createApi` (`shared/api/api.ts`); each feature adds endpoints with
  `injectEndpoints` in its own folder. `tagTypes` are declared now for the
  mutations that arrive with F2/F3 (F1 invalidates nothing — it is read-only).
  The store is built in `App.tsx` from `container.http` (newly exposed on
  `AppContainer`) and provided above the router.
- **Dashboard** (`features/dashboard/`) — two chained reads: the current
  academic year, then `GET /reports/summary` for it, rendered as `StatCard`s.
  Every figure comes straight from the API's scoped summary; no year yet →
  honest `EmptyState`, not a grid of zeros.
- **Students** (`features/students/`) — `DataTable` over `GET /students`,
  paginated, with a **debounced** search (`shared/react/useDebouncedValue`, one
  request per pause). Status is a `Badge`; phone is wrapped in `<bdi>` so a
  leading `+` does not jump to the wrong end of an RTL row; the code, phone and
  total are Latin tabular via `formatNumber`/`.ef-num`. Routes are still
  generated from the navigation registry; a `BUILT_SCREENS` map swaps the real
  screen in for a destination, everything else keeps the placeholder.

**Deliberately deferred: the sections list.** The build plan grouped it with
F1, but it has no home in the navigation registry, and its natural place is
beside attendance (the teaching group, F2) since sections are what attendance
is taken against. Building it now would orphan a route reachable only by typing
a URL. It moves to F2 with a nav entry. The F1 exit test (students + dashboard)
does not depend on it.

**Verified:** lint, strict typecheck and production build clean; **35 tests
pass** (+6 over the reconciliation baseline — 4 for the `baseQuery` translation
seam, 2 for the students screen: real Arabic rows render, and a settled search
term issues exactly one filtered request). The students test runs the real
store, the real RTK Query cache and the real `DataTable` against a stubbed
transport — no fetch, no MSW — matching the existing integration-test approach.
Bundle stays CSP-clean (no third-party fetch hosts) and `/ds` stays out of the
production build.

### Testing note

The two component-spanning tests are the exit-criteria proof (search fires the
right request; rows render with real Arabic), not "React renders" assertions —
consistent with the F0b testing decision. The `baseQuery` tests cover the one
seam every future query and mutation crosses, so they earn their place.

## Still open

Both are inherited from [`agent/progress.md`](https://github.com/Ahmed-ElKashif/el-forkan-institute/blob/main/agent/progress.md) in the backend repo and block design, not code:

1. **Certificate printed wording and layout** — blocks F5. `CertificateSheet`
   carries a placeholder body, flagged in its own source comment.
2. **Curriculum `max_score` / `pass_score` / `weight` defaults and the mandatory
   flags** — F6 can be built on the 100/50/1.0 defaults but not demoed truthfully.

Plus one frontend decision worth making before F1: whether to keep hand-copying
Zod schemas (spec §7.9) or generate a client from an OpenAPI spec. At 115 routes
and 38 models, hand-copied schemas drift silently. See build-plan.
