# Architecture — module map & why

Living document, mirroring `backend/agent/architecture.md`. Each structural
choice is tied to the reason it was made, so a future session can tell a
deliberate decision from an accident.

Companion docs: [build-plan.md](build-plan.md) (what to build next),
[progress.md](progress.md) (what happened), [memory.md](memory.md) (gotchas).

## Current module map (after F0b)

```
frontend/app/src/
├─ features/            one folder per domain area; the unit of work
│  ├─ auth/             model · errors · ports · service · gateway · token store
│  │                    provider · route guard · login screen · index.ts
│  └─ home/             placeholder page, replaced by the real shell in F0c
├─ shared/              only what more than one feature needs
│  ├─ http/             HttpClient port · FetchHttpClient · HttpError
│  ├─ di/               container.ts (composition root) · DiProvider.tsx
│  └─ i18n/             i18next init · ar.json
├─ ds/                  design system — 40 components + tokens (F0a)
├─ app/                 App.tsx: providers and the route table
├─ dev/                 DesignSystem.tsx — the /ds gallery, dev only
├─ test/                stub-http-client.ts — the one shared test double
├─ styles/              tokens.css · theme.css · index.css
└─ main.tsx             reads config, builds the graph, renders
```

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

## What is deliberately absent

- **RTK Query / Redux.** Deferred to F1. The retrofit worth fearing was the
  auth-aware transport, and that now lives in `FetchHttpClient`, which already
  refreshes and replays a 401. RTK Query becomes a thin cache whose `baseQuery`
  delegates to that client, with tag types declared per endpoint as endpoints
  appear. Installing Redux during F0b would have added a second data-access
  paradigm to cache exactly one request (`/users/me`).
- **A port per feature.** See the DI rule above.
- **Component unit tests.** See [progress.md](progress.md) for the reasoning.
