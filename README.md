# El Forkan — admin SPA

Arabic-first, right-to-left frontend for the El Forkan Institute management API
(`backend/`, NestJS + Prisma, 115 routes).

**Phases F0a and F0b are complete: the design system is vendored, and sign-in,
session refresh and sign-out work against the live API.** The app frame and
role-scoped navigation are F0c; the real screens start at F1 — see
[`../agent/build-plan.md`](../agent/build-plan.md).

```bash
npm install
cp .env.example .env   # VITE_API_BASE_URL, defaults to http://localhost:3000
npm run dev            # http://localhost:5173
npm test               # vitest, 28 tests
npm run lint           # oxlint + design-token check
npm run typecheck      # tsc -b, strict
npm run build          # typecheck + production build
```

Port 5173 is fixed in `vite.config.ts` because the backend's `CORS_ORIGIN`
already points at it.

## Running it

The API must be up, and it needs its own database:

```bash
cd ../../backend && npm install && npx prisma generate && npm run start:dev
```

Then `npm run dev` here and sign in. The seeded head teacher is `headteacher` /
`ChangeMe123!` (`backend/prisma/seed-head-teacher.ts`).

**Login is throttled to five attempts per minute**, keyed on IP *and* username.
You will hit this during development; the UI says so explicitly rather than
reporting it as a bad password.

---

## Architecture

**Feature modules, with two shared DI seams.** Code is grouped by the thing it
serves, not by its technical kind — a feature owns its domain types, use cases,
gateway, React bindings and screens in one folder.

```
src/
  features/
    auth/            model · errors · service · gateway · token store
                     provider · route guard · login screen · index.ts
    home/
  shared/            what more than one feature needs
    http/            HttpClient port + FetchHttpClient + errors
    di/              composition root and its React provider
    i18n/            i18next + ar.json
  ds/                design system (F0a)
  app/               App.tsx — providers and the route table
  dev/               DesignSystem gallery, dev only
  test/              the one shared test double
```

**Import a feature through its barrel**, never its internals:

```ts
import { AuthProvider, LoginPage, useAuth } from '../features/auth';
```

`npm run lint` fails on a deep import. What a feature does not export is
private to it, which is what lets the inside be reshaped without a hunt through
the rest of the app.

### Dependency injection — deliberately scarce

There are exactly **two** interfaces in the application, and both earn it:

| Seam | Where | Why it exists |
|---|---|---|
| `HttpClient` | `shared/http/http.port.ts` | The network boundary. Every gateway depends on it, and it is the single substitution point every test needs. |
| `TokenStore` | `features/auth/auth.ports.ts` | Where the access token lives is a security decision, not an implementation detail. Changing it should be one line in the composition root and visible in review. |

**Everything else is concrete**, constructor-injected without an interface.
`AuthGateway` is a plain class over `HttpClient`; `AuthService` names it
directly. Tests stub the client underneath, so they exercise the real request
construction and the real HTTP-to-domain error translation instead of faking
past them.

The rule for new features: **a gateway is a concrete class taking `HttpClient`.**
Add a port only when something genuinely varies or a test cannot proceed
without a substitute — not by default, and never one per feature.

`shared/di/container.ts` remains the only module that names a concrete class.
The graph is built in `main.tsx` and injected, so the composition root sits at
the program's edge rather than inside a component.

### The session

- **Access token: in memory only.** Never `localStorage` — a stored token
  outlives the tab and is readable by any injected script. The httpOnly refresh
  cookie already provides persistence across reloads, and JavaScript cannot
  read it.
- **Refreshing takes three calls, not two**, because `csrf-csrf` binds the CSRF
  secret to a hash of the refresh cookie, and that cookie is scoped to
  `Path=/auth/refresh`:
  1. `GET /auth/refresh/csrf-token` with credentials
  2. `POST /auth/refresh` echoing the token in `x-csrf-token`
  3. the new access token comes back in the body

  Every other request is a plain `Authorization: Bearer` with no cookie.
- **Refresh is single-flight.** The API rotates the refresh token on every call,
  so two concurrent refreshes would invalidate each other and end the session.
  `AuthService` shares one in-flight promise between all callers.
- **A 401 is recovered once, transparently.** `FetchHttpClient` refreshes and
  replays the original request; if the refresh itself fails the original 401
  stands, so the user sees an authentication failure rather than a confusing
  refresh error.
- **Errors are domain types, not status codes.** `InvalidCredentialsError`,
  `AccountLockedError`, `TooManyAttemptsError`, `SessionExpiredError` and so on,
  each carrying a `messageKey` into `ar.json`. A 401 means "wrong password" on
  login and "session over" everywhere else — the call site knows which, and the
  response body does not.

---

## Where the design comes from

`frontend/el-forkan-design-system/` is the read-only handoff bundle exported
from Claude Design. **Do not edit it and do not import from it.** It is the
reference; `src/ds/` is the implementation.

Its `readme.md` is the design spec — colour reasoning, Arabic typesetting rules,
tone of voice, the 80/15/5 ratio — and is worth reading before building a
screen. Its `ui_kits/admin/` screens are browser-compiled prototypes showing
what each screen should look like; read them, don't port them.

## Token flow

```
src/styles/tokens.css   ← the single source of truth. Every colour, size,
                          radius, shadow and duration lives here, sampled from
                          the logo. Change a value here, everything follows.
        ↓  @theme inline
src/styles/theme.css    ← maps tokens into Tailwind's namespaces. `inline`
                          means utilities emit var(--token), not a copied
                          literal, so nothing is duplicated.
        ↓
src/styles/index.css    ← tailwind + self-hosted fonts + base layer + print
```

Because the mapping is `@theme inline`, `bg-brand` compiles to
`background-color: var(--brand)`. There is no second copy of the palette to
keep in sync, and the print stylesheet's `--bg-app` override still works.

**Scale notes.** The design system's spacing scale (4·8·12·16·24·32·48·64) is
exactly Tailwind's default 4px scale, so `p-1`…`p-16` need no mapping. The type
scale is also identical to Tailwind's, but the *names* are shifted one step —
the system calls 0.875rem `xs`, Tailwind calls it `sm`. Tailwind's names win
here so that `text-sm` means what it means in every other Tailwind project. The
mapping table is in `theme.css`.

## Components

All 40 live in `src/ds/`, grouped as `core · forms · data · feedback ·
navigation · brand`.

**Always import from the barrel:**

```ts
import { Button, DataTable, RoleGate } from '../ds';
```

`npm run lint` enforces this — importing a component file directly is an error.
It is what lets internals change without touching call sites.

## Non-negotiables

These come from the design system and are not preferences:

- **RTL always.** `dir="rtl" lang="ar"`. Logical properties only — `ps-`/`pe-`,
  `ms-`/`me-`, `start-`/`end-`, `text-start`. Nothing uses `left`/`right`.
  Directional glyphs pass `mirror`; the logo, clocks and checkmarks never do.
- **Latin digits, tabular.** Use `formatNumber` / `formatScore` from
  the `ds` barrel and the `.ef-num` class. Eastern Arabic numerals never
  appear — the institute's paperwork uses Latin digits.
- **Gold is ceremony only.** Certificates, seals, graduation. `Button
  variant="ceremony"` exists so misuse is visible in review.
- **Colour is never the only signal.** Every attendance and result state also
  carries a glyph and a text label, because these grids print in black and white.
- **No Arabic string literals in application components.** Everything under
  `src/app/` goes through `src/app/i18n/ar.json`. The Arabic in `src/ds/` is the
  design system's own fixed labels and stays there.
- **No emoji, no exclamation marks.** This system issues real certificates.
- **`RoleGate` hides, it does not secure.** Authorisation is the API's job; 54
  of its 115 routes are head-teacher-only and enforce it server-side.

## What changed from the handoff bundle

Four fixes were required before the bundle could be used in production:

| | Bundle | Here |
|---|---|---|
| Icons | fetched from `unpkg.com` at runtime as CSS mask URLs — broke CSP, put a CDN in every icon's render path | `lucide-react`, imported as modules. Same `name`/`size`/`mirror` API, plus a typed `IconName` |
| Fonts | `@import` from Google Fonts | `@fontsource/ibm-plex-sans-arabic`, bundled by Vite. Arabic **and** Latin subsets — the Latin one carries the digits |
| Barrel | `_adherence.oxlintrc.json` mandated importing from `index.js`, which the bundle never shipped | `src/ds/index.ts` |
| Login | mocked an email field | the API takes `username`; the real form lands in F0b |

Two further changes:

- **`.jsx` → `.tsx`**, folding each sibling `.d.ts` into its component. Props
  are now compile-checked, which supersedes most of the adherence lint's
  per-component prop rules.
- **Hover/press are CSS variants, not React state.** The bundle drove them from
  `onMouseEnter`/`onMouseLeave`, which re-renders on every hover and never fires
  for keyboard focus or touch — untenable in a grid of hundreds of cells.

`Dialog` also gained Escape and scrim-click close, which the prototype lacked.

## Linting

`npm run lint` runs two things:

1. **oxlint** with the handoff's `.oxlintrc.json`, repointed at `src/ds/**`.
   Its `no-restricted-syntax` block was dropped: oxlint does not implement that
   rule, and most of what it carried — per-component prop and enum validation —
   is now TypeScript's job and enforced more strictly there.
2. **`scripts/check-tokens.mjs`**, which fails on any raw hex colour outside
   `tokens.css`. That is the one part of the dropped rule that still matters.

## Tests

`npm test` — Vitest, no browser environment needed.

The suite covers `src/core/` and `src/infra/` only: the use cases, the HTTP
client's token and 401 handling, and the translation from HTTP failure to
domain error. Those are the parts where a regression is silent and expensive —
a broken single-flight refresh logs users out at random, and a mis-mapped
status code shows "wrong password" when the server is down.

React components are deliberately not unit-tested here. They hold no logic
worth asserting on: `AuthProvider` turns service results into state, and
`LoginPage` renders whatever key the error carries. Testing them would assert
that React works.

One `tsconfig` note: **`erasableSyntaxOnly` is off on purpose.** It forbids
TypeScript parameter properties, which is the constructor-injection idiom this
codebase and the API both use. Its only benefit is running the source under
Node's native type-stripping, which nothing here does.
