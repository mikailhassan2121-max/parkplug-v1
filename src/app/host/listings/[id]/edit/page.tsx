"use client";

import { use, useEffect, useState } from "react";
import { listings as listingsApi, type StoredListing } from "@/lib/api";
import { AMENITIES, VEHICLE_SIZES, type Amenity, type VehicleSize } from "@/lib/types";
import { DAY_SHORT } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/badge";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { Field, Fieldset, Input, Select, Textarea, TogglePill } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { IconEye } from "@/components/ui/icons";
import { PhotoUploader } from "@/components/host/photo-uploader";

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const state = useAsync(async () => {
    const result = await listingsApi.listForHost();
    if (!result.ok) return result;
    const found = result.data.find((l) => l.id === id);
    return found
      ? ({ ok: true, data: found } as const)
      : ({ ok: false, error: { code: "not_found" as const, message: "That listing does not exist." } } as const);
  }, [id]);

  if (state.status === "loading") {
    return <Skeleton className="h-96 w-full" rounded="rounded-card" />;
  }
  if (state.status === "error") {
    return (
      <ErrorState
        title="Listing not found"
        description={state.error.message}
        actions={[{ label: "Back to listings", href: "/host/listings" }]}
      />
    );
  }
  return <EditForm listing={state.data} onSaved={state.reload} />;
}

function EditForm({ listing, onSaved }: { listing: StoredListing; onSaved: () => void }) {
  const { toast } = useToast();
  const [draft, setDraft] = useState(listing);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => setDraft(listing), [listing]);

  function patch(next: Partial<StoredListing>) {
    setDraft((d) => ({ ...d, ...next }));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    const result = await listingsApi.update(listing.id, draft);
    setSaving(false);
    if (result.ok) {
      setDirty(false);
      toast({ tone: "success", title: "Listing updated" });
      onSaved();
    } else {
      toast({ tone: "error", title: "Could not save", description: result.error.message });
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Edit listing</h1>
          <div className="mt-2 flex items-center gap-3">
            <StatusBadge status={draft.status} size="sm" />
            <span className="text-sm text-ink-600">{draft.title}</span>
          </div>
        </div>
        <ButtonLink href={`/spaces/${listing.slug}`} variant="secondary" leadingIcon={<IconEye />}>
          Preview
        </ButtonLink>
      </div>

      <Alert tone="warning" className="mt-6" title="Changes can affect existing reservations">
        Reservations that are already confirmed keep the price and rules that
        applied when they were booked. Reducing availability does not cancel them
        — cancel from your reservations page if you truly cannot host.
      </Alert>

      <div className="mt-8 space-y-6">
        <Section title="Basics">
          <div className="space-y-5">
            <Field label="Listing title" required>
              <Input value={draft.title} onChange={(e) => patch({ title: e.target.value })} maxLength={80} />
            </Field>
            <Field label="Description" required>
              <Textarea
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
                maxLength={1200}
              />
            </Field>
          </div>
        </Section>

        <Section title="Photos">
          <PhotoUploader photos={draft.photos} onChange={(photos) => patch({ photos })} />
        </Section>

        <Section title="Pricing">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Hourly price" required>
              <Input
                type="number"
                min={0}
                step="0.25"
                inputMode="decimal"
                value={(draft.pricePerHourCents / 100).toString()}
                onChange={(e) => patch({ pricePerHourCents: Math.round(Number(e.target.value) * 100) })}
                leadingIcon={<span className="text-sm font-semibold">$</span>}
              />
            </Field>
            <Field label="Daily maximum" optional>
              <Input
                type="number"
                min={0}
                step="0.5"
                inputMode="decimal"
                value={draft.dailyMaxCents ? (draft.dailyMaxCents / 100).toString() : ""}
                onChange={(e) =>
                  patch({
                    dailyMaxCents: e.target.value ? Math.round(Number(e.target.value) * 100) : undefined,
                  })
                }
                leadingIcon={<span className="text-sm font-semibold">$</span>}
              />
            </Field>
          </div>
        </Section>

        <Section title="Availability">
          <ul className="space-y-2.5">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => {
              const window = draft.availability.find((w) => w.dayOfWeek === day);
              return (
                <li key={day} className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 p-3">
                  <label className="flex min-w-24 items-center gap-2.5 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={Boolean(window)}
                      onChange={(e) =>
                        patch({
                          availability: e.target.checked
                            ? [...draft.availability, { dayOfWeek: day, startTime: "08:00", endTime: "18:00" }]
                            : draft.availability.filter((w) => w.dayOfWeek !== day),
                        })
                      }
                      className="h-4.5 w-4.5 rounded"
                    />
                    {DAY_SHORT[day]}
                  </label>
                  {window ? (
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        type="time"
                        size="sm"
                        aria-label={`${DAY_SHORT[day]} start`}
                        value={window.startTime}
                        onChange={(e) =>
                          patch({
                            availability: draft.availability.map((w) =>
                              w.dayOfWeek === day ? { ...w, startTime: e.target.value } : w,
                            ),
                          })
                        }
                      />
                      <span aria-hidden="true" className="text-ink-400">–</span>
                      <Input
                        type="time"
                        size="sm"
                        aria-label={`${DAY_SHORT[day]} end`}
                        value={window.endTime}
                        onChange={(e) =>
                          patch({
                            availability: draft.availability.map((w) =>
                              w.dayOfWeek === day ? { ...w, endTime: e.target.value } : w,
                            ),
                          })
                        }
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-ink-400">Unavailable</span>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>

        <Section title="Vehicle restrictions and amenities">
          <div className="space-y-5">
            <Field label="Largest vehicle that fits" required>
              <Select
                value={draft.maxVehicleSize}
                onChange={(e) => patch({ maxVehicleSize: e.target.value as VehicleSize })}
              >
                {VEHICLE_SIZES.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label} — {size.hint}
                  </option>
                ))}
              </Select>
            </Field>
            <Fieldset legend="Amenities">
              <ul className="flex flex-wrap gap-2">
                {AMENITIES.map((amenity) => (
                  <li key={amenity.value}>
                    <TogglePill
                      pressed={draft.amenities.includes(amenity.value)}
                      onToggle={() =>
                        patch({
                          amenities: draft.amenities.includes(amenity.value)
                            ? draft.amenities.filter((a: Amenity) => a !== amenity.value)
                            : [...draft.amenities, amenity.value],
                        })
                      }
                    >
                      {amenity.label}
                    </TogglePill>
                  </li>
                ))}
              </ul>
            </Fieldset>
          </div>
        </Section>

        <Section title="Rules and instructions">
          <div className="space-y-5">
            <Field label="Parking rules" optional hint="One rule per line.">
              <Textarea
                value={draft.rules.join("\n")}
                onChange={(e) => patch({ rules: e.target.value.split("\n") })}
                maxLength={800}
              />
            </Field>
            <Field
              label="Private entry instructions"
              optional
              hint="Only shared with drivers who have a confirmed reservation."
            >
              <Textarea
                value={draft.privateInstructions}
                onChange={(e) => patch({ privateInstructions: e.target.value })}
                maxLength={900}
              />
            </Field>
          </div>
        </Section>
      </div>

      {/* Sticky save bar so the action is always reachable on long forms. */}
      <div className="sticky bottom-0 mt-8 -mx-4 border-t border-ink-200 bg-white/97 px-4 py-3 backdrop-blur-sm safe-bottom sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-500" aria-live="polite">
            {dirty ? "You have unsaved changes." : "All changes saved."}
          </p>
          <div className="flex gap-2">
            <ButtonLink href="/host/listings" variant="secondary">
              Back to listings
            </ButtonLink>
            <Button onClick={() => void save()} loading={saving} loadingText="Saving…" disabled={!dirty}>
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-ink-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
