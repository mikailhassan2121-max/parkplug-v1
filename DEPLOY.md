# Deploying ParkPlug — Netlify + Railway

This repo is set up for **Netlify** (frontend) + **Railway** (API + Postgres). Both
steps below need to happen through each provider's own dashboard because they
require you to sign in and authorize access to your GitHub account — that's
not something that can be done on your behalf from outside a browser.

Deploy the **backend first** — the frontend needs its live URL.

## 1. Backend — Railway

1. Go to [railway.app](https://railway.app), sign in with GitHub, **New
   Project → Deploy from GitHub repo**, pick this repo.
2. Railway will try to build the repo root. Open the new service's
   **Settings → Root Directory** and set it to `server`. Redeploy.
3. **Database**: either **New → Database → PostgreSQL** in the same Railway
   project (Railway creates it and exposes `DATABASE_URL` — reference it from
   the API service's variables as `${{Postgres.DATABASE_URL}}`, offered
   automatically by Railway's variable picker), or point `DATABASE_URL` at a
   Supabase Postgres project instead — both work identically from the app's
   side, since it's just a connection string. On Supabase, append
   `?schema=app` to keep ParkPlug's tables out of the schemas Supabase
   reserves for itself; see `server/README.md`, "Using Supabase".
4. On the API service, set these **Variables**:
   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | reference to the Postgres plugin (step 3) |
   | `PORT` | `4000` (Railway also sets its own `PORT`; the app reads `process.env.PORT`) |
   | `NODE_ENV` | `production` |
   | `CORS_ORIGIN` | **comma-separated, no trailing slash**: your Netlify URL plus `http://localhost:3000`, e.g. `https://parkplug.netlify.app,http://localhost:3000` (fill in the real Netlify URL after step 2 of the frontend section, then redeploy) — must be an explicit list, never `*`, since the API sends `Access-Control-Allow-Credentials: true` |
   | `SESSION_SECRET` | a random 32+ byte hex string — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `PUBLIC_UPLOAD_BASE_URL` | your Railway public domain + `/uploads`, e.g. `https://parkplug-api.up.railway.app/uploads` |
   | `UPLOAD_DIR` | `./uploads` |
   | `RESEND_API_KEY` or `BREVO_API_KEY` | pick one — email goes over the provider's HTTPS API, not SMTP, because Railway blocks outbound SMTP ports 465/587 at the network level. **Resend refuses to deliver to anyone but the account owner until a sending domain is verified** — if you don't have a verified domain yet, use Brevo instead (only needs single-sender verification) so real signups aren't blocked. Set `MAIL_PROVIDER=brevo` if both keys happen to be set. |
   | `MAIL_FROM` | e.g. `ParkPlug <no-reply@yourdomain.com>` — must be a verified domain (Resend) or verified sender (Brevo), or use each provider's own test sender address while you set that up |

   Nothing extra is needed for address search — `/geocode/search` proxies
   OpenStreetMap Nominatim with no API key.

   Leave `STRIPE_SECRET_KEY`, `SERVICE_FEE_BPS`, `HOST_FEE_BPS`, `TAX_BPS`
   unset for now — the app already renders honest "not configured" states
   for payments and fees rather than faking them. Add real values later
   without any code changes when you're ready.

5. **Settings → Networking → Generate Domain** to get a public URL
   (`https://<something>.up.railway.app`). That's your API base URL.
6. Deploy. `npm run build` runs `prisma generate` + `tsc`; `npm run start`
   runs `prisma migrate deploy` (applying the schema to the fresh database)
   before starting the server. Watch the deploy logs for `ParkPlug API
   listening on :...`.
7. Confirm it's up: `curl https://<your-api-domain>/health` → `{"ok":true}`.

   > ⚠️ Railway's disk is ephemeral by default — uploaded listing photos
   > won't survive a redeploy. Attach a **Volume** mounted at `/app/uploads`
   > (Settings → Volumes) before real users start uploading photos, or swap
   > `server/src/lib/uploads.ts` for an S3-compatible client later.

## 2. Frontend — Netlify

1. Go to [netlify.com](https://netlify.com), sign in with GitHub, **Add new
   site → Import an existing project**, pick this repo.
2. Netlify auto-detects `netlify.toml` at the repo root (already committed —
   it wires up `@netlify/plugin-nextjs`, also already in `package.json`).
   Leave the base directory as the repo root (not `server`).
3. **Site configuration → Environment variables**, add:
   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_BASE_URL` | your Railway URL from step 1.5, e.g. `https://parkplug-api.up.railway.app` |
   | `NEXT_PUBLIC_SITE_URL` | your Netlify URL once you know it, e.g. `https://parkplug.netlify.app` |

   Everything else in `.env.example` (map tiles, Stripe publishable key, fee
   rates, legal name, support email) is optional — unset means the UI shows
   an explicit placeholder instead of inventing a value. Fill in what you
   have.
4. Deploy. Once it's live, copy the resulting `https://*.netlify.app` URL.
5. Go back to Railway and set `CORS_ORIGIN` (step 4 above) to that exact
   URL, then redeploy the API — until this matches, the browser will block
   sign-in and every other cookie-based request with a CORS error.

## 3. Verify

- Visit the Netlify URL, sign up for an account, add a vehicle, reload the
  page — if the vehicle is still there, the frontend is really talking to
  Railway's Postgres, not local storage.
- Sign in, then reload the page again — you should stay signed in. If you
  don't, double check `CORS_ORIGIN` on Railway matches the Netlify URL
  exactly (no trailing slash) and that both services actually redeployed
  after the env vars were set.
- On `/report-parking`, typing an address should show live suggestions
  within about a second — that's the `/geocode/search` proxy working.
- `scripts/qa-live-backend.mjs` can be pointed at the deployed URLs locally:
  ```bash
  QA_BASE_URL=https://parkplug.netlify.app \
  QA_API_BASE_URL=https://parkplug-api.up.railway.app \
    node scripts/qa-live-backend.mjs
  ```

## 4. Custom domain (optional)

Both Netlify and Railway support adding a custom domain under their
**Domains** settings once you own one — point its DNS at the value each
dashboard gives you, then update `CORS_ORIGIN` and `NEXT_PUBLIC_SITE_URL` to
match and redeploy both services.

## 5. Turning on payments later

Set `STRIPE_SECRET_KEY` (with Stripe Connect enabled for host payouts) on
the Railway API service, plus `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and the
fee-rate variables on Netlify. No code changes are needed — the app already
branches on whether these are configured (see `server/README.md`, "What's
real, what's gated").
