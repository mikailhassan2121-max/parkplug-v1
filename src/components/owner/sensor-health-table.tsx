"use client";

import { useState } from "react";
import { formatSecondsAgo } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { SPACE_STATUS_LABEL, type FacilitySpace, type OccupancyEvent } from "@/lib/sensor-types";
import { buildSensorRows, type SensorRow } from "@/lib/owner-sensors";
import { Overlay } from "@/components/ui/overlay";
import { EmptyState } from "@/components/ui/feedback";
import { IconBolt, IconWifi, IconWifiOff } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const STATUS_CONFIG = {
  ONLINE: { icon: IconWifi, className: "bg-success-50 text-success-700 border-success-100", label: "Online" },
  OFFLINE: { icon: IconWifiOff, className: "bg-ink-100 text-ink-500 border-ink-200", label: "Offline" },
  ATTENTION: { icon: IconBolt, className: "bg-warning-50 text-warning-700 border-warning-100", label: "Attention" },
} as const;

function SensorStatusBadge({ status }: { status: SensorRow["status"] }) {
  const { icon: Icon, className, label } = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", className)}>
      <Icon className="text-sm" aria-hidden="true" />
      {label}
    </span>
  );
}

/**
 * Sensor table for one facility (used inside /owner/facilities/[id]'s
 * Sensors tab) or, via buildAllSensorRows, across every facility on
 * /owner/sensors. Never renders a token or any device secret — the API
 * response this reads from doesn't carry one.
 */
export function SensorHealthTable({
  spaces,
  facilityName,
  events = [],
  showFacilityColumn = false,
  rows: rowsProp,
}: {
  spaces?: FacilitySpace[];
  facilityName?: string;
  events?: OccupancyEvent[];
  showFacilityColumn?: boolean;
  /** Pre-built rows, for the cross-facility /owner/sensors table. */
  rows?: SensorRow[];
}) {
  const now = useNow(30_000);
  const [selected, setSelected] = useState<SensorRow | null>(null);

  const rows =
    rowsProp ?? (spaces && facilityName ? buildSensorRows({ facilityId: "", name: facilityName, spaces }) : []);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<IconBolt />}
        title="No sensors installed"
        description="Spaces without a sensor assigned will not appear here."
        compact
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-card border border-ink-200">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-ink-50 text-xs font-semibold uppercase tracking-wide text-ink-500">
            <tr>
              <th scope="col" className="px-4 py-3">Sensor</th>
              <th scope="col" className="px-4 py-3">Space</th>
              {showFacilityColumn ? <th scope="col" className="px-4 py-3">Facility</th> : null}
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Last seen</th>
              <th scope="col" className="px-4 py-3">Signal</th>
              <th scope="col" className="px-4 py-3">Occupancy</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-200 bg-white">
            {rows.map((row) => (
              <tr key={row.sensorId} className="transition-colors hover:bg-ink-50">
                <td className="px-4 py-3 font-mono text-xs text-ink-800">{row.sensorId}</td>
                <td className="px-4 py-3 font-semibold text-ink-900">{row.spaceName}</td>
                {showFacilityColumn ? <td className="px-4 py-3 text-ink-700">{row.facilityName}</td> : null}
                <td className="px-4 py-3"><SensorStatusBadge status={row.status} /></td>
                <td className="px-4 py-3 text-ink-600">{row.lastSeen ? formatSecondsAgo(row.lastSeen, now) : "Never"}</td>
                <td className="px-4 py-3 text-ink-600">
                  {row.signalStrength !== undefined ? row.signalStrength.toFixed(0) : "—"}
                </td>
                <td className="px-4 py-3 text-ink-700">{SPACE_STATUS_LABEL[row.spaceStatus]}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setSelected(row)}
                    className="text-xs font-bold text-teal hover:underline"
                  >
                    View details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Overlay open={selected !== null} onClose={() => setSelected(null)} title={selected?.sensorId ?? "Sensor"} size="sm">
        {selected ? <SensorDetail row={selected} events={events} /> : null}
      </Overlay>
    </>
  );
}

function SensorDetail({ row, events }: { row: SensorRow; events: OccupancyEvent[] }) {
  const now = useNow(1000);
  const recent = events.filter((e) => e.spotId === row.spotId).slice(0, 5);

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Field label="Sensor ID" value={row.sensorId} mono />
        <Field label="Device type" value={row.deviceType} />
        <Field label="Facility" value={row.facilityName} />
        <Field label="Space" value={row.spaceName} />
        <Field label="Status">
          <SensorStatusBadge status={row.status} />
        </Field>
        <Field label="Last seen" value={row.lastSeen ? formatSecondsAgo(row.lastSeen, now) : "Never"} />
        <Field label="Battery" value={row.batteryLevel !== undefined ? `${Math.round(row.batteryLevel * 100)}%` : "Not reported"} />
        <Field label="Signal" value={row.signalStrength !== undefined ? row.signalStrength.toFixed(0) : "Not reported"} />
        <Field label="Current occupancy" value={SPACE_STATUS_LABEL[row.spaceStatus]} />
      </dl>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Recent occupancy events</h3>
        <div className="mt-2">
          {recent.length === 0 ? (
            <p className="text-sm text-ink-500">No recent events recorded for this space.</p>
          ) : (
            <ul className="space-y-1.5 text-xs text-ink-700">
              {recent.map((e) => (
                <li key={e.id}>
                  {SPACE_STATUS_LABEL[e.previousStatus]} → {SPACE_STATUS_LABEL[e.newStatus]} ·{" "}
                  {formatSecondsAgo(e.occurredAt, now)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono, children }: { label: string; value?: string; mono?: boolean; children?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className={cn("mt-0.5 font-semibold text-ink-900", mono && "font-mono text-xs")}>{children ?? value}</dd>
    </div>
  );
}
