# ParkPlug API

Node/Express backend for the ParkPlug frontend, backed by PostgreSQL through Prisma. The route contracts mirror `src/lib/api/index.ts` on the frontend field for field, so pointing `NEXT_PUBLIC_API_BASE_URL` at a running instance of this server is the entire integration — no frontend request shapes need to change.

## Running it

You need a PostgreSQL 14+ database.

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL at minimum
npx prisma migrate deploy
npm run dev             # http://localhost:4000
```

```bash
npm run build && npm start   # production
npm run typecheck
npm run prisma:studio        # browse the database
```

## What's real, what's gated

Every "not yet configured" state the frontend already knows how to render is backed by a real, empty configuration here — not a fake success:

| Feature | Without config | With config |
|---|---|---|
| Payments | `POST /reservations` returns `402 payment_unavailable` before any charge is attempted | Real Stripe PaymentIntents, refunds on cancellation |
| Fees | `quote()` computes a $0 service/host fee and reports `feesKnown: false` | Real fee math from `SERVICE_FEE_BPS` / `HOST_FEE_BPS` / `TAX_BPS` |
| Email | Verification and reset links are logged to the console, never silently dropped | Sent via `nodemailer` over the configured SMTP server |
| Payouts | `GET /host/payouts` returns `not_started`; `POST /host/payouts/start` returns `payment_unavailable` | Real Stripe Connect Express onboarding, redirecting to a hosted link |

Set the corresponding `.env` values to move any of these from "not configured" to real. See `.env.example` for the full list.

## Architecture

```
src/
  app.ts            Express app assembly — CORS, rate limiting, sessions, routers
  index.ts           Entrypoint
  env.ts              Validated environment (zod) — nothing starts on bad config
  db.ts               Shared Prisma client
  routes/             One file per resource, mirroring the frontend's api/index.ts
  middleware/
    session.ts        Cookie session resolution + requireAuth
    error-handler.ts   ApiError -> {message, fieldErrors, code} JSON
    request-id.ts      X-Request-Id header — the frontend shows this as a support reference
  lib/
    dto.ts              Prisma row -> frontend TypeScript shape mappers
    pricing.ts          Fee math, ported line-for-line from the frontend's quote()
    geo.ts              Distance, walking time, address-privacy offset — also ported
    reservation-lifecycle.ts   Lazy confirmed -> completed transition (see below)
    cookies.ts, tokens.ts, password.ts, mailer.ts, uploads.ts, notifications.ts
prisma/
  schema.prisma       Full data model — 19 tables
scripts/
  dev-seed-reservation.ts         DEV-ONLY fixture, see below
  dev-seed-future-reservation.ts  DEV-ONLY fixture, see below
```

### Sessions

Cookie-based, not JWT: `pp_session` is an opaque id pointing at a `Session` row, so "sign out of all devices" is a real `DELETE` on that table rather than something a stolen token can outlive. `httpOnly`, `SameSite=Lax`, `Secure` in production.

### Address privacy is enforced at the API layer, not just the UI

The frontend's original browser-only build returned the same object to the public listing page and the host's own edit page, because both ran in one person's browser. With a real multi-user backend that's a real leak: `GET /listings/:slug` (`listings.routes.ts`) never includes `exactAddress` or `privateInstructions` — those exist only on `toListingHostDto` (host's own listings) and on a *confirmed* reservation's snapshot. A public map offset (`obfuscate()` in `lib/geo.ts`) uses the listing's own slug as its seed, so the point is stable but never traceable back to the real coordinate.

### Reservation lifecycle

There's no cron in this deployment. `settleOverdueReservations()` runs at the top of every route that lists or reads reservations and flips any `confirmed` reservation whose `endAt` has passed to `completed` — which is also what unlocks `canReview`. Cheap, idempotent, and it's the only thing that makes the review flow reachable at all.

### Payment ordering

`POST /reservations` validates the listing, vehicle, time window, and double-booking conflict *before* touching Stripe — so a doomed reservation never reaches a payment attempt, and (once real keys are added) a conflicting booking never gets charged in the first place.

### Account deletion is anonymization, not a hard delete

`Reservation.listingId` and `Reservation.vehicleId` are `onDelete: Restrict` on purpose — a driver's booking history has to survive a host closing their account, and vice versa. `DELETE /auth/account` archives the user's listings, deletes what has no dependents (saved listings, notifications, vehicles with no reservations), and anonymizes the `User` row itself (name, email, password) rather than deleting it — matching the Data & Account Deletion policy on the frontend's legal pages. Tested against the hardest case: a host account with an active listing and multiple reservations against it.

### Explicit error codes

Three frontend `ApiErrorCode` values — `payment_failed`, `payment_unavailable`, `upload_failed` — have no natural HTTP status of their own. `ApiError` carries an optional `code` field that the frontend's `request()` helper reads directly when present (see `src/lib/api/index.ts` on the frontend), falling back to status-based mapping otherwise.

## Dev-only test fixtures

`scripts/dev-seed-reservation.ts` and `scripts/dev-seed-future-reservation.ts` insert a reservation directly via Prisma, bypassing the payment gate. **They are not part of the application** — not imported by `app.ts`, not reachable over HTTP, never run in production. Reservation creation is correctly gated behind a real payment provider by design; without real Stripe test keys there is no other way to exercise the reservation-dependent surfaces (cancellation, reviews, host earnings, messaging) against real data. Run with:

```bash
npx tsx scripts/dev-seed-reservation.ts <email> <listingSlug>
npx tsx scripts/dev-seed-future-reservation.ts <email> <listingSlug> [hoursFromNow]
```

## Known gaps

- **Listing photo uploads** — `POST /media/listing-photo` (multipart, saves to local disk, returns `{url, width, height}`) is implemented and tested, but the frontend's `PhotoUploader` still embeds photos as data URLs rather than calling it. Wiring that up is the next integration step; the endpoint works today via curl.
- **Messaging UI** — `conversations.routes.ts` and the `Conversation`/`Message` tables are complete and tested (a conversation is created automatically with every reservation), but there's no thread view built on the frontend yet — only the conversation list.
- **Stripe Connect** — `POST /host/payouts/start` creates a real Express account and onboarding link when `STRIPE_SECRET_KEY` is set. Untestable end-to-end in this environment without real Stripe credentials.
