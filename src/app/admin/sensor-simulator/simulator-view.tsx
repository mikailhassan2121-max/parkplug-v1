"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/session";
import { getSessionToken } from "@/lib/api";
import { RequireAuth } from "@/components/dashboard/require-auth";
import { Container, SectionHeading } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/form";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/feedback";
import { SpaceStatusBadge } from "@/components/sensor/space-status-badge";
import { LiveBadge } from "@/components/sensor/live-badge";
import { IconBolt, IconLock } from "@/components/ui/icons";
import { useFacilityLiveStatus } from "@/lib/use-facility-live-status";
import { fetchFacilitiesList } from "@/lib/api/sensors";
import type { FacilitySpace, FacilitySummary, SpaceStatus } from "@/lib/sensor-types";

const SIMULATOR_ENABLED = process.env.NEXT_PUBLIC_ADMIN_SIMULATOR_ENABLED === "true";

type LogEntry = {
  id: string;
  at: string;
  request: Record<string, unknown>;
  ok: boolean;
  status: number;
  response: unknown;
};

async function callSimulator(body: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: unknown }> {
  const token = getSessionToken();
  const res = await fetch("/api/admin/simulate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export function SimulatorView() {
  if (!SIMULATOR_ENABLED) {
    return (
      <Container size="default" className="py-16 text-center">
        <EmptyState
          icon={<IconLock />}
          title="The sensor simulator is not enabled"
          description="Set NEXT_PUBLIC_ADMIN_SIMULATOR_ENABLED=true (demo/staging environments only) to turn this on."
        />
      </Container>
    );
  }

  return (
    <RequireAuth>
      <AdminGate />
    </RequireAuth>
  );
}

/**
 * UX-level gate only — shows/hides the page for a signed-in non-admin. The
 * real security boundary is server-side, in /api/admin/simulate's own
 * isAdmin check against the session it fetches directly from the backend.
 */
function AdminGate() {
  const session = useSession();
  if (session.status !== "authenticated" || !session.user?.isAdmin) {
    return (
      <Container size="narrow" className="py-16 text-center">
        <EmptyState icon={<IconLock />} title="Admin access required" description="Sign in with an admin account to use the sensor simulator." />
      </Container>
    );
  }
  return <SimulatorBody />;
}

function SimulatorBody() {
  const [facilities, setFacilities] = useState<FacilitySummary[]>([]);
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [listStatus, setListStatus] = useState<"loading" | "ready" | "error" | "unconfigured">("loading");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [trafficOn, setTrafficOn] = useState(false);
  const trafficTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const state = useFacilityLiveStatus(facilityId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchFacilitiesList();
      if (cancelled) return;
      if (!result.ok) {
        setListStatus(result.error.code === "network" && result.error.retryable === false ? "unconfigured" : "error");
        return;
      }
      setFacilities(result.data);
      setListStatus("ready");
      if (result.data.length > 0) setFacilityId(result.data[0]!.facilityId);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function pushLog(request: Record<string, unknown>, result: { ok: boolean; status: number; data: unknown }) {
    setLog((prev) =>
      [
        { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, at: new Date().toISOString(), request, ok: result.ok, status: result.status, response: result.data },
        ...prev,
      ].slice(0, 50),
    );
  }

  async function simulate(space: FacilitySpace, body: { occupied?: boolean; status?: SpaceStatus }) {
    if (!space.sensor) return;
    const request = { sensor_id: space.sensor.sensorId, spot_id: space.spotId, ...body };
    const result = await callSimulator(request);
    pushLog(request, result);
  }

  // Realistic traffic: every few seconds, pick a random monitored space and
  // fire a plausible transition through the exact same simulate() call a
  // manual button click uses.
  useEffect(() => {
    if (!trafficOn || state.status !== "ready") {
      if (trafficTimer.current) clearTimeout(trafficTimer.current);
      return;
    }

    function tick() {
      if (state.status !== "ready") return;
      const candidates = state.facility.spaces.filter((s) => s.sensor);
      if (candidates.length > 0) {
        const space = candidates[Math.floor(Math.random() * candidates.length)]!;
        void simulate(space, { occupied: space.status !== "OCCUPIED" });
      }
      trafficTimer.current = setTimeout(tick, 3000 + Math.random() * 3000);
    }
    trafficTimer.current = setTimeout(tick, 1000);

    return () => {
      if (trafficTimer.current) clearTimeout(trafficTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trafficOn, state.status]);

  if (listStatus === "loading") {
    return (
      <Container size="default" className="grid min-h-[40dvh] place-items-center py-10">
        <Spinner label="Loading facilities" />
      </Container>
    );
  }
  if (listStatus === "unconfigured") {
    return (
      <Container size="default" className="py-10">
        <EmptyState icon={<IconBolt />} title="Live sensor data is not connected" description="This environment does not have a live sensor API configured." />
      </Container>
    );
  }
  if (listStatus === "error" || facilities.length === 0) {
    return (
      <Container size="default" className="py-10">
        <ErrorState title="No facilities to simulate" description="Seed a demo facility (DEMO_SEED=true) to use the simulator." />
      </Container>
    );
  }

  return (
    <Container size="default" className="py-8 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          eyebrow="Demo tool"
          title="Sensor Simulator"
          description="Every button below sends a real authenticated request to the same ingest endpoint an ESP32 sensor calls."
        />
        {state.status === "ready" ? <LiveBadge live={state.live} updatedAt={state.facility.updatedAt} /> : null}
      </div>

      <div className="mt-5 rounded-card border border-ink-200 bg-ink-50 p-4">
        <Switch
          label="Simulate realistic traffic"
          description="Fires a random space transition every few seconds."
          checked={trafficOn}
          onChange={setTrafficOn}
        />
      </div>

      {state.status === "loading" ? (
        <div className="grid place-items-center py-16">
          <Spinner label="Loading facility" />
        </div>
      ) : state.status === "error" ? (
        <ErrorState className="mt-6" title="Could not load facility" description={state.error.message} />
      ) : state.status === "ready" ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...state.facility.spaces]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((space) => (
              <div key={space.id} className="rounded-card border border-ink-200 bg-ink-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-extrabold text-ink-950">{space.displayName}</span>
                  <SpaceStatusBadge status={space.status} size="sm" />
                </div>
                <p className="mt-1 font-mono text-2xs text-ink-500">{space.sensor?.sensorId ?? "no sensor"}</p>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => simulate(space, { occupied: true })}>
                    Vehicle arrives
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => simulate(space, { occupied: false })}>
                    Vehicle leaves
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => simulate(space, { status: "OFFLINE" })}>
                    Set offline
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => simulate(space, { status: "AVAILABLE" })}>
                    Reset
                  </Button>
                </div>
              </div>
            ))}
        </div>
      ) : null}

      <div className="mt-10">
        <h2 className="text-lg font-bold text-ink-900">Request / response log</h2>
        <div className="mt-3 max-h-96 space-y-2 overflow-y-auto rounded-card border border-ink-200 bg-ink-50 p-3 font-mono text-2xs">
          {log.length === 0 ? (
            <p className="p-2 text-ink-500">No requests sent yet.</p>
          ) : (
            log.map((entry) => (
              <div
                key={entry.id}
                className={`rounded-lg border p-2.5 ${entry.ok ? "border-success-200 bg-success-50" : "border-danger-200 bg-danger-50"}`}
              >
                <p className="text-ink-500">
                  {new Date(entry.at).toLocaleTimeString()} · {entry.ok ? entry.status : `error ${entry.status}`}
                </p>
                <p className="mt-1 text-ink-700">→ {JSON.stringify(entry.request)}</p>
                <p className="mt-1 text-ink-600">← {JSON.stringify(entry.response)}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </Container>
  );
}
