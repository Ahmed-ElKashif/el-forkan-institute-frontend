# Deploying El Forkan (build plan F0d)

Two Render services — the API and this SPA — plus one decision that decides
whether the session survives. Everything here is prepared in code and in the two
`render.yaml` files; what remains is provisioning, which needs your Render
account.

This phase sits **before any real screen** on purpose. The failure it heads off
is invisible in local dev and only appears once deployed: login works, then
every token refresh silently fails. Catch it now, not after F5.

---

## The decision: where the two services live

The refresh cookie is `httpOnly`, `Path=/auth/refresh`, and `SameSite=Strict`.
`SameSite` is judged per **site** (registrable domain), not per origin — so the
answer depends entirely on the domains you deploy under.

| Topology | Same site? | Cookie setting | Notes |
|---|---|---|---|
| **Two `*.onrender.com` subdomains** (e.g. `el-forkan-app` + `el-forkan-api`) | **No** — `onrender.com` is on the Public Suffix List, so each subdomain is its own site | `COOKIE_SAMESITE=none` | Works immediately, no domain to buy. `None` forces `Secure`; Render is HTTPS, so that is fine. This is what both `render.yaml` files assume. |
| **One registrable domain** (e.g. `app.elforkan.org` + `api.elforkan.org`) | **Yes** | leave `COOKIE_SAMESITE` unset (`strict`) | The stronger posture. Requires a domain and two DNS records. |

Either way, CSRF is unaffected: `csrf-csrf` binds its double-submit secret to a
hash of the refresh cookie, independent of `SameSite`.

**Why `None` is safe here.** It only governs whether the browser *sends* the
cookie cross-site; the cookie stays `httpOnly` (unreadable by script) and CSRF
still requires the matching `x-csrf-token` header. The one cost is that `None`
relies on the CSRF layer rather than `SameSite` for cross-site request forgery,
which is exactly what that layer is for.

---

## Service 1 — the API (backend repo)

Defined in the backend repo's `render.yaml`. Import that repo as a Render
Blueprint, then set the `sync: false` secrets in the dashboard.

- **Build:** `npm ci && npx prisma generate && npm run build`
- **Start:** `npm run start:prod`
- **Health check:** `/health`
- **Env set in the blueprint:** `NODE_ENV=production`, `COOKIE_SAMESITE=none`
- **Secrets to set by hand** (from the backend `.env.example`): `DATABASE_URL`,
  `DIRECT_URL`, the four `SUPABASE_*`, `JWT_ACCESS_SECRET`, `CSRF_SECRET`,
  `REFRESH_TOKEN_PEPPER`, `FIELD_ENCRYPTION_KEY`, and **`CORS_ORIGIN`**.
- `CORS_ORIGIN` is the SPA's exact origin (scheme + host, no trailing slash).
  You will not know it until Service 2 exists, so deploy the SPA first, copy its
  URL here, and redeploy the API.

The database is the existing Supabase project — Render runs against it, it is not
provisioned here. Keep `sslmode=no-verify` on both URLs (see the backend
`.env.example`).

## Service 2 — the SPA (this repo)

Defined in this repo's `render.yaml` as a static site.

- **Build:** `npm ci && npm run build`  →  **Publish:** `dist`
- **`VITE_API_BASE_URL`** is baked into the bundle at **build time**, so set it
  in the dashboard *before* the first build: the API's exact origin, e.g.
  `https://el-forkan-api.onrender.com`, no trailing slash.
- The blueprint's rewrite (`/* → /index.html`) is what lets a hard refresh on
  `/students` or `/imports` resolve instead of 404ing.

Change `VITE_API_BASE_URL` later → trigger a rebuild; it is not read at runtime.

---

## Order of operations

1. Deploy the **SPA** first (blueprint) to learn its URL.
2. Set the API's `CORS_ORIGIN` to that URL and set the SPA's
   `VITE_API_BASE_URL` to the API's URL.
3. Deploy the **API**; redeploy the SPA if its API URL was not set on the first
   build.
4. Confirm `COOKIE_SAMESITE=none` on the API (default in the blueprint) unless
   you put both under one registrable domain.

---

## Exit test — on the deployed URL, not localhost

1. Open the SPA's URL and sign in as the head teacher.
2. Force an access-token expiry: in DevTools, drop the in-memory token (reload
   the tab — the access token only ever lived in memory) so the next call must
   refresh.
3. Keep using the app. **The session must survive** — the three-call refresh
   (`GET /auth/refresh/csrf-token` → `POST /auth/refresh` → new access token)
   must succeed cross-site.
4. In DevTools → Application → Cookies, confirm `refresh_token` is present with
   `SameSite=None; Secure` (or `Strict` if you chose one domain).
5. Hard-refresh on a deep link such as `/imports` — it must load, not 404.

If step 3 fails with the login screen or a CSRF error, the cookie was dropped:
re-check `COOKIE_SAMESITE`, that `CORS_ORIGIN` matches the SPA origin exactly,
and that both services are HTTPS.
