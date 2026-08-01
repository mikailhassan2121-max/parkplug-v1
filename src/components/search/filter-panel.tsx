"use client";

import { useEffect, useState } from "react";
import {
  AMENITIES,
  PARKING_TYPES,
  VEHICLE_SIZES,
  type Amenity,
  type ParkingType,
  type SearchFilters,
  type VehicleSize,
} from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Fieldset, Select, Switch, TogglePill } from "@/components/ui/form";
import { Drawer } from "@/components/ui/overlay";

const DISTANCES = [
  { value: 400, label: "Within 5 min walk" },
  { value: 800, label: "Within 10 min walk" },
  { value: 1600, label: "Within 1 mile" },
  { value: 5000, label: "Within 3 miles" },
  { value: 16000, label: "Within 10 miles" },
];

const PRICE_STEPS = [500, 1000, 1500, 2000, 3000, 5000];

/**
 * Filter editor. Changes are staged locally and only committed on Apply, so a
 * mistap never re-runs an expensive search.
 */
export function FilterPanel({
  open,
  onClose,
  filters,
  onApply,
  resultCount,
}: {
  open: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onApply: (next: SearchFilters) => void;
  resultCount: number;
}) {
  const [draft, setDraft] = useState<SearchFilters>(filters);

  // Re-sync when the panel is reopened after an external change.
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Filters"
      footer={
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() =>
              setDraft({
                includePaid: true,
                includeFree: true,
                availableNow: false,
                parkingTypes: [],
                amenities: [],
                instantBookOnly: false,
              })
            }
          >
            Clear All
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            Apply Filters
          </Button>
        </div>
      }
    >
      <div className="space-y-7">
        <Fieldset legend="Parking to show">
          <div className="space-y-3.5">
            {/*
              Turning both sources off would guarantee an empty map, so the
              last one enabled stays on.
            */}
            <Switch
              label="Reservable parking"
              description="Private spaces you can book in advance."
              checked={draft.includePaid}
              onChange={(v) =>
                setDraft((d) => ({ ...d, includePaid: v, includeFree: v ? d.includeFree : true }))
              }
            />
            <Switch
              label="Free parking reports"
              description="Public spaces recently observed by the community."
              checked={draft.includeFree}
              onChange={(v) =>
                setDraft((d) => ({ ...d, includeFree: v, includePaid: v ? d.includePaid : true }))
              }
            />
            <Switch
              label="Available now"
              description="Only show parking open at this moment."
              checked={draft.availableNow}
              onChange={(v) => setDraft((d) => ({ ...d, availableNow: v }))}
            />
            <Switch
              label="Instant booking only"
              description="Skip spaces that need host approval."
              checked={draft.instantBookOnly}
              onChange={(v) => setDraft((d) => ({ ...d, instantBookOnly: v }))}
            />
          </div>
        </Fieldset>

        <Field label="Maximum hourly price">
          <Select
            value={draft.maxPriceCents ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                maxPriceCents: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
          >
            <option value="">Any price</option>
            {PRICE_STEPS.map((cents) => (
              <option key={cents} value={cents}>
                Up to {formatMoney(cents)}/hr
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Distance from destination">
          <Select
            value={draft.maxDistanceMeters ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                maxDistanceMeters: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
          >
            <option value="">Any distance</option>
            {DISTANCES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </Field>

        <Fieldset legend="Parking type">
          <ul className="flex flex-wrap gap-2">
            {PARKING_TYPES.map((type) => (
              <li key={type.value}>
                <TogglePill
                  pressed={draft.parkingTypes.includes(type.value)}
                  onToggle={() =>
                    setDraft((d) => ({
                      ...d,
                      parkingTypes: toggle<ParkingType>(d.parkingTypes, type.value),
                    }))
                  }
                >
                  {type.label}
                </TogglePill>
              </li>
            ))}
          </ul>
        </Fieldset>

        <Fieldset legend="Amenities">
          <ul className="flex flex-wrap gap-2">
            {AMENITIES.map((amenity) => (
              <li key={amenity.value}>
                <TogglePill
                  pressed={draft.amenities.includes(amenity.value)}
                  onToggle={() =>
                    setDraft((d) => ({
                      ...d,
                      amenities: toggle<Amenity>(d.amenities, amenity.value),
                    }))
                  }
                >
                  {amenity.label}
                </TogglePill>
              </li>
            ))}
          </ul>
        </Fieldset>

        <Field label="Vehicle size" hint="Only shows spaces that fit this size or larger.">
          <Select
            value={draft.vehicleSize ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                vehicleSize: (e.target.value || undefined) as VehicleSize | undefined,
              }))
            }
          >
            <option value="">Any vehicle</option>
            {VEHICLE_SIZES.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label} — {size.hint}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Minimum height clearance" hint="Leave blank if your vehicle has no roof load.">
          <Select
            value={draft.minHeightClearanceCm ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                minHeightClearanceCm: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
          >
            <option value="">No requirement</option>
            {[180, 200, 220, 250, 300].map((cm) => (
              <option key={cm} value={cm}>
                At least {cm} cm ({(cm / 30.48).toFixed(1)} ft)
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Minimum rating">
          <Select
            value={draft.minRating ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                minRating: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
          >
            <option value="">Any rating</option>
            {[3, 3.5, 4, 4.5].map((r) => (
              <option key={r} value={r}>
                {r}+ stars
              </option>
            ))}
          </Select>
        </Field>

        <p className="rounded-lg bg-ink-50 px-3 py-2.5 text-xs text-ink-600" aria-live="polite">
          {resultCount === 0
            ? "No parking matches your current filters."
            : `${resultCount} ${resultCount === 1 ? "result" : "results"} with your current filters.`}
        </p>
      </div>
    </Drawer>
  );
}
