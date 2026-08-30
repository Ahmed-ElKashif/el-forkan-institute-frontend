<div align="center">

<img src="public/assets/logo-readme.png" alt="دورات الفرقان التثقيفية" width="200" />

# El Forkan Institute — Admin SPA

**دورات الفرقان التثقيفية**

Arabic-first, right-to-left admin app for a Quran institute in Egypt.<br/>
Students, sections, timetables, attendance, exams, promotion,<br/>
certificates and WhatsApp reminders.

<br/>

![React](https://img.shields.io/badge/React-19-109989?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-0D8073?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-0A665C?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-084F47?style=for-the-badge&logo=tailwindcss&logoColor=white)

![RTL](https://img.shields.io/badge/RTL-عربي-C5852D?style=for-the-badge)
![Tests](https://img.shields.io/badge/tests-35_passing-C5852D?style=for-the-badge)
![Components](https://img.shields.io/badge/design_system-40_components-A76D24?style=for-the-badge)

</div>

<br/>

<div align="center">

### The two halves of this system

<table>
<tr>
<td align="center" width="50%">

**[← Backend API](https://github.com/Ahmed-ElKashif/el-forkan-institute)**

`NestJS` · `Prisma` · `Postgres`

117 REST routes, 396 tests

</td>
<td align="center" width="50%">

**Frontend SPA**

`React` · `Vite` · `Tailwind`

📍 **You are here**

</td>
</tr>
</table>

</div>

---

## Status

**F0a–F0c and F1 are done.** The design system is vendored; sign-in, session
refresh and sign-out work against the live API; every signed-in route sits
inside the role-scoped frame — a sidebar genuinely shorter for a teacher, and
route-level 403 gating that mirrors the API. **F1** adds the first data screens
— the dashboard and the students roster — over **RTK Query**, which caches and
dedups reads while still running through the auth-aware transport. F0d (deploy
and the cookie decision) is prepared and account-bound. F2 (attendance) is next.

The full plan — phase by phase, with a hand-runnable exit test for each — is in
[`agent/build-plan.md`](agent/build-plan.md), alongside the living
[architecture](agent/architecture.md), [progress](agent/progress.md) and
[memory](agent/memory.md) notes. **Start there in a new session.**

---

## Quick start

Two terminals. The [API](https://github.com/Ahmed-ElKashif/el-forkan-institute) is a separate repository and owns the
database, so it goes up first.

```bash
# terminal 1 — the API, cloned as a sibling of this repo
git clone https://github.com/Ahmed-ElKashif/el-forkan-institute.git
cd el-forkan-institute && npm install && npx prisma generate && npm run start:dev

# terminal 2 — this app
npm install
cp .env.example .env      # VITE_API_BASE_URL, defaults to http://localhost:3000
npm run dev               # http://localhost:5173
```

Sign in as `headteacher` / `ChangeMe123!`.

> [!WARNING]
> **Login is throttled to five attempts per minute**, keyed on IP *and*
> username. You will hit this during development. The UI says so explicitly
> rather than reporting it as a bad password.

Port 5173 is fixed in `vite.config.ts` because the backend's `CORS_ORIGIN`
already points at it.

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server on :5173 |
| `npm test` | Vitest — 35 tests |
| `npm run lint` | oxlint + design-token check |
| `npm run typecheck` | `tsc -b`, strict |
| `npm run build` | typecheck + production build |

---

## Architecture

**Feature modules, with two shared DI seams.** Code is grouped by the thing it
serves, not by its technical kind — a feature owns its domain types, use cases,
gateway, React bindings and screens in one folder.

```
src/
  features/
    auth/            model · errors · service · gateway · token store · provider
                     route guard · role guard + 403 · login screen · index.ts
    dashboard/       model · RTK Query endpoints · DashboardPage
    students/        model · RTK Query endpoints · StudentsPage
  shared/            what more than one feature needs
    http/            HttpClient port + FetchHttpClient + errors
    api/             RTK Query — baseQuery over HttpClient · store · pagination
    react/           useDebouncedValue
    di/              composition root and its React provider
    i18n/            i18next + ar.json
  ds/                design system — 40 components
  app/               App.tsx — providers and the route table
    shell/           the signed-in frame + navigation registry
  dev/               DesignSystem gallery, dev only
  test/              the one shared test double
```

Import a feature through its barrel, never its internals:

```ts
import { AuthProvider, LoginPage, useAuth } from '../features/auth';
```

`npm run lint` fails on a deep import. What a feature does not export is
private to it.

### Dependency injection — deliberately scarce

There are exactly **two** interfaces in the application, and both earn it:

| Seam | Where | Why it exists |
|---|---|---|
| `HttpClient` | `shared/http/http.port.ts` | The network boundary. Every gateway depends on it, and it is the single substitution point every test needs. |
| `TokenStore` | `features/auth/auth.ports.ts` | Where the access token lives is a security decision, not an implementation detail. |

Everything else is concrete, constructor-injected without an interface.
`AuthGateway` is a plain class over `HttpClient`; tests stub the client
underneath it, so they exercise the real request construction and the real
HTTP-to-domain error translation instead of faking past them.

**The rule for new features:** a gateway is a concrete class taking
`HttpClient`. Add a port only when something genuinely varies or a test cannot
proceed without a substitute — not by default, and never one per feature.

`shared/di/container.ts` is the only module that names a concrete class. The
graph is built in `main.tsx` and injected, so the composition root sits at the
program's edge rather than inside a component.

### The session

- **Access token: in memory only.** Never `localStorage` — a stored token
  outlives the tab and is readable by any injected script. The httpOnly refresh
  cookie already provides persistence across reloads.
- **Refreshing takes three calls, not two**, because `csrf-csrf` binds the CSRF
  secret to a hash of the refresh cookie, and that cookie is scoped to
  `Path=/auth/refresh`:
  1. `GET /auth/refresh/csrf-token` with credentials
  2. `POST /auth/refresh` echoing the token in `x-csrf-token`
  3. the new access token comes back in the body

  Every other request is a plain `Authorization: Bearer` with no cookie.
- **Refresh is single-flight.** The API rotates the refresh token on every call,
  so two concurrent refreshes would invalidate each other and end the session.
- **A 401 is recovered once, transparently.** `FetchHttpClient` refreshes and
  replays the original request; if the refresh itself fails the original 401
  stands.
- **Errors are domain types, not status codes** — `InvalidCredentialsError`,
  `AccountInactiveError`, `TooManyAttemptsError`, `SessionExpiredError` and so on,
  each carrying a `messageKey` into `ar.json`.

---

## Design system

`el-forkan-design-system/` is the read-only handoff bundle exported from Claude
Design. It sits **outside this repository**, one level up in the working tree,
so a fresh clone will not have it. **Do not edit it and do not import from it** —
it is the reference; `src/ds/` is the implementation.

### Token flow

```
src/styles/tokens.css   ← the single source of truth. Every colour, size,
                          radius, shadow and duration, sampled from the logo.
        ↓  @theme inline
src/styles/theme.css    ← maps tokens into Tailwind's namespaces. `inline`
                          means utilities emit var(--token), not a copy.
        ↓
src/styles/index.css    ← tailwind + self-hosted fonts + base layer + print
```

`bg-brand` compiles to `background-color: var(--brand)`. There is no second copy
of the palette to keep in sync, and the print stylesheet's override still works.

### The palette, sampled from the logo

| | Token | Hex | Role |
|---|---|---|---|
| ![](https://img.shields.io/badge/-109989-109989?style=flat-square) | `teal-500` | `#109989` | **Forkan Teal** — the dome. Carries the interface. |
| ![](https://img.shields.io/badge/-C5852D-C5852D?style=flat-square) | `gold-500` | `#C5852D` | **Forkan Gold** — the open book. Ceremony only. |
| ![](https://img.shields.io/badge/-12211F-12211F?style=flat-square) | `ink-900` | `#12211F` | Headings. Teal-tinted, never pure grey. |
| ![](https://img.shields.io/badge/-F5F8F7-F5F8F7?style=flat-square) | `canvas` | `#F5F8F7` | App ground |
| ![](https://img.shields.io/badge/-FAF7F1-FAF7F1?style=flat-square) | `paper` | `#FAF7F1` | Ivory — print and certificates only |

**Ratio 80 / 15 / 5** — teal, ivory ground, gold. This is an interface decision,
not something the logo dictates: the mark itself is closer to 50/50. The
interface spends far less gold than the logo does, so that when gold appears it
still reads as ceremony.

### Non-negotiables

Enforced by tooling — breaking one fails `npm run lint` or `tsc`.

- **RTL always.** `dir="rtl" lang="ar"`. Logical properties only — `ps-`/`pe-`,
  `ms-`/`me-`, `start-`/`end-`, `text-start`. Nothing uses `left`/`right`.
  Directional glyphs pass `mirror`; the logo, clocks and checkmarks never do.
- **Latin digits, tabular.** `formatNumber` / `formatScore` from the `ds` barrel
  plus `.ef-num`. They pin `ar-EG-u-nu-latn`, and that matters:
  `Intl.NumberFormat('ar-EG')` resolves to the `arab` system and prints ١٬٤٤٧.
- **Gold is ceremony only.** `Button variant="ceremony"` exists so misuse is
  visible in review.
- **Colour is never the only signal.** Every attendance and result state carries
  a glyph and a text label, because these grids print in black and white.
- **No Arabic string literals in application components** — everything under
  `features/` and `app/` goes through `shared/i18n/ar.json`.
- **No emoji, no exclamation marks in the product UI.** This system issues real
  certificates that families keep.
- **`RoleGate` hides, it does not secure.** Authorisation is the API's job; 54 of
  its 115 routes enforce the head-teacher rule server-side.

---

## Tests

`npm test` — Vitest, no browser needed.

The suite covers `features/auth/` and `shared/http/`: the use cases, the HTTP
client's token and 401 handling, and the translation from HTTP failure to domain
error. Those are the parts where a regression is silent and expensive — a broken
single-flight refresh logs users out at random, and a mis-mapped status code
shows "wrong password" when the server is down.

One integration test in `src/app/App.test.tsx` covers the path that spans every
layer: container → providers → router → guarded route → real sign-in. React
components are otherwise not unit-tested; they hold no logic worth asserting on.

> [!NOTE]
> **`erasableSyntaxOnly` is off on purpose.** It forbids TypeScript parameter
> properties, which is the constructor-injection idiom this codebase and the API
> both use. Its only benefit is running the source under Node's native
> type-stripping, which nothing here does.

---

## What changed from the handoff bundle

Four fixes were required before the bundle could be used in production:

| | Bundle | Here |
|---|---|---|
| **Icons** | fetched from `unpkg.com` at runtime as CSS mask URLs — broke CSP, put a CDN in every icon's render path | `lucide-react`, imported as modules. Same `name`/`size`/`mirror` API, plus a typed `IconName` |
| **Fonts** | `@import` from Google Fonts | `@fontsource/ibm-plex-sans-arabic`, bundled by Vite. Arabic **and** Latin subsets — the Latin one carries the digits |
| **Barrel** | the adherence lint mandated importing from `index.js`, which the bundle never shipped | `src/ds/index.ts` |
| **Login** | mocked an email field | the API authenticates on `username` |

Plus: `.jsx` → `.tsx` with each `.d.ts` folded in, so props are compile-checked;
hover and press moved from React state to CSS variants (the bundle re-rendered
on every hover and never fired for keyboard focus or touch); and `Dialog` gained
Escape and scrim-click close.

---

<div align="center">

**Status:** F0a–F0c + F1 complete · dashboard and students over RTK Query · session + role-scoped frame working.<br/>
[See the backend repo →](https://github.com/Ahmed-ElKashif/el-forkan-institute)

<sub>دورات الفرقان التثقيفية · El Forkan Institute</sub>

</div>
