# Architecture — module map & why

Living document, mirroring [`agent/architecture.md`](https://github.com/Ahmed-ElKashif/el-forkan-institute/blob/main/agent/architecture.md) in the backend repo. Each structural
choice is tied to the reason it was made, so a future session can tell a
deliberate decision from an accident.

Companion docs: [build-plan.md](build-plan.md) (what to build next),
[progress.md](progress.md) (what happened), [memory.md](memory.md) (gotchas).

## Current module map (F6 complete — all fourteen destinations built)

```
src/
├─ features/            one folder per domain area; the unit of work
│  ├─ auth/             model · errors · ports · service · gateway · token store
│  │                    provider · route guard · role guard + 403 · login · index.ts
│  ├─ dashboard/        model · api (injectEndpoints) · DashboardPage · index.ts
│  ├─ students/         model · api (injectEndpoints) · StudentsPage · index.ts
│  ├─ sections/         model · api · SectionsPage (reusable picker) · index.ts
│  │                    (barrel exposes useGetSectionQuery/useListSectionsQuery)
│  ├─ attendance/       model · api · AttendanceGridPage · index.ts
│  ├─ scores/           model · api · ExamPickerPage · ScoreGridPage
│  │                    CorrectionDialog · index.ts
│  ├─ import/           model · api · UploadForm · ImportPreview
│  │                    FixRowDialog · ImportPage · index.ts
│  ├─ certificates/     model · api · CertificatesPage (tabs: issue/revoke)
│  │                    CertificatePrintPage (shell-less A4 print) · index.ts
│  ├─ audit/            model · api · AuditPage (paged log + snapshot dialog) · index.ts
│  ├─ promotion/        model · api · PromotionPage (preview → confirm) · index.ts
│  ├─ users/            model · api · UsersPage · UserFormDialog (create/edit) · index.ts
│  │                    (barrel also exposes the teacher picker read)
│  ├─ catalogue/        model · api · CataloguePage (tabs: levels/subjects/books)
│  │                    Level/Subject/Book form dialogs · index.ts
│  │                    (barrel also exposes levels + subject/book picker reads)
│  ├─ years/            model · api (mutations only; reads reuse shared calendar)
│  │                    YearsPage · YearDialog · TermEditDialog · index.ts
│  ├─ curriculum/       model · api · CurriculumPage (year/level/term → tree)
│  │                    CurriculumRowCard · CurriculumRowDialog · UnitDialog · index.ts
│  ├─ timetable/        model (+ groupByWeekday) · api · TimetableEditorPage
│  │                    WeekGrid · SlotDialog · GenerateSessionsDialog · index.ts
│  └─ whatsapp/         model (+ pendingCount) · api · WhatsAppPage (tabs:
│                       templates/campaigns) · TemplateDialog · ReminderDialog · index.ts
├─ shared/              only what more than one feature needs
│  ├─ http/             HttpClient port · FetchHttpClient (JSON + multipart) · HttpError
│  ├─ api/              RTK Query: baseQuery (bridges HttpClient) · api · store
│  │                    pagination · calendar (year/term reads + Calendar tag + defaultTerm) · reference (branches)
│  ├─ react/            useDebouncedValue · TermPicker · PagedList (shared list shell)
│  ├─ di/               container.ts (composition root) · DiProvider.tsx
│  └─ i18n/             i18next init · ar.json
├─ ds/                  design system — 40 components + tokens (F0a)
├─ app/                 App.tsx: providers, the store, and the route table
│  └─ shell/            AppShell (frame) · navigation registry · SectionPlaceholder
├─ dev/                 DesignSystem.tsx — the /ds gallery, dev only
├─ test/                stub-http-client.ts — the one shared test double
├─ styles/              tokens.css · theme.css · index.css
└─ main.tsx             reads config, builds the graph, renders
```

`features/*` gateways are of two kinds now, and both go through the same
`HttpClient`: `auth/` uses a concrete `AuthGateway` (it needs domain-error
translation and single-flight refresh); the data features use **RTK Query
endpoints** injected into `shared/api`, because a read list wants caching,
dedup and loading/error state, which the library owns. See "Data fetching"
below.

The `home` feature that F0b shipped was a placeholder to prove the session; F0c
replaced it with `app/shell/` and it was deleted.

## The app shell lives in `app/`, not a feature

`app/shell/` holds the signed-in frame and the navigation registry. It sits with
`App.tsx` rather than in a feature or in `shared/` on purpose: the registry
knows every destination and which routes are gated, which is composition-level
knowledge — the same knowledge the route table has. Keeping both in `app/` means
the "knows about every feature" concern lives in one place, and `shared/` stays
for things that are genuinely feature-agnostic.

`navigation.ts` is the single source of truth for the sidebar, the page titles
and the route table. `App.tsx` generates its routes from it and wraps the
`headTeacherOnly` ones in `RequireRole`, so a destination cannot appear in the
sidebar without its route being gated to the matching role — the two cannot
drift apart.

## Role gating — presentation over an enforced boundary

`features/auth/RequireRole` renders a route's children only for the allowed role
and shows the design system's `denied` `EmptyState` otherwise; it fails closed
if no user is present. It reads the role from the same `useAuth()` the rest of
the app uses — the user `restore()`/sign-in already loaded from `GET /users/me`.

Authorisation logic stays inside the auth feature (like `ProtectedRoute`); the
route table only decides *where* to apply it. This is presentation only: the API
enforces the same rule server-side on 54 of its 115 routes, so a teacher's
request is refused there regardless of what the client renders. The client gate
spares the teacher a request that would 403 anyway.

## Why features, not layers

F0b originally shipped `core/ infra/ app/` — a clean-architecture layering with
the domain at the centre. It was correct and it was replaced, deliberately, in
the same session.

The problem was not the dependency direction, which was right and is preserved.
It was that **one feature was spread across three top-level folders**. Adding
`students` would have meant touching `core/students/`, `infra/students/` and
`app/students/`, and a reader wanting to understand attendance would have had
to visit three places. With twelve screens coming (see build-plan F1–F6), that
scales badly.

Feature modules put everything one domain area needs in one folder. The
dependency rule that layering enforced structurally is now enforced by
convention plus lint: a feature may import from `shared/` and `ds/`, never from
another feature's internals.

**Enforced, not just documented.** `.oxlintrc.json` fails the build on
`**/features/*/*`, so a deep import into another feature is an error. Import
through the barrel:

```ts
import { AuthProvider, LoginPage, useAuth } from '../features/auth';
```

What a feature does not export from its `index.ts` is private to it. That is
what lets the inside be reshaped without a hunt through the rest of the app.

## Dependency injection — deliberately scarce

There are exactly **two** interfaces in the application. Both earn their place;
nothing else gets one.

| Seam | Where | Why |
|---|---|---|
| `HttpClient` | `shared/http/http.port.ts` | The network boundary. Every gateway depends on it, and it is the single substitution point every test needs. |
| `TokenStore` | `features/auth/auth.ports.ts` | Where the access token lives is a security decision, not an implementation detail. Changing it should be one line in the composition root and visible in review. |

**Everything else is concrete.** `AuthGateway` is a plain class over
`HttpClient`; `AuthService` names it directly and is constructed with it.

This is a change from the first F0b draft, which also made `AuthGateway` a
port. That interface had exactly one implementation and its only other user was
a test fake — and faking it meant the tests never ran the real request
construction or the real HTTP-to-domain error translation, which are the parts
most likely to drift from the API. Removing it made the tests *more* realistic,
not less.

**The rule for every feature added from F1 on:** a gateway is a concrete class
taking `HttpClient`. Add a port only when something genuinely varies, or when a
test cannot proceed without a substitute. Not by default, and never one per
feature.

`shared/di/container.ts` remains the only module that names a concrete class —
the same Dependency Inversion the API expresses with its `PASSWORD_HASHER` /
`TOKEN_SERVICE` bindings in `auth.module.ts`. The graph is built in `main.tsx`
and injected into `<App container={…} />`, so the composition root sits at the
program's edge rather than inside a component, and a test can run the whole app
against a stub with no network.

## The session — how auth actually works

`features/auth/` in one paragraph: `AuthService` holds the use cases and talks
to `AuthGateway` (HTTP) and `TokenStore` (memory). `AuthProvider` turns service
results into React state; `ProtectedRoute` gates routes on that state;
`LoginPage` renders whichever error key the domain threw.

Four things are non-obvious and were verified against the running API:

- **The access token lives in memory only.** Never `localStorage` — a stored
  token outlives the tab and is readable by any injected script. Persistence
  across reloads comes from the httpOnly refresh cookie, which JavaScript
  cannot read.
- **Refreshing takes three calls, not two.** `csrf-csrf` binds the CSRF secret
  to a hash of the refresh cookie, and that cookie is scoped to
  `Path=/auth/refresh`, which is why the token endpoint sits underneath it:
  `GET /auth/refresh/csrf-token` → `POST /auth/refresh` with the token echoed
  in `x-csrf-token` → new access token in the body. Every other request is a
  plain `Authorization: Bearer` with no cookie.
- **Refresh is single-flight.** The API rotates the refresh token on every
  call, so two concurrent refreshes would invalidate each other and end the
  session. `AuthService` shares one in-flight promise between all callers.
- **A 401 is recovered once, transparently.** `FetchHttpClient` refreshes and
  replays the original request. If the refresh itself fails, the original 401
  stands, so the caller sees an authentication failure rather than a confusing
  refresh error. Requests marked `noRetry` (the auth endpoints) never trigger
  it, or a failed refresh would loop.

## Errors are domain types, not status codes

`features/auth/auth.errors.ts` defines `InvalidCredentialsError`,
`AccountLockedError`, `AccountInactiveError`, `TooManyAttemptsError`,
`SessionExpiredError`, `NetworkError` and `UnexpectedAuthError`. Each carries a
`messageKey` into `shared/i18n/ar.json`, so a screen renders a translated
sentence without ever branching on a number.

The translation happens once, in `auth.gateway.ts`, and it takes a **context**
argument rather than reading the response body. A 401 means "wrong password"
from `login` and "session over" from everything else; the API returns a bare
401 for a bad password *and* for four distinct refresh failures, one of which
("Account no longer active") mentions neither. The call site knows reliably
which call it made; the body does not say.

## Styling — Tailwind over the design system's tokens

`styles/tokens.css` is the single source of truth for every design value, copied
from the Claude Design handoff and sampled from the institute's logo.
`styles/theme.css` maps it into Tailwind with **`@theme inline`**, which makes
utilities emit `var(--token)` rather than a copied literal:

```css
.bg-brand { background-color: var(--brand) }
```

So there is no second copy of the palette to keep in sync, and the print
stylesheet's `--bg-app` override still works. Change a hex in `tokens.css` and
every utility follows.

Two scales needed no mapping at all: the system's spacing (4·8·12·16·24·32·48·64)
is exactly Tailwind's default 4px scale, and the type scale is numerically
identical to Tailwind's — only the *names* are shifted one step, so Tailwind's
own names are used and the mapping table lives in `theme.css`.

## Data fetching — RTK Query over the one transport (F1)

Adopted at F1, exactly as F0b planned. The retrofit worth fearing was the
auth-aware transport, and that lives in `FetchHttpClient` — so RTK Query is a
**cache on top of it, not a second way to reach the network**:

- `shared/api/baseQuery.ts` is a custom `baseQuery` that calls
  `extra.http.request(...)`. The `HttpClient` is handed to every thunk as its
  `extra` argument in `shared/api/store.ts` (`makeStore(http)`), so the token
  attach, the single-flight refresh and the one-shot 401 replay still apply and
  there is no module singleton. It flattens `HttpError`/`NetworkFailureError`
  into `{ status, detail }` the way `AuthGateway` flattens into domain errors.
- One `createApi` (`shared/api/api.ts`); each feature adds endpoints with
  `injectEndpoints` in its own folder, so this stays a per-feature concern and
  the barrel rule still holds. `tagTypes` are the cross-feature invalidation
  vocabulary; `providesTags`/`invalidatesTags` live with each endpoint. F1 is
  read-only, so nothing invalidates yet.
- Query strings live in the endpoint's `path` (`toQueryString`, sorted keys →
  stable cache key and stable test-stub key), because `HttpClient` carries no
  separate params channel.
- The store is created once in `App.tsx` from `container.http` and provided
  above the router. `container.http` is the only addition to the DI surface.

Why RTK Query and not a hand-rolled hook: caching, request dedup, and
mutation-driven invalidation are real complexity the mutation-heavy phases
(attendance, scores, imports) lean on, and re-implementing them is exactly what
rule 23 warns against. `auth/` keeps its concrete gateway — it needs domain
errors and single-flight refresh, which are not caching concerns.

## What is deliberately absent

- **A port per feature.** See the DI rule above.
- **Component unit tests.** See [progress.md](progress.md) for the reasoning.
