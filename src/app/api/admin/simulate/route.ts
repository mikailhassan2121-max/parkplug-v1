import { NextResponse, type NextRequest } from "next/server";

/**
 * Server-side proxy for the sensor simulator. SENSOR_INGEST_TOKEN never
 * reaches the browser — this route reads it from the server environment,
 * checks the caller is a signed-in admin, and forwards the exact same
 * request shape to the same /api/v1/sensors/occupancy endpoint real ESP32
 * hardware calls, forcing source: "SIMULATOR" so simulated traffic can
 * never masquerade as a real device in the activity feed.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const SENSOR_TOKEN = process.env.SENSOR_INGEST_TOKEN?.trim();
const SIMULATOR_ENABLED = process.env.NEXT_PUBLIC_ADMIN_SIMULATOR_ENABLED === "true";

export async function POST(req: NextRequest) {
  if (!SIMULATOR_ENABLED) {
    return NextResponse.json({ message: "The sensor simulator is not enabled." }, { status: 404 });
  }
  if (!API_BASE || !SENSOR_TOKEN) {
    return NextResponse.json(
      { message: "The sensor simulator is not configured on the server." },
      { status: 503 },
    );
  }

  // Real server-side authorization boundary. A Bearer replay is the only
  // reliable channel here since the Railway session cookie belongs to a
  // different origin and is never sent to this Next.js route — the token
  // itself proves who is signed in, and isAdmin (from the User row on the
  // Railway backend, not anything client-supplied) proves they're allowed
  // to drive the simulator.
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ message: "Sign in as an admin to use the simulator." }, { status: 401 });
  }

  const sessionRes = await fetch(`${API_BASE}/auth/session`, {
    headers: { authorization: authHeader },
    cache: "no-store",
  });
  const sessionUser = sessionRes.ok ? await sessionRes.json().catch(() => null) : null;
  if (!sessionUser || !sessionUser.isAdmin) {
    return NextResponse.json({ message: "Sign in as an admin to use the simulator." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const upstream = await fetch(`${API_BASE}/api/v1/sensors/occupancy`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${SENSOR_TOKEN}`,
    },
    body: JSON.stringify({ ...body, source: "SIMULATOR" }),
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
