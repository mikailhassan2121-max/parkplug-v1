# ParkPlug

A parking marketplace where drivers reserve private spaces, homeowners and
businesses list parking they are not using, and the community reports free
public parking they have spotted.

Built with Next.js 15 (App Router), TypeScript, and Tailwind CSS v4, backed by
a Node/Express + PostgreSQL API in `server/` (see `server/README.md`).

---

## Running it

Frontend only, using the browser-local data adapter (no backend needed):

```bash
npm install
npm run dev          # http://localhost:3000
```

With the real backend:

```bash
cd server && npm install && cp .env.example .env   # fill in DATABASE_URL
npx prisma migrate deploy && npm run dev             # http://localhost:4000

# in the root directory
cp .env.example .env.local
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:4000" >> .env.local
npm install && npm run dev                           # http://localhost:3000
```

```bash
npm run build && npm run start   # production build
npm run typecheck                # tsc --noEmit
npm run lint                     # next lint
```

## Configuration

Copy `.env.example` to `.env.local` and fill in what you have. **Anything left
unset renders as an explicit placeholder in the UI rather than an invented
value** — no fabricated company name, fee percentage, or support address can
reach a public page.

| Variable | Effect when unset |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Falls back to the browser-local data adapter |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Checkout explains that payments are not connected instead of reporting a charge |
| `NEXT_PUBLIC_SERVICE_FEE_BPS` / `NEXT_PUBLIC_HOST_FEE_BPS` | Pricing page shows `[SERVICE FEE RATE]`; totals say the fee is not yet set |
| `NEXT_PUBLIC_LEGAL_NAME` | Legal pages use `[LEGAL BUSINESS NAME]`; the footer falls back to brand-only wording |
| `NEXT_PUBLIC_SUPPORT_EMAIL` / `NEXT_PUBLIC_PRIVACY_EMAIL` | Contact routes through the support form only |
| `NEXT_PUBLIC_MAP_TILE_URL` | Defaults to OpenStreetMap tiles (not licensed for production traffic) |
| `NEXT_PUBLIC_GEOCODER_URL` | Defaults to OpenStreetMap Nominatim |
| `NEXT_PUBLIC_ANALYTICS_ID` | No cookie banner is shown, because no optional cookies are set |

## Architecture

```
src/
  app/                 Routes (App Router). Public pages are server components
                       with per-route metadata; app surfaces are client
                       components reading through the API layer.
  components/
    ui/                Design system: button, form controls, card, badge,
                       alert, toast, overlay, menu, feedback, icons
    layout/            Header, footer, mobile tab bar, offline banner, cookies
    map/               Leaflet map + marker styles
    search/            Search module, destination combobox, filters, result cards
    listing/           Gallery, booking card, price breakdown
    host/              Host nav, photo uploader
    dashboard/         Auth gate, dashboard nav, reservation card
    legal/             Shared policy-page frame
  lib/
    api/               API surface, adapters, pricing, result types, store
    types.ts           Domain model
    format.ts          Money, distance, duration, and date formatting
    geo.ts             Distance, address obfuscation, geocoding, geolocation
    seo.ts             Metadata builder
  config/business.ts   Business and legal configuration
  content/             Help-centre articles
server/                Node/Express + PostgreSQL API — see server/README.md
```

### The data layer

Everything the UI needs goes through `src/lib/api`. Two adapters sit behind it:

- **Browser-local (default).** Records live in `localStorage`. Nothing is
  pre-seeded, so an unconnected ParkPlug shows genuine empty states rather than
  invented listings, reviews, counts, or earnings.
- **HTTP.** Set `NEXT_PUBLIC_API_BASE_URL` and every call is proxied to that
  server. The request/response shapes are the types in `src/lib/types.ts`, and
  `server/` implements exactly that contract against PostgreSQL — see
  `server/README.md` for the backend's own architecture notes.

Every call resolves to `ApiResult<T>` — either `{ ok: true, data }` or
`{ ok: false, error }` with a typed `code` that maps onto a specific UI error
state. `useAsync` and `useAction` in `src/lib/use-async.ts` turn that into the
loading / ready / error triple each surface renders.

### Address privacy

A listing's exact address is never published:

- Public maps draw a circle around a point offset from the real location
  (`obfuscate` in `src/lib/geo.ts`), seeded by the listing id so it stays put.
- `toApproximateLocation` strips the street number before building the label.
- The full address lives in `privateAddress` and is only attached to a
  reservation once it is confirmed.
- Listing metadata carries no street address in the title, description,
  canonical URL, or HTML source, and `/spaces/*` is excluded from the sitemap.

## QA

Three Playwright scripts:

```bash
npm run build && npm run start &
QA_BASE_URL=http://localhost:3000 node scripts/qa-pages.mjs   # 34 routes
QA_BASE_URL=http://localhost:3000 node scripts/qa-flows.mjs   # user journeys
```

`qa-pages.mjs` checks every route at desktop and mobile for console errors,
horizontal overflow, broken images, missing `alt`, heading structure, and
unnamed controls, then sweeps 320/375/430/768/1024px for overflow and writes
screenshots to `screenshots/`. `qa-flows.mjs` drives sign-up, vehicle
management, the listing wizard, search, the reporting flow, support, and
keyboard access — both run fine against the browser-local adapter alone.

`qa-live-backend.mjs` requires the real API running (see `server/README.md`)
and `NEXT_PUBLIC_API_BASE_URL` set before `npm run build`. It proves the
integration is real rather than assumed: sign-up against Postgres, a genuine
httpOnly session cookie, a vehicle that survives a full page reload, and a
sign-out that actually clears the session server-side.

```bash
cd server && npm run dev &                          # :4000
QA_BASE_URL=http://localhost:3000 \
QA_API_BASE_URL=http://localhost:4000 \
  node scripts/qa-live-backend.mjs
```

Set `CHROMIUM_PATH` if you have a Chromium build outside Playwright's own
download directory.

## Conventions

- **No invented data.** If a value is not known, the UI shows a placeholder or
  an empty state. This applies to reviews, ratings, earnings, fees, activity
  counts, and timestamps alike.
- **Every action has four states** — loading, success, error, and empty where
  applicable — plus a disabled state with a stated reason.
- **Never signal status by colour alone.** `StatusBadge` always carries a text
  label.
- **Responsive visibility belongs on a wrapper**, never in a `className` passed
  to `Button`/`ButtonLink`; their base `inline-flex` beats a `hidden` utility.
- **Maps always have a list equivalent**, so nothing is available only visually.
