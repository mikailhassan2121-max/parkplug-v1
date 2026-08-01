"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { toDateInput, toIso, toTimeInput } from "@/lib/format";
import { serializeSearchQuery, validateDateRange } from "@/lib/search-params";
import { DEFAULT_FILTERS, VEHICLE_SIZES, type Coordinates, type VehicleSize } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { IconSearch } from "@/components/ui/icons";
import { DestinationInput } from "./destination-input";

/** Default window: the next whole hour, for four hours. */
function defaultWindow() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 4 * 3600_000);
  return { start, end };
}

export type SearchModuleProps = {
  initial?: {
    destination?: string;
    center?: Coordinates;
    startAt?: string;
    endAt?: string;
    vehicleSize?: VehicleSize;
  };
  /** `hero` stacks generously; `compact` is the in-page bar on /search. */
  layout?: "hero" | "compact";
  onSubmitted?: () => void;
  className?: string;
};

export function SearchModule({
  initial,
  layout = "hero",
  onSubmitted,
  className,
}: SearchModuleProps) {
  const router = useRouter();
  const fallback = defaultWindow();

  const [destination, setDestination] = useState(initial?.destination ?? "");
  const [center, setCenter] = useState<Coordinates | undefined>(initial?.center);
  const [startDate, setStartDate] = useState(
    toDateInput(initial?.startAt ?? fallback.start.toISOString()),
  );
  const [startTime, setStartTime] = useState(
    toTimeInput(initial?.startAt ?? fallback.start.toISOString()),
  );
  const [endDate, setEndDate] = useState(toDateInput(initial?.endAt ?? fallback.end.toISOString()));
  const [endTime, setEndTime] = useState(toTimeInput(initial?.endAt ?? fallback.end.toISOString()));
  const [vehicleSize, setVehicleSize] = useState<VehicleSize | "">(initial?.vehicleSize ?? "");

  const [errors, setErrors] = useState<{ destination?: string; range?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const startAt = toIso(startDate, startTime);
  const endAt = toIso(endDate, endTime);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors: typeof errors = {};
    if (!center) {
      nextErrors.destination = destination.trim()
        ? "Choose a destination from the suggestions so we know where to search."
        : "Enter where you are going.";
    }
    const rangeError = validateDateRange(startAt, endAt);
    if (rangeError) nextErrors.range = rangeError;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const qs = serializeSearchQuery({
      destination,
      center,
      startAt,
      endAt,
      vehicleSize: vehicleSize || undefined,
      sort: "recommended",
      filters: { ...DEFAULT_FILTERS, vehicleSize: vehicleSize || undefined },
    });
    onSubmitted?.();
    router.push(`/search?${qs}`);
  }

  const isHero = layout === "hero";

  return (
    <form
      onSubmit={submit}
      noValidate
      className={cn(
        isHero
          ? "rounded-2xl border border-ink-200 bg-white p-4 shadow-e3 sm:p-5"
          : "rounded-xl border border-ink-200 bg-white p-3",
        className,
      )}
      aria-label="Search for parking"
    >
      <div className={cn("grid gap-3", isHero ? "sm:gap-4" : "")}>
        <DestinationInput
          value={destination}
          onChange={(next) => {
            setDestination(next);
            setCenter(undefined);
            setErrors((e) => ({ ...e, destination: undefined }));
          }}
          onSelect={(match) => {
            setCenter(match.center);
            setErrors((e) => ({ ...e, destination: undefined }));
          }}
          error={errors.destination}
          size={isHero ? "lg" : "md"}
          required
        />

        {/*
          Arrival and departure each get a full row. Squeezing both pairs onto
          one row leaves the native date control too narrow, and Chromium
          truncates the year rather than shrinking its own picker chrome.
        */}
        <div className="grid gap-3 sm:gap-4">
          <fieldset className="min-w-0">
            <legend className="text-sm font-semibold text-ink-800">Arrival</legend>
            <div className="mt-1.5 grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-2">
              <Input
                type="date"
                aria-label="Arrival date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                size={isHero ? "lg" : "md"}
              />
              <Input
                type="time"
                aria-label="Arrival time"
                step={900}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                size={isHero ? "lg" : "md"}
              />
            </div>
          </fieldset>

          <fieldset className="min-w-0">
            <legend className="text-sm font-semibold text-ink-800">Departure</legend>
            <div className="mt-1.5 grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-2">
              <Input
                type="date"
                aria-label="Departure date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                size={isHero ? "lg" : "md"}
              />
              <Input
                type="time"
                aria-label="Departure time"
                step={900}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                size={isHero ? "lg" : "md"}
              />
            </div>
          </fieldset>
        </div>

        {errors.range ? (
          <p role="alert" className="text-xs font-medium text-danger-700">
            {errors.range}
          </p>
        ) : null}

        <div className={cn("grid gap-3 sm:gap-4", isHero && "sm:grid-cols-[minmax(0,1fr)_auto]")}>
          <Field label="Vehicle size" optional>
            <Select
              value={vehicleSize}
              onChange={(e) => setVehicleSize(e.target.value as VehicleSize | "")}
              size={isHero ? "lg" : "md"}
            >
              <option value="">Any vehicle</option>
              {VEHICLE_SIZES.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label} — {size.hint}
                </option>
              ))}
            </Select>
          </Field>

          <div className={cn(isHero && "flex items-end")}>
            <Button
              type="submit"
              size={isHero ? "lg" : "md"}
              fullWidth
              loading={submitting}
              loadingText="Searching…"
              leadingIcon={<IconSearch />}
              className={cn(isHero && "sm:w-auto sm:px-8")}
            >
              Search
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
