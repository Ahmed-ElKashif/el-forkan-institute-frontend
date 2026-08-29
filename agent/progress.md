# Progress — frontend milestone log

Mirrors the phase list in [build-plan.md](build-plan.md). One entry per phase,
updated as we go. Companion docs: [architecture.md](architecture.md) (the module
map and why), [memory.md](memory.md) (gotchas that cost real time).

**Where we are: F0a and F0b are done.** The app signs in against the live API,
survives a reload, and signs out. F0c (app frame + role-scoped nav) is next,
though F0d (deploy + the cookie decision) is the one not to defer.

---

## Design system handoff (2026-08-29) ✅ done

Claude Design produced `frontend/el-forkan-design-system/` from the backend repo
plus a `design-context/` brief written from the logo. It contains 40 components,
6 token files, 17 guideline cards, 8 prototype screens, a `.d.ts` per component,
an adherence lint config and a `SKILL.md`.

Reviewed in full before any code was written. Findings and their disposition are
in build-plan Part 1. The bundle is **read-only reference** — do not edit it and
do not import from it. `frontend/app/src/ds/` is the implementation.

---

## F0a — Vendor the design system ✅ done

Scaffolded `frontend/app/` (Vite + React 19 + TypeScript + Tailwind v4), its own
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

## Still open

Both are inherited from `backend/agent/progress.md` and block design, not code:

1. **Certificate printed wording and layout** — blocks F5. `CertificateSheet`
   carries a placeholder body, flagged in its own source comment.
2. **Curriculum `max_score` / `pass_score` / `weight` defaults and the mandatory
   flags** — F6 can be built on the 100/50/1.0 defaults but not demoed truthfully.

Plus one frontend decision worth making before F1: whether to keep hand-copying
Zod schemas (spec §7.9) or generate a client from an OpenAPI spec. At 115 routes
and 38 models, hand-copied schemas drift silently. See build-plan.
