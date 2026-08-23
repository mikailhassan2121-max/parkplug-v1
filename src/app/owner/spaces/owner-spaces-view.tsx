"use client";

import { useState } from "react";
import { useOwnerFacilities } from "@/lib/use-owner-facilities";
import { updateSpaceConfig } from "@/lib/api/sensors";
import type { FacilitySpace } from "@/lib/sensor-types";
import { SpaceStatusBadge } from "@/components/sensor/space-status-badge";
import { Badge } from "@/components/ui/badge";
import { Overlay } from "@/components/ui/overlay";
import { Field, Textarea, Checkbox } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { IconGarage } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type SpaceConfigPatch = { active?: boolean; reservable?: boolean; accessible?: boolean; restrictions?: string | null };
type SpaceOverride = { active?: boolean; reservable?: boolean; accessible?: boolean; restrictions?: string };

export function OwnerSpacesView() {
  const state = useOwnerFacilities();
  const facilities = state.status === "ready" ? state.facilities : [];
  const totalSpaces = facilities.reduce((sum, f) => sum + f.spaces.length, 0);
  const [overrides, setOverrides] = useState<Record<string, SpaceOverride>>({});
  const [editing, setEditing] = useState<{ facilityId: string; space: FacilitySpace } | null>(null);

  function applyOverride(spaceId: string, patch: SpaceConfigPatch) {
    setOverrides((prev) => ({
      ...prev,
      [spaceId]: { ...prev[spaceId], ...patch, restrictions: patch.restrictions ?? undefined },
    }));
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 sm:text-3xl">Parking spaces</h1>
      <p className="mt-1 text-sm text-ink-600">Every monitored space across your facilities.</p>

      <div className="mt-6">
        {state.status === "loading" ? (
          <div role="status" aria-busy="true" className="space-y-3">
            <span className="sr-only">Loading spaces</span>
            <Skeleton className="h-12 w-full" rounded="rounded-card" />
            <Skeleton className="h-12 w-full" rounded="rounded-card" />
          </div>
        ) : state.status === "error" ? (
          <ErrorState
            title="We could not load your spaces"
            description={state.error.message}
            actions={[{ label: "Try again", onClick: () => state.reload() }]}
          />
        ) : totalSpaces === 0 ? (
          <EmptyState icon={<IconGarage />} title="No spaces yet" description="Spaces will appear here once a facility is connected." />
        ) : (
          <div className="overflow-x-auto rounded-card border border-ink-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-ink-50 text-xs font-semibold uppercase tracking-wide text-ink-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Identifier</th>
                  <th scope="col" className="px-4 py-3">Facility</th>
                  <th scope="col" className="px-4 py-3">Sensor</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Configuration</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200 bg-white">
                {facilities.flatMap((facility) =>
                  [...facility.spaces]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((raw) => {
                      const space = { ...raw, ...overrides[raw.id] };
                      return (
                        <tr key={space.id} className={cn("transition-colors hover:bg-ink-50", !space.active && "opacity-60")}>
                          <td className="px-4 py-3 font-semibold text-ink-900">{space.displayName}</td>
                          <td className="px-4 py-3 text-ink-700">{facility.name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-ink-600">
                            {space.sensor?.sensorId ?? "Unassigned"}
                          </td>
                          <td className="px-4 py-3">
                            <SpaceStatusBadge status={space.status} size="sm" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              <Badge tone={space.active ? "success" : "neutral"} size="sm">
                                {space.active ? "Active" : "Inactive"}
                              </Badge>
                              {space.reservable ? <Badge tone="brand" size="sm">Reservable</Badge> : null}
                              {space.accessible ? <Badge tone="info" size="sm">Accessible</Badge> : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setEditing({ facilityId: facility.facilityId, space })}
                              className="text-xs font-bold text-teal hover:underline"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    }),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Overlay
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Configure ${editing.space.displayName}` : "Configure space"}
        size="sm"
      >
        {editing ? (
          <SpaceConfigForm
            facilityId={editing.facilityId}
            space={editing.space}
            onSaved={(patch) => {
              applyOverride(editing.space.id, patch);
              setEditing(null);
            }}
          />
        ) : null}
      </Overlay>
    </div>
  );
}

function SpaceConfigForm({
  facilityId,
  space,
  onSaved,
}: {
  facilityId: string;
  space: FacilitySpace;
  onSaved: (patch: SpaceConfigPatch) => void;
}) {
  const [active, setActive] = useState(space.active);
  const [reservable, setReservable] = useState(space.reservable);
  const [accessible, setAccessible] = useState(space.accessible);
  const [restrictions, setRestrictions] = useState(space.restrictions ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const patch: SpaceConfigPatch = {
      active,
      reservable,
      accessible,
      restrictions: restrictions.trim() ? restrictions.trim() : null,
    };
    const result = await updateSpaceConfig(facilityId, space.id, patch);
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    onSaved(patch);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? (
        <Alert tone="danger" live title="Could not save">
          {error}
        </Alert>
      ) : null}

      <p className="text-xs leading-relaxed text-ink-500">
        This only controls how the space is treated operationally. Live occupancy status still comes
        from the sensor and can&apos;t be set here.
      </p>

      <Checkbox
        label="Active — included in facility totals and availability counts"
        checked={active}
        onChange={(e) => setActive(e.target.checked)}
      />
      <Checkbox
        label="Reservable — can be booked through the marketplace"
        checked={reservable}
        onChange={(e) => setReservable(e.target.checked)}
      />
      <Checkbox
        label="Accessible parking space"
        checked={accessible}
        onChange={(e) => setAccessible(e.target.checked)}
      />

      <Field label="Restrictions" hint="Shown to drivers if this space is reservable. Optional.">
        <Textarea
          value={restrictions}
          onChange={(e) => setRestrictions(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder="e.g. Compact cars only, no overnight parking"
        />
      </Field>

      <Button type="submit" fullWidth loading={saving} loadingText="Saving…">
        Save changes
      </Button>
    </form>
  );
}
