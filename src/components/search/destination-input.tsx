"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { geocode, getCurrentPosition, LOCATION_ERROR_COPY, type GeocodeMatch } from "@/lib/geo";
import { useDebounced } from "@/lib/use-async";
import type { Coordinates } from "@/lib/types";
import { IconCrosshair, IconMapPin, IconSpinner } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";

/**
 * Address field with live lookup. Implements the combobox pattern so the
 * suggestion list is reachable by keyboard and announced by screen readers.
 */
export function DestinationInput({
  value,
  onChange,
  onSelect,
  label = "Destination",
  placeholder = "Address, place, or neighborhood",
  required,
  error,
  autoFocus,
  size = "md",
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (match: { label: string; center: Coordinates }) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string | null;
  autoFocus?: boolean;
  size?: "md" | "lg";
}) {
  const uid = useId();
  const inputId = `dest-${uid}`;
  const listId = `dest-list-${uid}`;
  const { toast } = useToast();

  const [matches, setMatches] = useState<GeocodeMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [noMatches, setNoMatches] = useState(false);

  const debounced = useDebounced(value, 350);
  const rootRef = useRef<HTMLDivElement>(null);
  // Set while applying a chosen suggestion, so it does not re-trigger lookup.
  const suppressRef = useRef(false);

  useEffect(() => {
    if (suppressRef.current) {
      suppressRef.current = false;
      return;
    }
    if (debounced.trim().length < 3) {
      setMatches([]);
      setLookupFailed(false);
      setNoMatches(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setLookupFailed(false);
    setNoMatches(false);
    geocode(debounced, controller.signal)
      .then((results) => {
        setMatches(results);
        setOpen(results.length > 0);
        setNoMatches(results.length === 0);
        setActiveIndex(-1);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLookupFailed(true);
        setMatches([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [debounced]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function choose(match: GeocodeMatch) {
    suppressRef.current = true;
    // Trim the long administrative tail Nominatim appends.
    const short = match.label.split(",").slice(0, 3).join(",").trim();
    onChange(short);
    onSelect({ label: short, center: match.center });
    setOpen(false);
    setMatches([]);
    setNoMatches(false);
  }

  async function applyCurrentLocation() {
    setLocating(true);
    const result = await getCurrentPosition();
    setLocating(false);
    if (!result.ok) {
      const copy = LOCATION_ERROR_COPY[result.reason];
      toast({ tone: "warning", title: copy.title, description: copy.description });
      return;
    }
    setNoMatches(false);
    setLookupFailed(false);
    suppressRef.current = true;
    onChange("Your current location");
    onSelect({ label: "Your current location", center: result.center });
  }

  const heights = { md: "h-12", lg: "h-14" } as const;

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={inputId} className="block text-sm font-semibold text-ink-800">
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className="ml-0.5 text-danger-600">*</span>
            <span className="sr-only"> (required)</span>
          </>
        ) : null}
      </label>

      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 grid place-items-center text-lg text-ink-400">
          <IconMapPin />
        </span>
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          aria-describedby={error ? `${inputId}-err` : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          enterKeyHint="search"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => matches.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (!open || matches.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => (i + 1) % matches.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => (i - 1 + matches.length) % matches.length);
            } else if (e.key === "Enter" && activeIndex >= 0) {
              e.preventDefault();
              choose(matches[activeIndex]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className={cn(
            "w-full rounded-xl border bg-white pl-11 pr-24 text-[0.9375rem] text-ink-900",
            "placeholder:text-ink-400 transition-[border-color] duration-150",
            heights[size],
            error
              ? "border-danger-400 focus:border-danger-500"
              : "border-ink-300 hover:border-ink-400 focus:border-brand-500",
          )}
        />

        <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
          {loading ? (
            <IconSpinner className="animate-spin-slow text-ink-400" aria-hidden="true" />
          ) : null}
          <button
            type="button"
            onClick={() => void applyCurrentLocation()}
            disabled={locating}
            className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-brand-700
                       transition-colors hover:bg-brand-50 disabled:opacity-60"
          >
            {locating ? (
              <IconSpinner className="animate-spin-slow" aria-hidden="true" />
            ) : (
              <IconCrosshair aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{locating ? "Locating…" : "Use my location"}</span>
            <span className="sr-only sm:hidden">Use my current location</span>
          </button>
        </div>
      </div>

      {error ? (
        <p id={`${inputId}-err`} className="mt-1.5 text-xs font-medium text-danger-700">
          {error}
        </p>
      ) : null}

      {lookupFailed && !error ? (
        <p className="mt-1.5 text-xs text-warning-700">
          Address lookup is unavailable right now. You can still search by moving
          the map.
        </p>
      ) : null}

      {noMatches && !lookupFailed && !error ? (
        <p className="mt-1.5 text-xs text-ink-500">
          No matches for &ldquo;{value.trim()}&rdquo;. Try a different spelling, or use
          your current location instead.
        </p>
      ) : null}

      {open && matches.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Destination suggestions"
          className="absolute inset-x-0 top-[calc(100%+0.375rem)] z-50 max-h-72 overflow-y-auto overscroll-contain
                     rounded-xl border border-ink-200 bg-white py-1.5 shadow-e3 animate-scale-in"
        >
          {matches.map((match, index) => (
            <li key={`${match.label}-${index}`} id={`${listId}-${index}`} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onClick={() => choose(match)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition-colors",
                  index === activeIndex ? "bg-brand-50" : "hover:bg-ink-50",
                )}
              >
                <IconMapPin className="mt-0.5 shrink-0 text-ink-400" aria-hidden="true" />
                <span className="min-w-0 text-sm">
                  <span className="block truncate font-semibold text-ink-900">
                    {match.label.split(",")[0]}
                  </span>
                  <span className="block truncate text-xs text-ink-500">
                    {match.label.split(",").slice(1, 4).join(", ").trim()}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
