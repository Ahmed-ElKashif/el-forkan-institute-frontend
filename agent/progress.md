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
remediation (see the reconciliation entry below). **F1–F5 are built** — dashboard
+ students, the attendance grid, the score grid (lock + correction), the import
preview → commit, and certificates (issue / print / revoke). RTK Query is the
data layer. **F5's printed certificate uses the design system's placeholder
wording**, to be swapped in one place when the head teacher provides it (see
"Still open"). **F6 is in progress:** the audit viewer and promotion
preview→confirm are built; **the WhatsApp console, curriculum builder, timetable
editor and foundation CRUD remain.**

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

## F2 — Sections picker + attendance grid ✅ done

The F1-deferred sections list, and the hardest screen.

- **Fresh-clone baseline fix.** A clean `npm install` broke typecheck and two
  test files: `@testing-library/react` v16 makes `@testing-library/dom` a *peer*
  and re-exports `screen`/`waitFor` from it, so it was silently absent. Declared
  it explicitly; see [memory.md](memory.md). Baseline 35 → **40** tests over F2+F3.
- **`features/sections/` — a reusable picker.** `SectionsPage` takes a `basePath`
  and a `captionKey`, so the one list serves both flows: `/attendance` links its
  rows to `/attendance/:id`, `/scores` to `/scores/:id`. Scoped to the current
  academic year (the API has no text search on sections — its list schema is
  `.strict()`), paginated, RTL-safe. The barrel also exposes `useGetSectionQuery`
  / `SectionDetail`, which the grids read for their heading and scoping.
- **`features/attendance/` — the grid** at `/attendance/:sectionId`. One read
  (`GET /sections/:id/attendance?termId=`) renders the student × session sheet
  over `DataTable` (sticky student column + sticky header). Tapping a
  `AttendanceCell` cycles present → absent → late → excused; **save is per session
  column** (`POST /sessions/:id/attendance`). Server data is the base and local
  `edits` overlay it, so the save's invalidation refetch never discards work in
  other columns. Absence-threshold warnings from the save response drive a
  `Badge` (the threshold is not on the grid read, so it appears after the
  crossing column is saved — noted in-source).
- **Shared calendar.** The current-year read moved to `shared/api/calendar.ts`
  (dashboard + picker + grids), joined by an academic-year-by-id read (terms for
  the grids) and `defaultTerm`. A shared `shared/react/TermPicker` is used by both
  grids.

**Verified:** lint, typecheck, build, tests all clean. The attendance test taps a
cell and asserts the column save posts exactly the marked student — real store,
RTK cache and `DataTable` against a stub.

## F3 — Exam picker + score grid (lock, correction) ✅ done

- **`features/scores/`.** `/scores/:sectionId` picks a term then lists the
  section's exams (`GET /exams?termId=&levelId=`, filtered to the section's gender
  or gender-neutral ones); each links to `/scores/exams/:examId`.
- **The score grid.** `GET /exams/:id/scores` → `ScoreInput` per row + an absent
  `Checkbox`; the whole exam saves in one `POST`. An over-max mark shows the
  danger skin, states the rule (`الدرجة تتجاوز الحد الأقصى`), and disables the save —
  refused with the rule, never a bare "invalid".
- **Lock and correction.** `LockBanner` with a head-teacher-only lock/unlock
  action (`RoleGate`). Locked → every `ScoreInput` takes the read-only skin, the
  bulk save disappears, and the head teacher gets a per-row correction
  (`CorrectionDialog` → `PATCH /exam-results/:id`) whose reason is mandatory (R8).
  A teacher sees no unlock and no correction.

**Verified:** lint, typecheck, build, tests all clean. This phase added 3 tests
(1 attendance, 2 scores); with F2's 2 for the sections list that is 35 → **40**.
The score tests drive the real auth seam: a teacher hits the over-max refusal, a
head teacher sees the locked read-only grid with the correction affordance.

## F4 — Import preview → commit ✅ done

Head-teacher only (gated in the registry). The preview-then-commit flow of §6.3,
built on the DS `CommitBar`.

- **Multipart at the transport (root-cause fix).** `FetchHttpClient` forced
  `Content-Type: application/json` and JSON-stringified every body, so it could
  not upload a file. It now passes a `FormData` body through untouched and lets
  the browser set the multipart boundary; the JSON path is unchanged. Covered by
  two new transport tests (FormData passthrough; JSON still serialised).
- **`features/import/`.** `ImportPage` is one screen driven by one piece of
  state — the job id: none → `UploadForm`, else → `ImportPreview`.
  - `UploadForm` — targeting (import type, branch, male/female section mapping,
    historical flag) + the file. The upload is the one multipart `POST /imports`,
    sent straight through the container's transport (no cache to seed), returning
    a preview job. Branch defaults to the head teacher's own; an institute-wide
    head (no branch) picks one from `shared/api/reference` (`GET /branches`).
  - `ImportPreview` — `GET /imports/:id` + paginated `GET /imports/:id/rows`
    (server-paged, filterable by action), each row an action `Badge`
    (create/update/skip/error). `FixRowDialog` corrects a row inline
    (`PATCH /imports/rows/:id`); the API re-validates so the status changes. The
    `CommitBar` shows the counts and **stays disabled while any error remains**;
    commit is `POST /imports/:id/commit` (no body — targeting comes from the
    persisted job). On success the job reads back `committed` and the screen shows
    what was written.
- **Reuse/perf.** The sections list query gained optional `branchId`/`pageSize`
  so the upload form loads a branch's sections for its dropdowns without a new
  endpoint. Rows are server-paginated, and the action filter lets a reviewer jump
  straight to error rows rather than scrolling a long roster.

**Verified:** lint, typecheck, build, tests all clean; **40 → 45 tests** (+3
`ImportPreview` — action-per-row with commit disabled on error, commit posts when
clean, inline fix posts a patch; +2 transport — multipart passthrough, JSON
unchanged). Nothing is written before commit — the preview reads only, and the
commit is a separate, explicit request.

## F5 — Certificates + print ✅ done (placeholder wording)

Head-teacher only. Issue → print → revoke over the assessment API's certificate
routes, on the DS `Tabs` / `ConfirmDialog` / `CommitBar`-family primitives.

- **`features/certificates/`.** `CertificatesPage` is two `Tabs`: **جاهزون
  للتخريج** (`GET /certificates/certifiable`) → issue via `ConfirmDialog`
  (`POST /certificates`; the API generates the serial `L4-1447-0001`), and
  **الشهادات الصادرة** (`GET /certificates`) → print or revoke. Revoke uses a
  reason-required `ConfirmDialog` (`POST /certificates/:id/revoke`, R19); a
  revoked row shows a Badge and offers neither print nor revoke.
- **Printing is a recorded reprint.** The print button calls
  `POST /certificates/:id/reprint` (which records the copy, R19/§4.5) and hands
  the returned payload to a **shell-less print route** (`/certificates/:id/print`,
  protected + head-teacher-gated) through navigation state — so the print page
  writes nothing. It renders the DS `CertificateSheet` (A4 portrait RTL, ivory,
  gold rules) with a `window.print()` toolbar marked `ef-no-print`, so the
  browser prints the sheet alone.
- **Placeholder wording, by design.** `CertificateSheet` keeps its built-in
  placeholder body — the institute's real wording is still undecided (its own
  source note, and "Still open" #1). Everything around it (serial, level, name,
  date, issuer, seal, print CSS) is real; only the body sentence is swapped when
  the wording lands, in that one component.
- **Reuse:** a generic `ListBody` renders the loading/error/empty/table shell for
  both tabs instead of duplicating it.

**Verified:** lint, typecheck, build, tests all clean; **45 → 50 tests** (+3
`CertificatesPage` — issue posts the student/level/enrolment, revoke stays
disabled until a reason is typed then posts it, print goes through a reprint; +2
`CertificatePrintPage` — the sheet renders the serial from navigation state, and
falls back cleanly when opened without one).

## F6 — the rest ✅ complete (every destination built)

F6 was several distinct screens; built in cohesive increments rather than six
rushed ones. **All done:**

- **`features/audit/`** — the audit log (`GET /audit-logs`, head-teacher only,
  gated). Server-paginated (the log grows without bound), filtered by entity type
  (debounced), and each row opens a `Dialog` showing its before/after JSON
  snapshot (forced LTR so JSON reads correctly on an RTL page). Read-only.
- **`features/promotion/`** — promotion preview → confirm (`/promotion`,
  head-teacher only), the §4.3 capstone. Preview (`POST /promotion/preview`,
  writes nothing) lists each enrolment's decision as a `Badge`; the `CommitBar`
  shows the decision counts and confirms (`POST /promotion/confirm`) **exactly the
  non-blocked rows** — a blocked row is never written. An optional target-year
  `Select` (from a new `useAcademicYearsQuery`) moves students forward, or the
  decisions are recorded in place. The confirm invalidates `Student`/`Section`.
- Both got a nav entry under Administration; a new `useAcademicYearsQuery` (list)
  joined `shared/api/calendar`.
- **`features/users/`** — staff CRUD (`/users`, head-teacher only), the first of
  the foundation screens. Search + role filter + include-inactive, server-paged.
  `UserFormDialog` creates (fullName, username, gender, phone, email, password,
  role, branch) and edits (identity fields — username/gender — and the password
  are create-/reset-only, mirroring the API). Soft-delete goes through a
  reason-required `ConfirmDialog` (R9); a separate dialog resets a password
  (`POST /users/:id/password`). Reuses `useBranchesQuery`.

- **`features/catalogue/`** — the catalogue (`/catalogue`, head-teacher only), a
  `Tabs` screen over three entities: **levels** (fixed rows; a `Switch` dialog
  edits the R1/R15/R20 progression flags, `PATCH /levels/:id`), **subjects**
  (`PagedList` + search + create/edit; `code` is create-only), and **books**
  (`PagedList` + create/edit). Subject aliases are shown as a read-only count —
  the add/remove endpoints exist and can be wired later.
- **`features/years/`** — academic years & terms (`/years`, head-teacher only),
  the last foundation screen. Years list (not paginated — years are few); create
  takes only the Hijri year (`POST /academic-years`; the API generates the term
  and exam calendar), and a `YearDialog` edits a year's dates/status. Selecting a
  year shows its terms, each edited via `TermEditDialog` (dates, exam window,
  status; `PATCH /terms/:id`). The shared `calendar` types were enriched with the
  full year/term fields (the API already returned them) and given a `Calendar`
  cache tag, so this feature reuses the shared reads and adds only the mutations —
  a year/term edit refreshes every calendar reader (pickers, dashboard).
- **`features/curriculum/`** — the curriculum builder (`/curriculum`, head-teacher
  only, gated), F6's hardest screen: the nested syllabus tree. Pick a year, level
  and term, then build مواد, their فروع one level deep (§4.1 caps nesting at two,
  so the reader never recurses), and the units (book + scope) under each row. One
  read (`GET /academic-years/:yearId/curriculum` → the tree, which the API nests)
  and six writes: create (`POST /academic-years/:yearId/levels/:levelId/curriculum`),
  edit (`PATCH /curriculum/:id`), delete (`DELETE /curriculum/:id`), and the unit
  trio (`POST /curriculum/:id/units`, `PATCH /curriculum-units/:id`,
  `DELETE /curriculum-units/:id`). A new `Curriculum` tag makes every write
  re-read the tree, so there is no local overlay to reconcile. The exam fields
  (grading, marks, weight) appear only while a row is examinable — a container's
  marks live on its children, mirroring the service's rules. It **reuses reads**:
  `useAcademicYearsQuery` from shared, and `useLevelsQuery` +
  `useSubjectOptionsQuery`/`useBookOptionsQuery` (two whole-active-set picker
  queries added to catalogue and exposed through its barrel, the same cross-feature
  seam the sections picker uses).
- **`features/timetable/`** — the timetable editor (`/timetable`, head-teacher
  only): a section picker → a per-section weekly grid at `/timetable/:sectionId`.
  Reads a section's slots (`GET /sections/:id/timetable`) and writes four ways —
  create (`POST /sections/:id/timetable`), edit (`PATCH /timetable-slots/:id`),
  delete (`DELETE /timetable-slots/:id`), all under a new `Timetable` tag — plus
  "generate sessions" (`POST /sections/:id/sessions/generate`), a separate concern
  in its own dialog that turns the timetable into the term's dated sessions.
  **Teacher clash detection is server-side** (create/edit answer 409 when a
  teacher is double-booked); the slot dialog detects the 409 **by status** and
  shows a translated clash message — it never re-implements the rule or shows the
  API's English detail. Separation of concerns is explicit: the page orchestrates,
  `WeekGrid` renders, the two dialogs own their forms, and `groupByWeekday` (a pure
  model function) does the day-grouping. Reuses reads via barrels —
  `useGetSectionQuery` (sections), `useSubjectOptionsQuery` (catalogue), and a new
  `useTeacherOptionsQuery` added to users; native `<input type="time">`/`date`.
- **`features/whatsapp/`** — the WhatsApp console (`/whatsapp`, head-teacher only),
  the last F6 screen. A `Tabs` screen: **templates** (`GET /message-templates`,
  edit body/Meta-name/language/active via `PATCH /message-templates/:id` — `code`
  and `channel` are read-only identity) and **campaigns** (`GET /campaigns` with
  per-status counts). A campaign is queued (`POST /campaigns/friday-reminder`, a
  section + target Friday) then sent (`POST /campaigns/:id/send`) — separate steps,
  mirroring the service. New `Template`/`Campaign` tags. The send is a
  `ConfirmDialog` (it messages real people) that shows the `SendOutcome` counts;
  the reminder dialog loads sections **only when opened** (lazy — not needed to
  monitor). Both surface the important 409s **by status**, translated: the send's
  "WhatsApp not configured yet", and the reminder's coverage-too-low / duplicate.
  Reuses `useCurrentAcademicYearQuery` (shared) and `useListSectionsQuery`
  (sections barrel).

**Verified:** lint, typecheck, build, tests all clean; **50 → 68 tests** (+1
audit, +1 promotion, +3 users, +2 PagedList, +3 catalogue, +2 years, +2 curriculum,
+2 timetable, +2 whatsapp — edit a template, and send a campaign showing the outcome).

**F6 is complete.** All fourteen destinations in the navigation registry now render
their real screen; there are no placeholders left (verified: every registry key has
a `BUILT_SCREENS` entry). Foundation CRUD, the curriculum
builder, the timetable editor and the WhatsApp console are all done.

**Fixed a codebase-wide dead branch:** `.unwrap()` rejects with `baseQuery`'s
flattened `{ status, detail }`, not an `HttpError`, so `cause instanceof HttpError`
never matched in eleven RTK dialogs — their `?? cause.detail` branch was dead and
they always showed the generic save message. Root cause: the pattern is valid only
where code calls `http.request` **directly** (it origin­ated in `auth.gateway.ts`,
and is live in `import/UploadForm.tsx`'s multipart upload); it was copied into the
RTK dialogs where the error is caught and flattened by `baseQuery` first. The dead
branches were collapsed to the generic message (behaviour-preserving — that branch
was already the only one taken), and the two live uses left as-is. Where a specific
message is warranted, branch on `cause.status` as the timetable slot dialog does
for its `409` clash. Full write-up in [memory.md](memory.md).

**Cleanup done — `shared/react/PagedList`.** The list-body shape (loading →
skeleton, error → alert, empty → the caller's EmptyState, else → `DataTable` +
`Pagination`) is now one component. Students, sections, audit and users were
migrated onto it (each dropped its private `<XBody>` + `TableSkeleton` — a net
deletion), with the search/filter-aware empty state passed in as `empty`. A
`ListSkeleton` is exported for a screen that reaches a loading state before the
list (sections' year read). Import's `RowsTable` was left as-is: it wraps an
inline action filter and a non-EmptyState empty message, so it does not fit the
shell cleanly. Behaviour-preserving — all prior tests stayed green — plus 2 tests
for `PagedList`'s own rows/empty branches. A new list screen is now a set of
columns and an empty state, not another copy of the branching.

## Still open

Both are inherited from [`agent/progress.md`](https://github.com/Ahmed-ElKashif/el-forkan-institute/blob/main/agent/progress.md) in the backend repo and block design, not code:

1. **Certificate printed wording and layout** — blocks F5. `CertificateSheet`
   carries a placeholder body, flagged in its own source comment.
2. **Curriculum `max_score` / `pass_score` / `weight` defaults and the mandatory
   flags** — F6 can be built on the 100/50/1.0 defaults but not demoed truthfully.

Plus one frontend decision worth making before F1: whether to keep hand-copying
Zod schemas (spec §7.9) or generate a client from an OpenAPI spec. At 115 routes
and 38 models, hand-copied schemas drift silently. See build-plan.
