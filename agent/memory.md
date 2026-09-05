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

5 attempts per minute on `POST /auth/login`, keyed on **IP *and* email** (F12
made email the login identity)
([`src/auth/guards/login-throttler.guard.ts`](https://github.com/Ahmed-ElKashif/el-forkan-institute/blob/main/src/auth/guards/login-throttler.guard.ts)). You will hit this. It
surfaces as a 429, which the UI reports as a throttle rather than a bad
password — recognise the message before you start debugging credentials.

## Login is two-step (email + password → emailed OTP) — F12

Staff sign in with **email + password**, then a six-digit code emailed via
Resend. `POST /auth/login` no longer returns a session — it returns
`{ mfaRequired, challengeId }`; `POST /auth/verify-otp` (`{ challengeId, code }`)
is the step that sets the refresh cookie and returns `{ accessToken, user }`.
On the client, `AuthService` split into `beginSignIn` (→ challenge id, stores no
token) and `completeSignIn` (→ session); `LoginPage` renders the two steps; a
401 on verify-otp maps to `InvalidOtpError` (`auth.errors.invalidOtp`), distinct
from `InvalidCredentialsError`. `Credentials.username` → `Credentials.email`.

Self-service reset uses the same OTP: `ResetPasswordPage` (`/reset-password`,
public; "نسيت كلمة المرور؟" link on login) calls
`auth.requestPasswordReset`/`confirmPasswordReset` via `useContainer()` (not
AuthContext — it opens no session). `UserFormDialog` now **requires email** on
create (it is the login identity).

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

## `@testing-library/dom` must be an explicit devDependency

`@testing-library/react` v16 moved `@testing-library/dom` from a bundled
dependency to a **peer** — RTL re-exports `screen`/`waitFor`/`render` *from* it,
so if it is not installed the named exports silently vanish and every test file
fails typecheck with "Module '@testing-library/react' has no exported member
'screen'". A fresh `npm install` (no `@testing-library/dom` in `package.json`)
reproduces it every time. Fixed by declaring `@testing-library/dom` explicitly
in `devDependencies`. If you ever see that TS2305 on a clean clone, this is why.

## Testing Library needs explicit cleanup here

Vitest runs without globals, so RTL's automatic `afterEach(cleanup)` never
registers itself and renders pile up across tests — the symptom is "Found
multiple elements" on the second test, not the first. `app/src/app/App.test.tsx` calls
`afterEach(cleanup)` itself.

## A controlled input with no `onChange` warns

`Checkbox`, `Switch` and `ScoreInput` always pass `checked`/`value` to the DOM
input, so *any* consumer that omits `onChange` got a React warning. They now mark
themselves `readOnly` in that case. This was a component bug, not a test problem.

## A failed RTK mutation rejects with `{ status, detail }`, not an `HttpError`

`baseQuery` (`shared/api/baseQuery.ts`) **catches** the transport's `HttpError` and
returns `{ error: { status, detail } }` (an `ApiError`). So `mutation(arg).unwrap()`
rejects with that flat object — **`cause instanceof HttpError` is always false** in
a `catch` that follows `.unwrap()`. The rule of thumb: `instanceof HttpError` is
only true where code calls **`http.request` directly** and the error skips
`baseQuery` — that is `auth/auth.gateway.ts` (concrete gateway) and
`import/UploadForm.tsx` (direct multipart upload). Everywhere else the transport
runs under RTK Query, so the check is dead.

The pattern was copied from the auth gateway (where it works) into a dozen RTK
dialogs (where it does not), and their `?? cause.detail` branch never ran — they
always showed the generic save message. Those were collapsed to just the generic
message (the honest behaviour) on 2026-08-31. To surface a *specific* RTK failure,
branch on `cause.status` (the timetable slot dialog shows a translated clash
message on `409`). Never display `cause.detail` — it is the API's English text,
which the UI must not show; map the status to a translated key instead.

## `tsc --noEmit` at the repo root checks nothing — use `npm run typecheck`

The root `tsconfig.json` is solution-style (`"files": []`, only `references`), so
`npx tsc --noEmit` compiles no `src/` file and exits clean **even with real type
errors**. The authoritative check is `npm run typecheck` (`tsc -b`), which walks
the references into `tsconfig.app.json`. A null-narrowing error — an `isEdit`
boolean failing to narrow a nullable — sailed past a bare `tsc --noEmit` and was
caught only by `tsc -b`. Verify types with the npm script, never a loose `tsc`.

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

## The student profile page composes five independent reads

`StudentProfilePage` (`/students/:id`, reached from a roster-name `<Link>`) is
one record read (`GET /students/:id`) plus four record panels — attendance,
exam results, enrollment timeline, placements — each owning its own RTK Query
hook so one slow or failed panel never blanks the page. The header and the
timeline panel both call `useStudentEnrollmentsQuery`; RTK dedupes it to one
request. All reads are tagged `{ type: 'Student', id }` so a future write can
refresh just this student. The national ID stays out of the payload — a
head-teacher-only `useLazyRevealNationalIdQuery` fires on an explicit click and
is audited server-side. A component that renders a `<Link>` needs router
context in its test (`MemoryRouter`), which is why `StudentsPage.test` wraps it.

## Charts are hand-rolled DS primitives, not a library

`BarChart` (CSS flex segments) and `Donut` (one SVG circle, `stroke-dasharray`
arcs) live in `ds/data/` — no chart dependency. Colours arrive as Tailwind
theme classes (`bg-teal-500`, `stroke-success`, `stroke-ink-400`) so the token
check (which forbids raw hex in components) stays satisfied; Tailwind v4 emits
`stroke-*` for every `--color-*`. The dashboard feeds them from the existing
`/reports/headcount-by-level` and `/reports/pass-rates` endpoints (same year
scope as the summary, same `Dashboard` cache tag). Each chart owns its query and
its own empty/error state so an empty report shows a state, never a broken axis.

## OtpInput is controlled on the whole code; the row click guards its cells

`ds/forms/OtpInput` renders one box per digit, but the source of truth is the
whole `value` string (`value[i]` per box) — no per-box state to desync. Paste
and autofill distribute across boxes. In a test, enter a code by pasting into
the first box (`click(boxes[0]); paste('123456')`), not typing — a maxLength-1
box rejects the rest. `DataTable`'s `onRowClick` makes the whole row a target
but calls `hitInteractive(e.target)` first, so a click on an inline control — a
`<select>`, a link, or a button — is left to that control and never navigates.

## Students roster shows attendance-risk, not lifecycle status

The roster's status column is an **absence-risk badge** (§4.8): the API's
`GET /students` list now returns `absences`/`warnAt`/`maxAbsences`/
`attendanceRisk` ('none'|'warning'|'over') for the current term (resolved
per-level against `attendance_policies`), so a teacher spots who is near/over
the absence limit. Lifecycle status (active/graduated/…) moved to the profile's
edit form; the old `updateStudentStatus` mutation was removed. The profile's
attendance panel carries a `position` (current-term absences vs the level's
thresholds) and an **at-risk banner** with a "warn now" button →
`POST /students/:id/absence-warning` (`CampaignsService.warnStudentAbsence`),
which records the `attendance_warnings` threshold and sends the Arabic
`absence_warning` template, degrading to `queued` when WhatsApp isn't configured.
The scheduled sweep still auto-sends; this is the manual nudge.

## The profile info card is editable via a dialog

`StudentFormDialog` (edit-only; creation stays the import path) patches
`PATCH /students/:id` through `useUpdateStudentMutation`, which invalidates the
whole `Student` tag so the roster and every profile panel refresh. It mirrors
`UserFormDialog`. Not editable, by design: gender, branch, student code
(identity / composite-FK targets). The national ID is head-teacher-only and
write-only — its value never returns with the record, so a blank field means
"leave unchanged". Governorate→markaz cascade uses `useGovernoratesQuery` /
`useMarkazesQuery(govId)` (markaz read skipped until a governorate is chosen);
the info card resolves those ids to names for the read view too. The name field
gets instant Arabic-only feedback from a regex that mirrors the API's
`ArabicNameSchema` — the API stays the authority.

## Exam eligibility (مستحقو الامتحانات) — the teacher list/save/print flow

`features/eligibility/` binds the pre-existing backend engine (no backend change
this was built against): `POST /exams/:id/eligibility/compute` runs the
attendance rule (`rules/eligibility.ts`: term absences ≥ level policy →
`low_attendance`, held out) **and persists the verdicts** — so "compute" *is*
"save"; `GET /exams/:id/eligibility` re-reads the materialised list. Both are
open to teachers (only `PATCH /exam-eligibility/:id` override is head-only, not
surfaced here). `EligibilityPage` (`/exams/:examId/eligibility`, reached from an
"المستحقون" link on the exam picker) computes, tallies, filters (all/eligible/
ineligible, client-side), and prints. `EligibilityPrintPage`
(`/exams/:examId/eligibility/print`) renders the eligible roster in a DS
`PrintSheet` **outside the AppShell** (same pattern as the certificate print, so
the shell chrome does not print) with a signature column + `window.print()`.
Subject label comes from `useScoreGridQuery` (there is no single-exam GET).

## Toast now floats and self-dismisses; overlays animate in

`ds/feedback/Toast` renders a **fixed, bottom-centred overlay** (was in the page
flow, which shifted layout when it appeared) with a slide-in and a 5s
auto-dismiss (`duration={0}` to keep it open). It uses the latest-ref pattern —
the `onDismiss` ref is updated in an effect, not during render (oxlint's
`react(refs)` forbids the render-time write) — so the countdown restarts only
when `message` changes, not on every parent re-render. Callers are unchanged:
still `<Toast tone message onDismiss />` rendered from a `toast` state. `Dialog`
(scrim `ef-fade-in`, panel `ef-dialog-in`) and the `SideNav` active item (a
white inline-start accent bar) also got motion/indicator polish. Keyframes live
in `styles/index.css`; all are `motion-safe:` so reduced-motion disables them.

## Four back-end gaps now painted (settings, exam create, sections admin, export)

- **Attendance policies** — `features/settings` (`/settings`, head-teacher). Lists the
  year default + per-level overrides; the dialog PUTs `attendance-policies`
  (upsert by year+level). `block_exam` + `maxAbsences` here is exactly what the
  eligibility screen reads.
- **Exam creation** — `ExamCreateDialog` on the exam picker. An exam points at an
  examinable curriculum row (§4.2), so it reads `useCurriculumTreeQuery` (for the
  section's level+termNumber) to pick the subject; `POST /exams` inherits max/pass
  from that row. Needs the section's branchId (added to `SectionDetail`, already
  in the payload) and the term's termNumber.
- **Section admin + teachers** — `SectionsAdminPage` (`/sections`, head-teacher;
  distinct from the read-only pickers the grids open). `SectionTeachersDialog`
  reads the row **live from the list** (not a snapshot) so each assign/unassign —
  which invalidates `Section` — flows back as fresh props. Reuses
  `useTeacherOptionsQuery`.
- **Data export** — `features/exports` (`/exports`). Downloads are binary, so the
  http port grew a `responseType: 'blob'` (fetch client returns `response.blob()`
  after the same token-attach + 401 replay); `shared/dom/download.ts#saveBlob`
  hands it to the browser. Exports go through `useContainer().http` directly (like
  the import upload), not RTK Query.

## Second batch of painted gaps (override, dashboard charts, term results, sessions)

- **Eligibility override** — head-teacher only column on `EligibilityPage` →
  `EligibilityOverrideDialog` PATCHes `/exam-eligibility/:id` (verdict + mandatory
  reason + optional seat); the page now needs `AuthProvider` in its test.
- **Dashboard charts** — added `useHeadcountByMarkazQuery` (BarChart) and
  `useAttendanceTrendQuery` (new `ds/data/LineChart`, an SVG polyline over an area
  fill, Tailwind `stroke-*`/`fill-*` so no raw colour). The trend resolves its
  `termId` from `useAcademicYearQuery(yearId)` + `defaultTerm`.
- **Term results** — `features/termresults` (`/term-results/:sectionId/:termId`,
  reached from the exam picker). compute (both roles) and finalize (head, gated
  in-screen + server) are POSTs returning `TermResult[]`; the page holds the rows
  in local state (no cached query, no tag).
- **Session cancel/reschedule** — `features/sessions` (`/sessions/:sectionId`,
  reached from the attendance grid). `SessionEditDialog` mirrors the DDL
  invariants client-side (online/hybrid needs a meeting link unless cancelled; a
  cancellation needs a reason). `updateSession` invalidates `Session` **and**
  `Attendance` (the grid's columns are these sessions).

## Roster group filter + assignable study year

The roster has a **group (gender) filter** beside the year filter (the API's
`GET /students` already accepted `gender`; `StudentsQuery` just threads it). The
profile can **set or correct a study year**: `AssignYearDialog` picks a
current-year section of the student's group (the year comes from the section's
level). With no current-year enrollment it POSTs `/enrollments`
(`useAssignEnrollmentMutation`, the legacy-import case); with one it POSTs
`/enrollments/:id/transfer` (`useTransferEnrollmentMutation`) to move the
enrollment to the right section. `PATCH /enrollments` can't move a section
(composite-FK identity), so the dedicated **transfer** endpoint does it — same
academic year + same gender only (else 400 / 409), preserving the enrollment id
so attendance/results stay attached. The header shows the year with an edit
(pencil) when set, an "assign" button when null; the current-year enrollment is
resolved via `useCurrentAcademicYearQuery`.
