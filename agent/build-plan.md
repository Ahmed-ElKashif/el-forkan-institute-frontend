# Frontend build plan — El Forkan admin SPA

Companion to `backend/agent/build-plan.md`. Written after reviewing the
Claude Design handoff bundle in `frontend/el-forkan-design-system/`.

Each phase has an **exit test** you can run by hand before moving on. Do not
start a phase until the previous one's exit test passes.

---

## Start here (new session)

**Status: F0a and F0b are done.** The app signs in against the live API,
survives a reload, and signs out. **F0c is next**, but see the note under F0d.

Read in this order:

| Doc | Answers |
|---|---|
| [architecture.md](architecture.md) | What exists now and why it is shaped that way |
| [progress.md](progress.md) | What happened in each phase, and what is still open |
| [memory.md](memory.md) | Gotchas that already cost time — read before debugging |
| this file | What to build next, with a hand-runnable exit test per phase |
| `../app/README.md` | How to run it, and the conventions the tooling enforces |

Then, to get it running — two terminals, both starting at the repo root:

```bash
# terminal 1 — the API
cd backend && npm install && npx prisma generate && npm run start:dev

# terminal 2 — the SPA
cd frontend/app && npm install && cp .env.example .env && npm run dev
```

Sign in as `headteacher` / `ChangeMe123!`. **The login throttle is five
attempts per minute** — you will hit it; see memory.md.

Before changing anything, confirm the baseline is green:

```bash
npm run lint && npm run typecheck && npm test
```

That should report 28 passing tests.

> **Note on structure.** F0b below was written before the code was reorganised.
> It shipped a `core/ infra/ app/` layering, which was replaced in the same
> session by feature modules with two DI seams — see the *Architecture decision*
> section further down, and architecture.md for the reasoning. The auth flow it
> describes is unchanged and accurate.

---

## Part 1 — Review of the handoff bundle

### What arrived, and its quality

40 components, 6 token files, 17 guideline cards, 8 prototype screens, a props
contract (`.d.ts`) and usage note (`.prompt.md`) per component, an adherence
lint config, and a `SKILL.md` wrapper. The `readme.md` is a genuine design
spec, not filler.

**The token layer is production-ready as-is.** Every colour sampled from the
logo survived intact into `tokens/colors.css`. Copy the six CSS files in
unchanged — they need no work.

**The components are real React**, written with logical properties throughout
(`paddingInline`, `insetInlineStart`, `blockSize`) — the RTL discipline in the
readme is actually honoured in the source, which is rarer than it sounds. The
`.d.ts` files are accurate prop contracts.

**The `ui_kits/admin/` screens are prototypes, not code to keep.** They load
React from unpkg, compile JSX in the browser with Babel standalone, and pass
components around via `window.ElForkanDesignSystem_2d3e98` globals. Read them
as the visual spec — they are excellent for that — then rebuild the screens as
real modules.

### Blocking findings — fix during F0a, before any screen work

| # | Finding | Why it blocks |
|---|---|---|
| 1 | **`Icon.jsx` fetches every glyph from `unpkg.com` at runtime** as a CSS mask URL | Breaks your CSP (`default-src 'self'`), and puts a third-party CDN in the render path of every icon in the app. Replace with `lucide-react` (tree-shaken, local). Single file, as the readme itself predicts. |
| 2 | **`tokens/typography.css` `@import`s IBM Plex Sans Arabic from Google Fonts** | Same CSP problem, plus a flash of unstyled Arabic. Self-host the woff2. Already flagged in the bundle's readme as needing your input. |
| 3 | **No `index.js` barrel exists**, but `_adherence.oxlintrc.json` forbids importing component internals and directs imports to `index.js` | The lint config is unrunnable until the barrel exists. Create it as part of the vendoring step. |
| 4 | **`Login.jsx` collects an email** (`type="email"`, `head@forkan.eg`) | Your `LoginSchema` takes **`username`** (trimmed, 1–50 chars). `users.email` is nullable and not the login key. The mock is wrong about your own API — build the real form against `username`. |

### Non-blocking findings — decide before F2

| # | Finding | Recommendation |
|---|---|---|
| 5 | **Hover is React state** — `onMouseEnter`/`onMouseLeave` + `useState` in `Button`, and the same pattern elsewhere | Fine for a form. In the attendance grid it is a re-render per cell hover across hundreds of cells, and it never fires for keyboard focus or touch. Convert `DataTable`, `AttendanceCell` and `ScoreInput` to CSS `:hover`/`:focus-visible` rules during F2. Leave the rest. |
| 6 | **Everything is `.jsx`; the plan says TypeScript** | Convert to `.tsx` during vendoring. The `.d.ts` files give you every prop type — the conversion is mechanical, roughly an afternoon. |
| 7 | **The system is CSS-variables + inline style objects; the plan said Tailwind** | **Decided: Tailwind stays** (maintainability). The duplication risk this raised is resolved by mapping tokens with `@theme inline` rather than re-declaring them — `bg-brand` compiles to `background-color: var(--brand)`, so `tokens.css` remains the single source of truth and there is no second palette to keep in sync. See `app/README.md`. |
| 8 | **Font family changed**: the bundle standardised on IBM Plex Sans Arabic for everything; `design-context/BRAND.md` still says Cairo + Noto Naskh Arabic | The bundle's choice is the better one — one family, fewer binaries, and Plex Arabic has real tabular figures, which the grids depend on. Update `BRAND.md` section 2 so the two documents stop disagreeing. |
| 9 | **CSP note** — React `style={{}}` sets styles through CSSOM, not markup attributes | This is **not** blocked by `style-src 'self'` in a client-rendered SPA. The inline-style approach is CSP-safe. Only findings 1 and 2 are real CSP problems. |

### What the bundle deliberately did not build

Curriculum builder, timetable editor, WhatsApp console, and the foundation CRUD
screens. The readme's reasoning is sound — they introduce no pattern the
existing primitives do not cover. They land in F6.

---

## Part 2 — Phases

### F0a — Vendor the design system  ✅ DONE

Create `frontend/app/` (Vite + React + TS + **Tailwind v4**), its own git repo.

- Copy the token CSS in unchanged as `src/styles/tokens.css`, then map it into
  Tailwind's namespaces with `@theme inline` in `src/styles/theme.css` so the
  tokens are referenced, never copied.
- Copy `assets/` (logo full, mark, original).
- Convert all 40 components `.jsx` to `.tsx`, folding each sibling `.d.ts` into
  the component file. Keep the folder structure (`core`, `forms`, `data`,
  `feedback`, `navigation`, `brand`).
- **Fix 1:** rewrite `Icon.tsx` over `lucide-react`. Keep the same props
  (`name`, `size`, `mirror`) so no call site changes.
- **Fix 2:** self-host IBM Plex Sans Arabic 400/500/600/700 via
  `@fontsource/ibm-plex-sans-arabic`, replacing the Google Fonts `@import`.
  Import the **latin** subsets as well as the arabic ones — the latin subset is
  what carries the digits, and every numeral in this product is Latin.
- **Fix 3:** write `src/ds/index.ts` re-exporting every component.
- Wire `_adherence.oxlintrc.json` into the lint script.
- Add a dev-only `/ds` route rendering every component, ported from the
  `*.card.html` guideline cards.

**Exit test**

1. `npm run lint` clean with the adherence rules active.
2. `/ds` renders all 40 components, RTL, in the right colours.
3. DevTools, Network, filtered to third-party: **zero requests**. No unpkg, no
   fonts.googleapis.com.
4. Print preview of `/ds` shows the A4 rules applying.

---

### F0b — Auth  ✅ DONE

- RTL shell: `<html lang="ar" dir="rtl">`, i18next + `ar.json`, no Arabic
  literals in components.
- Router + protected route.
- **Deviation from this plan, taken deliberately: RTK Query is deferred to F1.**
  The retrofit I warned about is the auth-aware transport, not the tag types —
  and that now lives in `FetchHttpClient`, which already refreshes and replays a
  401. When RTK Query arrives it becomes a thin caching layer whose `baseQuery`
  delegates to that client, and tag types are declared per endpoint as endpoints
  appear. Installing Redux in F0b would have added a second data-access
  paradigm to cache exactly one request (`/users/me`).
- **The refresh flow is three calls, not two.** The refresh cookie is
  `Path=/auth/refresh` and `SameSite=Strict`, and `csrf-csrf` binds its secret
  to that cookie, which is why the token endpoint lives underneath it:
  1. `GET /auth/refresh/csrf-token` with `credentials: 'include'`
  2. `POST /auth/refresh` with the token in the header
  3. new `accessToken` from the response body

  Every other call is a plain `Authorization: Bearer` with **no** cookie.
- Access token in **memory only**. Never `localStorage`.
- Login form against **`username`**, not email (finding 4).

**Exit test**

1. Log in as head teacher, then as teacher, against the local backend.
2. Force a refresh (drop the access token in devtools) — the three-call dance
   runs and the user stays signed in.
3. Log out — the cookie is cleared and a protected route bounces to login.
4. Six rapid login attempts give a 429, shown as the Arabic throttle message,
   not a generic error. *(The throttle is 5/min per IP+username. You will hit
   this during development; recognise it.)*

**Verified during the build.** The full three-call flow was exercised against
the running API with a cookie jar: login set `refresh_token`, the CSRF endpoint
issued a token, and `POST /auth/refresh` with `x-csrf-token` returned a fresh
access token that `GET /users/me` accepted. `PublicUser` matches `AuthUser`
field for field.

**One contract correction found by doing this.** Refreshing without a valid
cookie answers **403 `invalid csrf token`**, not 401 — `csrf-csrf` rejects the
request before the auth code runs, because the CSRF secret is bound to a hash
of that same cookie. The gateway now reads that as `SessionExpiredError`; it
would otherwise have surfaced as a generic "unexpected error".

---

### Architecture decision (taken after F0b, applies from F1 on)

**Feature modules, not technical layers.** `src/features/<name>/` owns its
domain types, use cases, gateway, React bindings and screens, and exposes them
through an `index.ts`. `shared/` holds only what more than one feature needs.
Lint fails on a deep import into another feature.

**DI at critical points only.** Two interfaces exist in the whole app:
`HttpClient` (the network boundary, and the seam every test stubs) and
`TokenStore` (a security decision). Feature gateways and services are concrete
classes, constructor-injected. This replaces the `core/ infra/ app/` layering
F0b originally shipped — same dependency direction, one fewer abstraction, and
no invitation to add a port per feature.

---

### F0c — App frame and role gating

`SideNav` + `TopBar` from the kit, `RoleGate` fed by `GET /users/me`.

**Exit test**

1. The teacher's sidebar is genuinely shorter — import, certificates and audit
   are absent, not disabled.
2. Typing a head-teacher-only URL directly as a teacher lands on a real 403
   screen in Arabic.

---

### F0d — Deploy the shell **(do not defer this)**

Two Render services, backend and frontend, plus the domain decision.

This sits here, before any real screen, on purpose. `SameSite=Strict` plus
separate Render subdomains means the refresh cookie is **silently dropped** —
login appears to work and every refresh fails. `backend/agent/memory.md`
already flags it. Discovering it now costs an afternoon; discovering it after
F5 costs a week.

**Exit test** — on the deployed URL, not localhost: log in, wait out or force
an access-token expiry, and confirm the session survives.

---

### F1 — Read-only breadth

Students list, sections list, dashboard. The cheapest proof that RTK Query,
`DataTable` and real Arabic data work together.

**Import the real 1447 workbooks into the dev database first** — 96 students.
Long Arabic names break layouts that look perfect with placeholder text.

**Exit test**

1. Students list paginates and searches with real names, no RTL wrapping
   breakage at 360px width.
2. Dashboard numbers match what `/reports/summary` returns.
3. Every number is Latin digits, tabular.

---

### F2 — Attendance grid

The hardest screen. `GET /sections/:id/attendance` feeds it in one query;
`POST /sessions/:id/attendance` bulk-upserts. Convert the hover pattern to CSS
here (finding 5).

**Exit test**

1. On a 390px viewport, take attendance for a full section: sticky student
   column, sticky header, tap to cycle present, absent, late, excused.
2. Save, hard-reload — every value persisted.
3. Absence-threshold badge appears for a student over the policy limit.
4. Print preview: all four states legible in greyscale, glyphs intact.

---

### F3 — Scores, lock, correction

**Exit test**

1. Teacher enters scores; a value over the subject max is refused with the rule
   stated, not with "invalid".
2. Head teacher locks — every field takes the read-only skin and `LockBanner`
   appears.
3. Teacher can no longer edit and sees no unlock control at all.
4. Head teacher corrects one grade; the reason is mandatory; the change appears
   in `GET /audit-logs` and in `grade_changes`.

---

### F4 — Import preview to commit

**Exit test**

1. Upload a real roster workbook; every row shows create / update / skip / error.
2. Fix an error row inline, watch its status change.
3. The commit bar stays disabled while any error remains.
4. Before commit, confirm in the DB that **nothing** was written.
5. Commit, then verify the rows landed.

---

### F5 — Certificates and print

The one place gold leads.

**Exit test**

1. Issue a certificate; the serial reads `L4-1447-0001`.
2. A4 portrait RTL print preview on ivory paper, gold rules, no toner-eating
   fills.
3. Reprint reuses the same serial and issue date, and records the copy in the
   audit log.
4. Revoking demands a reason; re-issuing afterwards succeeds.
5. **Blocked on the head teacher:** the printed wording is still undecided
   (`backend/agent/progress.md`, "Still open" #2). Ask before building the sheet.

---

### F6 — The rest

Promotion preview to confirm, WhatsApp console, curriculum builder, timetable
editor with clash detection, foundation CRUD, audit viewer.

**Exit test** — the whole-system acceptance already written in
`backend/agent/build-plan.md`: import the real 1447 workbooks, build 1448,
enrol, generate sessions, take attendance, run exams, enter scores, run
promotion preview to confirm, issue a certificate, print a roster — as the head
teacher, in Arabic, RTL. Then as a teacher: every head-teacher action 403s.

---

## Two decisions worth making before F1

1. **Schema duplication.** Spec 7.9 says hand-copy the Zod schemas into the
   frontend. That was reasonable at ten routes; at **115 routes and 38 models**
   hand-copied schemas drift silently. You already have `nestjs-zod` installed —
   adding `@nestjs/swagger` plus its OpenAPI patch generates a spec, and from
   that, typed clients. One backend afternoon that removes a whole category of
   bug. Your call, but worth making deliberately rather than by default.

2. **Install `SKILL.md` as a Claude Code skill**
   (`.claude/skills/el-forkan-design/`). Every future session then knows the
   brand rules without being re-told — gold is ceremony only, logical properties
   only, Latin digits, a glyph with every state.

## Two answers needed from the head teacher

Both are already logged as open in `backend/agent/progress.md`; both block
design work, not code:

1. Certificate printed wording and layout (blocks F5).
2. Curriculum `max_score` / `pass_score` / `weight` defaults and the mandatory
   flags (F6 can be built on the 100/50/1.0 defaults, but not demoed truthfully).
