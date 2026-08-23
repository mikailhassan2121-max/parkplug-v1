# Sensor Demo — Production Enablement Runbook

Status as of this writing: Netlify's production branch is this working
branch (auto-publish on), commit `95e3665` is live there and on Railway
(ACTIVE, same commit). The sensor migration has applied
(`GET /api/v1/facilities` returns `[]`, not an error), but nothing is
seeded and none of the sensor env vars are set yet. This doc is the
remaining steps — no code change is required to enable the demo.

Every value below is a **placeholder**. Never paste a real token, or a real
`DATABASE_URL`, into this file, a commit, a terminal you don't control, or
chat.

## 1. Set environment variables

**Railway (server):**

| Var | Placeholder | Notes |
|---|---|---|
| `SENSOR_INGEST_TOKEN` | `REPLACE_WITH_GENERATED_TOKEN` | See §2 for how to generate it. Required — ingest refuses all requests without it. |
| `SENSOR_OFFLINE_AFTER_SECONDS` | `86400` | Default is `90`. With no real ESP32 reporting, the background sweeper (runs every 15s, unconditionally, no flag gates it) will flip every seeded space to OFFLINE ~90s after boot at the default. `86400` (24h) keeps the seeded AVAILABLE/OCCUPIED states stable for a full day of demoing without needing a real device or a re-seed. |
| `DEMO_SEED` | *(not needed at runtime)* | Only read by the standalone seed script (§3), never by the running server. Setting or leaving it on Railway's persistent env has no runtime effect either way. |

`ADMIN_SIMULATOR_ENABLED` (listed in `server/.env.example`) is **not
currently read by any server code** — it's reserved but unused. It does
**not** need to be set on Railway for the simulator to work. The only real
gate is the Netlify var below, checked in two places: the simulator page
and the `/api/admin/simulate` route handler.

**Netlify (frontend), in addition to what's already set:**

| Var | Placeholder |
|---|---|
| `NEXT_PUBLIC_ADMIN_SIMULATOR_ENABLED` | `true` |
| `SENSOR_INGEST_TOKEN` | `REPLACE_WITH_GENERATED_TOKEN` (**exact same value** as Railway's — no `NEXT_PUBLIC_` prefix, server-side only, never sent to the browser) |

A Netlify env change needs a redeploy to take effect (env vars are read at
build/boot, not at request time).

## 1a. Grant an admin account

The simulator is gated server-side on a real `isAdmin` flag on the `User`
row (not `isHost` — any host can list a space, admin is platform staff
only). Nothing in the app ever sets this from a user-facing page; it's
granted with a one-off script, same safety shape as the seed:

```bash
# from server/, with DATABASE_URL pointed at the right database
npm run grant-admin -- someone@example.com

# to revoke:
npm run grant-admin -- someone@example.com --revoke
```

Same rule as the seed in §3 — prefer running this as a Railway one-off so
`DATABASE_URL` never has to leave Railway's own environment.

## 2. Generate a strong ingest token locally

Run this on your own machine — don't type the output anywhere but directly
into the Railway/Netlify env var fields:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use the same value for both `SENSOR_INGEST_TOKEN` entries above.

## 3. Run the seed

**Script:** `npm run seed` (defined in `server/package.json:12` as
`tsx prisma/seed.ts`) — run from the **`server/`** directory.

**Required for it to actually seed instead of no-op:**
- `DATABASE_URL` — implicit, needed by the Prisma client.
- `DEMO_SEED=true` — explicit gate (`server/prisma/seed.ts:46`); anything
  else and it logs "skipping demo facility seed" and exits doing nothing.

**Recommended: run it as a Railway one-off, not locally against prod.**

```bash
railway run --service <your-server-service> sh -c "cd server && DEMO_SEED=true npm run seed"
```

This lets Railway inject its own `DATABASE_URL` from its environment — it
never has to be typed, pasted, or exported into your local shell or this
conversation. If the Railway CLI isn't available, the fallback is a local
run with a temporary `DATABASE_URL` copied from Railway's dashboard directly
into your shell's environment (not a file, not a paste anywhere else),
unset immediately after.

**Is it destructive?** No — purely additive:
- Upserts by unique key (`facilityId: "TEST-GARAGE-001"`, `spotId`,
  `sensorId`), touching only rows under that one demo facility.
- Never reads or writes `Listing`, `Reservation`, `User`, or any other
  existing table.
- Safe to re-run any time — it resets the demo facility's spaces back to
  their documented defaults (A1/A2/A4/A5 AVAILABLE, A3/A6 OCCUPIED) without
  touching anything else.

## 4. ESP32 + BMM150 wiring shape

```bash
curl -X POST https://<railway-domain>/api/v1/sensors/occupancy \
  -H "Authorization: Bearer <SENSOR_INGEST_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"sensor_id":"PP-001","spot_id":"TEST-A1","occupied":true,"sensor_value":842,"confidence":0.94}'

# Preferred for real devices: issue with
# `npm run sensor-token -- issue PP-001`, then replace the Authorization
# header above with `X-ParkPlugs-Sensor-Token: <device-token>`. A device token
# may report only the sensor_id it was issued for. Rotate or revoke it with
# the corresponding `npm run sensor-token -- rotate|revoke PP-001` command.

# Heartbeat, independent of occupancy, roughly every 30s
curl -X POST https://<railway-domain>/api/v1/sensors/heartbeat \
  -H "Authorization: Bearer <SENSOR_INGEST_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"sensor_id":"PP-001","battery_level":0.87}'
```

## 5. Verify

- `GET https://<railway-domain>/api/v1/facilities` returns one facility
  (`TEST-GARAGE-001`) with 6 spaces.
- `https://<site>/live` shows the facility with a pulsing marker.
- `https://<site>/admin/sensor-simulator` loads (requires a signed-in
  **admin** account — see §1a) and "Vehicle arrives" on A1 flips it to
  OCCUPIED live.

## 6. Teardown after the demo

1. Netlify: set `NEXT_PUBLIC_ADMIN_SIMULATOR_ENABLED` back to `false` (or
   unset it) and redeploy. This alone closes the simulator to the public —
   the page renders a "not enabled" message and the proxy route refuses
   requests with `404`.
2. Railway: `SENSOR_INGEST_TOKEN` can stay set (real ESP32 hardware still
   needs it) or be rotated if it was ever exposed; rotating it also
   invalidates the old value everywhere, including anything already flashed
   to a device.
3. Optionally lower `SENSOR_OFFLINE_AFTER_SECONDS` back toward its default
   (`90`) once real hardware — or nobody — is expected to be reporting, so
   a genuinely dead sensor is flagged promptly again instead of staying
   "available" for up to a day.
4. The seeded `TEST-GARAGE-001` facility itself is harmless to leave in
   place; delete its rows manually (by `facilityId`) if you want it gone
   entirely.
