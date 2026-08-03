"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { business } from "@/config/business";
import { listings as listingsApi } from "@/lib/api";
import { estimateHostEarnings } from "@/lib/api/pricing";
import { readRecord, writeRecord } from "@/lib/api/store";
import { geocode } from "@/lib/geo";
import { DAY_SHORT, formatClock, formatMoney } from "@/lib/format";
import { useUnsavedChangesWarning } from "@/lib/use-async";
import {
  AMENITIES,
  PARKING_TYPES,
  VEHICLE_SIZES,
  type Amenity,
  type Coordinates,
  type ListingPhoto,
  type ParkingType,
  type SurfaceType,
  type VehicleSize,
} from "@/lib/types";
import { Container } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Checkbox,
  Field,
  Fieldset,
  FormErrorSummary,
  Input,
  RadioCard,
  Select,
  Switch,
  Textarea,
  TogglePill,
} from "@/components/ui/form";
import { Stepper } from "@/components/ui/menu";
import { ConfirmDialog } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import {
  IconAlert,
  IconArrowLeft,
  IconBuilding,
  IconCar,
  IconCheckCircle,
  IconGarage,
  IconHome,
  IconLock,
  IconMapPin,
} from "@/components/ui/icons";
import { ParkingMap } from "@/components/map/parking-map";
import { PhotoUploader } from "@/components/host/photo-uploader";

const STEPS = [
  "Location",
  "Parking type",
  "Space details",
  "Photos",
  "Availability",
  "Pricing",
  "Instructions",
  "Confirmations",
  "Review",
];

const DRAFT_KEY = "listing-draft";

type DaySchedule = { enabled: boolean; start: string; end: string };

type Draft = {
  street: string;
  unit: string;
  city: string;
  state: string;
  postalCode: string;
  center: Coordinates | null;
  parkingType: ParkingType | "";
  title: string;
  description: string;
  spacesTotal: number;
  maxVehicleSize: VehicleSize | "";
  heightClearanceCm: string;
  surface: SurfaceType | "";
  entranceNotes: string;
  accessibilityNotes: string;
  amenities: Amenity[];
  photos: ListingPhoto[];
  schedule: DaySchedule[];
  sameHoursAllDays: boolean;
  blackoutDates: string[];
  minimumMinutes: number;
  maximumMinutes: number;
  advanceNoticeMinutes: number;
  bufferMinutes: number;
  startDate: string;
  endDate: string;
  pricePerHour: string;
  dailyMax: string;
  entryInstructions: string;
  parkingInstructions: string;
  exitInstructions: string;
  accessCode: string;
  rules: string;
  restrictedAreas: string;
  contactPreference: string;
  emergencyNotes: string;
  confirmations: {
    ownership: boolean;
    propertyRules: boolean;
    safe: boolean;
    emergencyAccess: boolean;
    accurateAvailability: boolean;
    truthful: boolean;
  };
};

const EMPTY_DRAFT: Draft = {
  street: "",
  unit: "",
  city: "",
  state: "",
  postalCode: "",
  center: null,
  parkingType: "",
  title: "",
  description: "",
  spacesTotal: 1,
  maxVehicleSize: "",
  heightClearanceCm: "",
  surface: "",
  entranceNotes: "",
  accessibilityNotes: "",
  amenities: [],
  photos: [],
  schedule: Array.from({ length: 7 }, () => ({ enabled: false, start: "08:00", end: "18:00" })),
  sameHoursAllDays: true,
  blackoutDates: [],
  minimumMinutes: 60,
  maximumMinutes: 1440,
  advanceNoticeMinutes: 60,
  bufferMinutes: 0,
  startDate: "",
  endDate: "",
  pricePerHour: "",
  dailyMax: "",
  entryInstructions: "",
  parkingInstructions: "",
  exitInstructions: "",
  accessCode: "",
  rules: "",
  restrictedAreas: "",
  contactPreference: "message",
  emergencyNotes: "",
  confirmations: {
    ownership: false,
    propertyRules: false,
    safe: false,
    emergencyAccess: false,
    accurateAvailability: false,
    truthful: false,
  },
};

const TYPE_ICONS: Record<ParkingType, React.ReactNode> = {
  driveway: <IconHome />,
  garage: <IconGarage />,
  private_lot: <IconCar />,
  apartment_space: <IconBuilding />,
  business_lot: <IconBuilding />,
  organization_lot: <IconBuilding />,
  other: <IconMapPin />,
};

type FieldError = { field: string; message: string };

export function ListingWizard() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; fieldErrors?: Record<string, string> } | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [restored, setRestored] = useState(false);
  const [photosDropped, setPhotosDropped] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const summaryRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const patch = useCallback((next: Partial<Draft>) => setDraft((d) => ({ ...d, ...next })), []);

  /* --------------------------- Draft persistence -------------------------- */

  useEffect(() => {
    const stored = readRecord<{ draft: Draft; step: number }>(DRAFT_KEY);
    if (stored?.draft) {
      // Older drafts (saved before uploads went through the real media
      // endpoint) can have photos stored as inline base64 data: URLs. They
      // still render fine locally — a browser displays a data: URL like any
      // other image — but the server now rejects them outright (a photo's
      // URL must come from our own upload endpoint), which used to surface
      // as a generic "check the highlighted fields" error with nothing
      // actually highlighted. Strip them here instead, so the photos step's
      // existing "add at least one photo" validation catches it honestly.
      const hasStalePhotos = stored.draft.photos?.some((p) => p.url.startsWith("data:"));
      const restoredDraft: Draft = {
        ...EMPTY_DRAFT,
        ...stored.draft,
        photos: hasStalePhotos ? stored.draft.photos.filter((p) => !p.url.startsWith("data:")) : stored.draft.photos,
      };
      setDraft(restoredDraft);
      setStep(Math.min(stored.step ?? 0, STEPS.length - 1));
      setRestored(true);
      setPhotosDropped(Boolean(hasStalePhotos));
    }
  }, []);

  const saveDraft = useCallback(() => {
    writeRecord(DRAFT_KEY, { draft, step });
  }, [draft, step]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(EMPTY_DRAFT);
  useUnsavedChangesWarning(dirty && !submitting);

  /* ------------------------------ Geocoding ------------------------------ */

  async function confirmOnMap() {
    const query = [draft.street, draft.city, draft.state, draft.postalCode]
      .filter(Boolean)
      .join(", ");
    if (query.length < 6) {
      setGeocodeError("Enter a street address, city, and state first.");
      return;
    }
    setGeocoding(true);
    setGeocodeError(null);
    try {
      const matches = await geocode(query);
      if (matches.length === 0) {
        setGeocodeError("We could not find that address. Check the spelling, or adjust the pin after continuing.");
      } else {
        patch({ center: matches[0].center });
      }
    } catch {
      setGeocodeError("Address lookup is unavailable right now. You can continue and set the location later.");
    } finally {
      setGeocoding(false);
    }
  }

  /* ------------------------------ Validation ----------------------------- */

  function validate(index: number): FieldError[] {
    const found: FieldError[] = [];
    const d = draft;

    if (index === 0) {
      if (!d.street.trim()) found.push({ field: "street", message: "Enter the street address." });
      if (!d.city.trim()) found.push({ field: "city", message: "Enter the city." });
      if (!d.state.trim()) found.push({ field: "state", message: "Enter the state." });
      if (!d.postalCode.trim()) found.push({ field: "postalCode", message: "Enter the ZIP code." });
      if (!d.center) found.push({ field: "center", message: "Confirm the location on the map." });
    }
    if (index === 1 && !d.parkingType) {
      found.push({ field: "parkingType", message: "Choose the kind of parking you are listing." });
    }
    if (index === 2) {
      if (!d.title.trim()) found.push({ field: "title", message: "Give your listing a title." });
      else if (d.title.trim().length < 8)
        found.push({ field: "title", message: "Make the title a little more descriptive." });
      if (!d.description.trim()) found.push({ field: "description", message: "Describe the space." });
      else if (d.description.trim().length < 40)
        found.push({ field: "description", message: "Add a bit more detail so drivers know what to expect." });
      if (!d.maxVehicleSize)
        found.push({ field: "maxVehicleSize", message: "Choose the largest vehicle that fits." });
      if (d.spacesTotal < 1) found.push({ field: "spacesTotal", message: "List at least one space." });
    }
    if (index === 3) {
      if (d.photos.length === 0)
        found.push({ field: "photos", message: "Add at least one photo of the space." });
      if (d.photos.some((p) => !p.alt.trim()))
        found.push({ field: "alt", message: "Describe each photo so it works for screen readers." });
    }
    if (index === 4) {
      if (!d.schedule.some((s) => s.enabled))
        found.push({ field: "schedule", message: "Choose at least one day the space is available." });
      d.schedule.forEach((s, i) => {
        if (s.enabled && s.end <= s.start) {
          found.push({ field: `day-${i}`, message: `${DAY_SHORT[i]}: the end time must be after the start time.` });
        }
      });
      if (d.maximumMinutes < d.minimumMinutes)
        found.push({ field: "duration", message: "The maximum reservation must be at least the minimum." });
    }
    if (index === 5) {
      const price = Number(d.pricePerHour);
      if (!d.pricePerHour.trim()) found.push({ field: "price", message: "Set an hourly price." });
      else if (!Number.isFinite(price) || price <= 0)
        found.push({ field: "price", message: "Enter a price greater than zero." });
      if (d.dailyMax.trim()) {
        const max = Number(d.dailyMax);
        if (!Number.isFinite(max) || max <= 0)
          found.push({ field: "dailyMax", message: "Enter a valid daily maximum, or leave it blank." });
      }
    }
    if (index === 6) {
      if (!d.entryInstructions.trim())
        found.push({ field: "entry", message: "Tell drivers how to enter." });
      if (!d.parkingInstructions.trim())
        found.push({ field: "parking", message: "Tell drivers exactly where to park." });
    }
    if (index === 7) {
      const c = d.confirmations;
      if (!c.ownership) found.push({ field: "ownership", message: "Confirm you own or have permission to list this space." });
      if (!c.propertyRules) found.push({ field: "propertyRules", message: "Confirm the listing does not violate property rules." });
      if (!c.safe) found.push({ field: "safe", message: "Confirm the space is safe and accessible." });
      if (!c.emergencyAccess) found.push({ field: "emergencyAccess", message: "Confirm the space does not block emergency access." });
      if (!c.accurateAvailability) found.push({ field: "accurateAvailability", message: "Confirm you will keep availability accurate." });
      if (!c.truthful) found.push({ field: "truthful", message: "Confirm the listing information is truthful." });
    }

    return found;
  }

  // Errors are set once, on a failed "Continue" or submit — without this,
  // fixing a field (e.g. entering a ZIP code, attaching a photo) left its
  // error message and the summary banner on screen until the next click,
  // even though the field was already valid again. Re-checks only the
  // fields already flagged, so it can't surface a *new* error before the
  // user has tried to move on.
  useEffect(() => {
    if (errors.length === 0) return;
    const stillInvalid = new Set(validate(step).map((e) => e.field));
    setErrors((prev) => prev.filter((e) => stillInvalid.has(e.field)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  function next() {
    const found = validate(step);
    setErrors(found);
    if (found.length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    if (step === STEPS.length - 1) {
      void submit();
      return;
    }
    setStep((s) => s + 1);
    saveDraft();
  }

  /* -------------------------------- Submit ------------------------------- */

  async function submit() {
    if (submitting) return;

    // Re-run every step so a skipped field cannot slip through.
    const allErrors = STEPS.flatMap((_, i) => validate(i));
    if (allErrors.length > 0) {
      setErrors(allErrors);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const priceCents = Math.round(Number(draft.pricePerHour) * 100);
    const result = await listingsApi.create({
      draft: {
        street: draft.street,
        city: draft.city,
        state: draft.state,
        center: draft.center as Coordinates,
        title: draft.title.trim(),
        description: draft.description.trim(),
        parkingType: draft.parkingType as ParkingType,
        photos: draft.photos,
        pricePerHourCents: priceCents,
        dailyMaxCents: draft.dailyMax ? Math.round(Number(draft.dailyMax) * 100) : undefined,
        currency: "USD",
        spacesTotal: draft.spacesTotal,
        maxVehicleSize: draft.maxVehicleSize as VehicleSize,
        heightClearanceCm: draft.heightClearanceCm ? Number(draft.heightClearanceCm) : undefined,
        amenities: draft.amenities,
        surface: draft.surface || undefined,
        entranceNotes: draft.entranceNotes || undefined,
        accessibilityNotes: draft.accessibilityNotes || undefined,
        minimumMinutes: draft.minimumMinutes,
        maximumMinutes: draft.maximumMinutes,
        advanceNoticeMinutes: draft.advanceNoticeMinutes,
        availability: draft.schedule
          .map((s, dayOfWeek) => ({ ...s, dayOfWeek }))
          .filter((s) => s.enabled)
          .map((s) => ({ dayOfWeek: s.dayOfWeek, startTime: s.start, endTime: s.end })),
        rules: draft.rules
          .split("\n")
          .map((r) => r.trim())
          .filter(Boolean),
        cancellationPolicy: {
          id: "standard",
          label: "Standard",
          summary: "Free cancellation up to 1 hour before your arrival time.",
          fullRefundHoursBefore: 1,
        },
        instantBook: true,
        privateAddress: {
          line1: draft.street.trim(),
          line2: draft.unit.trim() || undefined,
          city: draft.city.trim(),
          state: draft.state.trim(),
          postalCode: draft.postalCode.trim(),
          country: "US",
        },
        privateInstructions: [
          draft.entryInstructions && `Entry: ${draft.entryInstructions}`,
          draft.parkingInstructions && `Where to park: ${draft.parkingInstructions}`,
          draft.exitInstructions && `Leaving: ${draft.exitInstructions}`,
          draft.accessCode && `Access: ${draft.accessCode}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    });

    setSubmitting(false);

    if (result.ok) {
      writeRecord(DRAFT_KEY, null);
      toast({
        tone: "success",
        title: "Listing submitted",
        description: "We will let you know once it has been reviewed.",
      });
      router.push("/host/listings?submitted=1");
    } else {
      setSubmitError({ message: result.error.message, fieldErrors: result.error.fieldErrors });
    }
  }

  const err = (field: string) => errors.find((e) => e.field === field)?.message ?? null;
  const priceNumber = Number(draft.pricePerHour);
  const earnings = Number.isFinite(priceNumber) && priceNumber > 0
    ? estimateHostEarnings(Math.round(priceNumber * 100), 1)
    : null;

  return (
    <div className="flex min-h-dvh flex-col bg-ink-50/60">
      {/* --------------------------------------------------------- Top bar */}
      <div className="sticky top-16 z-50 border-b border-ink-200 bg-white lg:top-18">
        <Container size="default" className="py-3">
          <div className="flex items-center justify-between gap-4">
            <Link href="/host" aria-label="ParkPlugs hosting" className="hidden rounded-lg sm:block">
              <Logo showWordmark={false} />
            </Link>
            <div className="min-w-0 flex-1 sm:px-4">
              <Stepper steps={STEPS} current={step} onStepClick={(i) => setStep(i)} />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                saveDraft();
                setExitOpen(true);
              }}
              className="shrink-0"
            >
              Save &amp; exit
            </Button>
          </div>
        </Container>
      </div>

      <Container size="default" className="flex-1 py-8">
        <h1 ref={headingRef} tabIndex={-1} className="sr-only">
          List your space — step {step + 1} of {STEPS.length}: {STEPS[step]}
        </h1>

        {restored && step === 0 ? (
          <Alert tone="info" className="mb-6" title="We restored your draft">
            You can pick up where you left off, or{" "}
            <button
              type="button"
              className="font-bold underline underline-offset-2"
              onClick={() => {
                setDraft(EMPTY_DRAFT);
                setRestored(false);
                writeRecord(DRAFT_KEY, null);
              }}
            >
              start over
            </button>
            .
          </Alert>
        ) : null}

        {photosDropped ? (
          <Alert tone="warning" className="mb-6" title="Please re-add your photos">
            The photos in your saved draft could not be restored. Add them
            again on the Photos step before you submit.
          </Alert>
        ) : null}

        {errors.length > 0 ? (
          <div ref={summaryRef} tabIndex={-1} className="mb-6 focus:outline-none">
            <FormErrorSummary errors={errors} />
          </div>
        ) : null}

        {submitError ? (
          <Alert tone="danger" live title="Your listing could not be submitted" className="mb-6">
            <p>{submitError.message}</p>
            {submitError.fieldErrors && Object.keys(submitError.fieldErrors).length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {Object.entries(submitError.fieldErrors).map(([field, message]) => (
                  <li key={field}>{message}</li>
                ))}
              </ul>
            ) : null}
            <p className="mt-2 font-medium">Your draft has been saved — nothing was lost.</p>
          </Alert>
        ) : null}

        <div className="rounded-card border border-ink-200 bg-white p-5 sm:p-7">
          {step === 0 ? (
            <StepBlock
              title="Where is your parking space?"
              description="Your full address stays private. The public map shows only an approximate area."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Street address" required error={err("street")} className="sm:col-span-2">
                  <Input
                    value={draft.street}
                    onChange={(e) => patch({ street: e.target.value })}
                    placeholder="142 Main Street"
                    autoComplete="address-line1"
                  />
                </Field>
                <Field label="Unit or suite" optional className="sm:col-span-2">
                  <Input
                    value={draft.unit}
                    onChange={(e) => patch({ unit: e.target.value })}
                    placeholder="Rear driveway, Unit B"
                    autoComplete="address-line2"
                  />
                </Field>
                <Field label="City" required error={err("city")}>
                  <Input value={draft.city} onChange={(e) => patch({ city: e.target.value })} autoComplete="address-level2" />
                </Field>
                <Field label="State" required error={err("state")}>
                  <Input
                    value={draft.state}
                    onChange={(e) => patch({ state: e.target.value.toUpperCase() })}
                    maxLength={2}
                    placeholder="NJ"
                    className="uppercase"
                    autoComplete="address-level1"
                  />
                </Field>
                <Field label="ZIP code" required error={err("postalCode")}>
                  <Input
                    value={draft.postalCode}
                    onChange={(e) => patch({ postalCode: e.target.value })}
                    inputMode="numeric"
                    maxLength={10}
                    autoComplete="postal-code"
                  />
                </Field>
              </div>

              <div className="mt-6">
                <Button variant="secondary" onClick={() => void confirmOnMap()} loading={geocoding} loadingText="Locating…">
                  Confirm location on map
                </Button>
                {geocodeError ? (
                  <p className="mt-2 text-xs font-medium text-warning-700">{geocodeError}</p>
                ) : null}
                {err("center") ? (
                  <p className="mt-2 text-xs font-medium text-danger-700">{err("center")}</p>
                ) : null}
              </div>

              {draft.center ? (
                <div className="mt-4 overflow-hidden rounded-card border border-ink-200">
                  <ParkingMap
                    center={draft.center}
                    zoom={16}
                    destination={draft.center}
                    privacyCircle={{ center: draft.center, radiusMeters: 200 }}
                    className="h-64"
                    showRecenter={false}
                    ariaLabel="Confirmed location of your parking space"
                  />
                </div>
              ) : null}

              <Alert tone="info" className="mt-4" icon={<IconLock />}>
                Drivers see only the approximate circle until a reservation is
                confirmed. Your exact address is shared with a driver once they
                have booked.
              </Alert>
            </StepBlock>
          ) : null}

          {step === 1 ? (
            <StepBlock title="What kind of parking is it?" description="This helps drivers filter for what they need.">
              <fieldset>
                <legend className="sr-only">Parking type</legend>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {PARKING_TYPES.map((type) => (
                    <li key={type.value}>
                      <RadioCard
                        name="parkingType"
                        value={type.value}
                        checked={draft.parkingType === type.value}
                        onChange={(value) => patch({ parkingType: value as ParkingType })}
                        icon={TYPE_ICONS[type.value]}
                        title={type.label}
                        description={type.description}
                      />
                    </li>
                  ))}
                </ul>
                {err("parkingType") ? (
                  <p className="mt-3 text-xs font-medium text-danger-700">{err("parkingType")}</p>
                ) : null}
              </fieldset>
            </StepBlock>
          ) : null}

          {step === 2 ? (
            <StepBlock title="Tell drivers about the space" description="Clear details mean fewer questions and smoother arrivals.">
              <div className="space-y-5">
                <Field
                  label="Listing title"
                  required
                  error={err("title")}
                  hint="Short and specific, e.g. “Covered driveway two blocks from the station”."
                >
                  <Input
                    value={draft.title}
                    onChange={(e) => patch({ title: e.target.value })}
                    maxLength={80}
                    placeholder="Wide driveway near Chatham Station"
                  />
                </Field>

                <Field label="Description" required error={err("description")}>
                  <Textarea
                    value={draft.description}
                    onChange={(e) => patch({ description: e.target.value })}
                    maxLength={1200}
                    placeholder="Describe the space, how easy it is to get in and out, and anything a driver should know."
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Number of spaces" required error={err("spacesTotal")}>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      inputMode="numeric"
                      value={draft.spacesTotal}
                      onChange={(e) => patch({ spacesTotal: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Largest vehicle that fits" required error={err("maxVehicleSize")}>
                    <Select
                      value={draft.maxVehicleSize}
                      onChange={(e) => patch({ maxVehicleSize: e.target.value as VehicleSize })}
                      placeholder="Choose a size"
                    >
                      {VEHICLE_SIZES.map((size) => (
                        <option key={size.value} value={size.value}>
                          {size.label} — {size.hint}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Height clearance" optional hint="Only needed for garages and covered spaces.">
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={draft.heightClearanceCm}
                      onChange={(e) => patch({ heightClearanceCm: e.target.value })}
                      placeholder="220"
                      trailingSlot={<span className="pr-2 text-xs text-ink-500">cm</span>}
                    />
                  </Field>
                  <Field label="Surface" optional>
                    <Select
                      value={draft.surface}
                      onChange={(e) => patch({ surface: e.target.value as SurfaceType })}
                      placeholder="Choose a surface"
                    >
                      {["asphalt", "concrete", "gravel", "grass", "paver"].map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <Fieldset legend="What this space offers" description="Select everything that applies.">
                  <ul className="flex flex-wrap gap-2">
                    {AMENITIES.map((amenity) => (
                      <li key={amenity.value}>
                        <TogglePill
                          pressed={draft.amenities.includes(amenity.value)}
                          onToggle={() =>
                            patch({
                              amenities: draft.amenities.includes(amenity.value)
                                ? draft.amenities.filter((a) => a !== amenity.value)
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

                <Field label="Entrance details" optional hint="How drivers recognise the entrance from the street.">
                  <Textarea
                    value={draft.entranceNotes}
                    onChange={(e) => patch({ entranceNotes: e.target.value })}
                    maxLength={300}
                    className="min-h-20"
                  />
                </Field>

                <Field label="Accessibility information" optional>
                  <Textarea
                    value={draft.accessibilityNotes}
                    onChange={(e) => patch({ accessibilityNotes: e.target.value })}
                    maxLength={300}
                    className="min-h-20"
                    placeholder="Step-free access, width of the space, distance to the nearest entrance."
                  />
                </Field>
              </div>
            </StepBlock>
          ) : null}

          {step === 3 ? (
            <StepBlock
              title="Add photos"
              description="Listings with clear photos get reserved more often. The first photo is what drivers see in search results."
            >
              <PhotoUploader
                photos={draft.photos}
                onChange={(photos) => patch({ photos })}
                error={err("photos") ?? err("alt")}
              />
            </StepBlock>
          ) : null}

          {step === 4 ? (
            <StepBlock title="When is it available?" description="You can change this at any time from your calendar.">
              <div className="space-y-6">
                <Switch
                  label="Use the same hours every selected day"
                  description="Turn this off to set different hours for each day."
                  checked={draft.sameHoursAllDays}
                  onChange={(v) => patch({ sameHoursAllDays: v })}
                />

                <fieldset>
                  <legend className="text-sm font-semibold text-ink-800">Available days</legend>
                  <ul className="mt-3 space-y-2.5">
                    {draft.schedule.map((day, index) => (
                      <li
                        key={index}
                        className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 p-3"
                      >
                        <label className="flex min-w-24 items-center gap-2.5 text-sm font-semibold">
                          <input
                            type="checkbox"
                            checked={day.enabled}
                            onChange={(e) => {
                              const schedule = [...draft.schedule];
                              schedule[index] = { ...day, enabled: e.target.checked };
                              patch({ schedule });
                            }}
                            className="h-4.5 w-4.5 rounded"
                          />
                          {DAY_SHORT[index]}
                        </label>

                        {day.enabled ? (
                          <div className="flex flex-1 items-center gap-2">
                            <Input
                              type="time"
                              size="sm"
                              aria-label={`${DAY_SHORT[index]} start time`}
                              value={day.start}
                              onChange={(e) => {
                                const schedule = [...draft.schedule];
                                const start = e.target.value;
                                if (draft.sameHoursAllDays) {
                                  schedule.forEach((s, i) => {
                                    schedule[i] = { ...s, start };
                                  });
                                } else {
                                  schedule[index] = { ...day, start };
                                }
                                patch({ schedule });
                              }}
                            />
                            <span aria-hidden="true" className="text-ink-400">–</span>
                            <Input
                              type="time"
                              size="sm"
                              aria-label={`${DAY_SHORT[index]} end time`}
                              value={day.end}
                              onChange={(e) => {
                                const schedule = [...draft.schedule];
                                const end = e.target.value;
                                if (draft.sameHoursAllDays) {
                                  schedule.forEach((s, i) => {
                                    schedule[i] = { ...s, end };
                                  });
                                } else {
                                  schedule[index] = { ...day, end };
                                }
                                patch({ schedule });
                              }}
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-ink-400">Unavailable</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {err("schedule") ? (
                    <p className="mt-2 text-xs font-medium text-danger-700">{err("schedule")}</p>
                  ) : null}
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Minimum reservation" required>
                    <Select
                      value={draft.minimumMinutes}
                      onChange={(e) => patch({ minimumMinutes: Number(e.target.value) })}
                    >
                      {[30, 60, 120, 180, 240].map((m) => (
                        <option key={m} value={m}>
                          {m < 60 ? `${m} minutes` : `${m / 60} hour${m > 60 ? "s" : ""}`}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Maximum reservation" required error={err("duration")}>
                    <Select
                      value={draft.maximumMinutes}
                      onChange={(e) => patch({ maximumMinutes: Number(e.target.value) })}
                    >
                      {[240, 480, 720, 1440, 4320, 10080].map((m) => (
                        <option key={m} value={m}>
                          {m < 1440 ? `${m / 60} hours` : `${m / 1440} day${m > 1440 ? "s" : ""}`}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Advance notice" hint="How far ahead a driver must book.">
                    <Select
                      value={draft.advanceNoticeMinutes}
                      onChange={(e) => patch({ advanceNoticeMinutes: Number(e.target.value) })}
                    >
                      {[0, 30, 60, 120, 720, 1440].map((m) => (
                        <option key={m} value={m}>
                          {m === 0 ? "None — book any time" : m < 60 ? `${m} minutes` : `${m / 60} hours`}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Time between reservations" hint="A gap so one driver leaves before the next arrives.">
                    <Select
                      value={draft.bufferMinutes}
                      onChange={(e) => patch({ bufferMinutes: Number(e.target.value) })}
                    >
                      {[0, 15, 30, 60].map((m) => (
                        <option key={m} value={m}>
                          {m === 0 ? "No gap" : `${m} minutes`}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Listing start date" optional>
                    <Input type="date" value={draft.startDate} onChange={(e) => patch({ startDate: e.target.value })} />
                  </Field>
                  <Field label="Listing end date" optional hint="Leave blank to keep it listed indefinitely.">
                    <Input
                      type="date"
                      min={draft.startDate}
                      value={draft.endDate}
                      onChange={(e) => patch({ endDate: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            </StepBlock>
          ) : null}

          {step === 5 ? (
            <StepBlock title="Set your price" description="You can change your price at any time.">
              <div className="space-y-5">
                <Field label="Hourly price" required error={err("price")}>
                  <Input
                    type="number"
                    min={0}
                    step="0.25"
                    inputMode="decimal"
                    value={draft.pricePerHour}
                    onChange={(e) => patch({ pricePerHour: e.target.value })}
                    placeholder="3.50"
                    leadingIcon={<span className="text-sm font-semibold">$</span>}
                  />
                </Field>

                <Field
                  label="Daily maximum"
                  optional
                  hint="Caps what a driver pays for a full day. Leave blank for no cap."
                >
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    inputMode="decimal"
                    value={draft.dailyMax}
                    onChange={(e) => patch({ dailyMax: e.target.value })}
                    placeholder="20.00"
                    leadingIcon={<span className="text-sm font-semibold">$</span>}
                  />
                </Field>

                <div className="rounded-card border border-ink-200 bg-ink-50 p-5">
                  <h3 className="text-sm font-bold text-ink-900">What you would earn</h3>
                  {earnings ? (
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-ink-600">Driver pays, per hour</dt>
                        <dd className="font-semibold">{formatMoney(earnings.grossCents)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-ink-600">ParkPlugs host fee</dt>
                        <dd className="font-semibold">
                          {earnings.feeCents === null ? "Not yet set" : `−${formatMoney(earnings.feeCents)}`}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-ink-200 pt-2">
                        <dt className="font-bold text-ink-900">You receive, per hour</dt>
                        <dd className="font-bold">
                          {earnings.netCents === null ? "—" : formatMoney(earnings.netCents)}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-2 text-sm text-ink-600">Enter an hourly price to see an estimate.</p>
                  )}

                  {business.hostFeeBps === null ? (
                    <Alert tone="warning" className="mt-4">
                      ParkPlugs&rsquo;s host fee has not been configured yet, so we
                      cannot show what you would take home. It will be shown here
                      and on your earnings page once it is set.
                    </Alert>
                  ) : null}

                  <p className="mt-3 text-xs leading-relaxed text-ink-500">
                    Actual earnings depend on demand, availability, pricing, and
                    completed reservations.
                  </p>
                </div>
              </div>
            </StepBlock>
          ) : null}

          {step === 6 ? (
            <StepBlock
              title="Instructions and rules"
              description="Entry details stay private and are shared only with drivers who have confirmed reservations."
            >
              <div className="space-y-6">
                <div className="rounded-card border border-brand-200 bg-brand-50 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-brand-900">
                    <IconLock aria-hidden="true" /> Private — shared after booking
                  </h3>
                  <div className="mt-4 space-y-4">
                    <Field label="How to enter" required error={err("entry")}>
                      <Textarea
                        value={draft.entryInstructions}
                        onChange={(e) => patch({ entryInstructions: e.target.value })}
                        maxLength={500}
                        className="min-h-20 bg-white"
                        placeholder="Turn in at the second driveway past the blue mailbox."
                      />
                    </Field>
                    <Field label="Where exactly to park" required error={err("parking")}>
                      <Textarea
                        value={draft.parkingInstructions}
                        onChange={(e) => patch({ parkingInstructions: e.target.value })}
                        maxLength={500}
                        className="min-h-20 bg-white"
                        placeholder="Pull all the way forward on the right-hand side, leaving room for the garage door."
                      />
                    </Field>
                    <Field label="How to exit" optional>
                      <Textarea
                        value={draft.exitInstructions}
                        onChange={(e) => patch({ exitInstructions: e.target.value })}
                        maxLength={500}
                        className="min-h-20 bg-white"
                      />
                    </Field>
                    <Field label="Gate or access code" optional hint="Only shared with a confirmed driver.">
                      <Input
                        value={draft.accessCode}
                        onChange={(e) => patch({ accessCode: e.target.value })}
                        className="bg-white"
                        placeholder="Gate code #4821"
                      />
                    </Field>
                    <Field label="Emergency notes" optional hint="Anything a driver should know if something goes wrong.">
                      <Textarea
                        value={draft.emergencyNotes}
                        onChange={(e) => patch({ emergencyNotes: e.target.value })}
                        maxLength={300}
                        className="min-h-20 bg-white"
                      />
                    </Field>
                  </div>
                </div>

                <div className="rounded-card border border-ink-200 p-4">
                  <h3 className="text-sm font-bold text-ink-900">Public — shown on your listing</h3>
                  <div className="mt-4 space-y-4">
                    <Field label="Parking rules" optional hint="One rule per line.">
                      <Textarea
                        value={draft.rules}
                        onChange={(e) => patch({ rules: e.target.value })}
                        maxLength={800}
                        placeholder={"No overnight parking\nDo not block the garage door\nNo commercial vehicles"}
                      />
                    </Field>
                    <Field label="Restricted areas" optional>
                      <Textarea
                        value={draft.restrictedAreas}
                        onChange={(e) => patch({ restrictedAreas: e.target.value })}
                        maxLength={300}
                        className="min-h-20"
                        placeholder="Please stay off the lawn and away from the side gate."
                      />
                    </Field>
                    <Field label="How drivers should contact you" optional>
                      <Select
                        value={draft.contactPreference}
                        onChange={(e) => patch({ contactPreference: e.target.value })}
                      >
                        <option value="message">ParkPlugs messages only</option>
                        <option value="message_urgent">ParkPlugs messages, and call only if urgent</option>
                      </Select>
                    </Field>
                  </div>
                </div>
              </div>
            </StepBlock>
          ) : null}

          {step === 7 ? (
            <StepBlock
              title="Before you submit"
              description="Please confirm each of these. They protect you, your neighbours, and the drivers who book your space."
            >
              <fieldset className="space-y-4">
                <legend className="sr-only">Host confirmations</legend>
                {(
                  [
                    ["ownership", "I own this space, or I have permission from the owner to list it."],
                    ["propertyRules", "Listing this space does not violate any lease, HOA, or property rules I know of."],
                    ["safe", "The space is safe to use and reachable by the vehicles I have said it fits."],
                    ["emergencyAccess", "The space does not block emergency access, hydrants, or a public right of way."],
                    ["accurateAvailability", "I will keep my availability accurate and cancel promptly if something changes."],
                    ["truthful", "Everything I have entered about this space is truthful."],
                  ] as const
                ).map(([key, label]) => (
                  <Checkbox
                    key={key}
                    label={label}
                    checked={draft.confirmations[key]}
                    error={err(key)}
                    onChange={(e) =>
                      patch({ confirmations: { ...draft.confirmations, [key]: e.target.checked } })
                    }
                  />
                ))}
              </fieldset>

              <Alert tone="neutral" className="mt-6" icon={<IconAlert />}>
                ParkPlugs does not inspect spaces or verify property ownership.
                Read the{" "}
                <Link href="/legal/host-standards" className="font-bold underline underline-offset-2">
                  Host Standards
                </Link>{" "}
                for what is expected of you.
              </Alert>
            </StepBlock>
          ) : null}

          {step === 8 ? (
            <StepBlock title="Review your listing" description="Check everything below, then submit it for review.">
              <div className="space-y-4">
                <ReviewSection title="Location" onEdit={() => setStep(0)}>
                  <p className="text-sm text-ink-700">
                    {draft.street}
                    {draft.unit ? `, ${draft.unit}` : ""}, {draft.city}, {draft.state} {draft.postalCode}
                  </p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-brand-800">
                    <IconLock aria-hidden="true" />
                    Drivers see only &ldquo;Near {draft.street.replace(/^[\d-]+\s+/, "")}, {draft.city}&rdquo; until they book.
                  </p>
                </ReviewSection>

                <ReviewSection title="Space" onEdit={() => setStep(2)}>
                  <p className="text-sm font-bold text-ink-900">{draft.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-700">{draft.description}</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    <li><Badge size="sm">{PARKING_TYPES.find((t) => t.value === draft.parkingType)?.label}</Badge></li>
                    <li><Badge size="sm">{draft.spacesTotal} {draft.spacesTotal === 1 ? "space" : "spaces"}</Badge></li>
                    <li><Badge size="sm">Fits {VEHICLE_SIZES.find((s) => s.value === draft.maxVehicleSize)?.label}</Badge></li>
                    {draft.amenities.map((a) => (
                      <li key={a}><Badge size="sm" tone="brand">{AMENITIES.find((x) => x.value === a)?.label}</Badge></li>
                    ))}
                  </ul>
                </ReviewSection>

                <ReviewSection title={`Photos (${draft.photos.length})`} onEdit={() => setStep(3)}>
                  <ul className="flex gap-2 overflow-x-auto scrollbar-none">
                    {draft.photos.map((photo, i) => (
                      <li key={photo.id} className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt={photo.alt} className="h-full w-full object-cover" />
                        {i === 0 ? (
                          <span className="absolute bottom-1 left-1 rounded bg-ink-950/75 px-1.5 py-0.5 text-2xs font-bold text-white">
                            Main
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </ReviewSection>

                <ReviewSection title="Availability" onEdit={() => setStep(4)}>
                  <ul className="space-y-1 text-sm text-ink-700">
                    {draft.schedule.map((day, i) =>
                      day.enabled ? (
                        <li key={i}>
                          <span className="inline-block w-12 font-semibold">{DAY_SHORT[i]}</span>
                          {formatClock(day.start)} – {formatClock(day.end)}
                        </li>
                      ) : null,
                    )}
                  </ul>
                </ReviewSection>

                <ReviewSection title="Pricing" onEdit={() => setStep(5)}>
                  <p className="text-sm text-ink-700">
                    {formatMoney(Math.round(Number(draft.pricePerHour) * 100))} per hour
                    {draft.dailyMax
                      ? `, up to ${formatMoney(Math.round(Number(draft.dailyMax) * 100))} per day`
                      : ""}
                  </p>
                  {earnings?.netCents !== null && earnings ? (
                    <p className="mt-1 text-xs text-ink-500">
                      You would receive about {formatMoney(earnings.netCents)} per hour after fees.
                      Actual earnings depend on demand, availability, pricing, and
                      completed reservations.
                    </p>
                  ) : null}
                </ReviewSection>

                <ReviewSection title="Rules" onEdit={() => setStep(6)}>
                  {draft.rules.trim() ? (
                    <ul className="space-y-1 text-sm text-ink-700">
                      {draft.rules
                        .split("\n")
                        .filter((r) => r.trim())
                        .map((rule) => (
                          <li key={rule}>· {rule}</li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-ink-500">No specific rules added.</p>
                  )}
                </ReviewSection>
              </div>

              <Alert tone="info" className="mt-6" title="What happens after you submit">
                {business.listingsAutoPublish
                  ? "Your listing goes live right away. You can pause or edit it at any time."
                  : "ParkPlugs will confirm that the listing meets marketplace requirements. You will be notified when it is published."}
              </Alert>
            </StepBlock>
          ) : null}

          {/* --------------------------------------------------- Navigation */}
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-ink-200 pt-6 sm:flex-row sm:justify-between">
            <Button
              variant="ghost"
              size="lg"
              leadingIcon={<IconArrowLeft />}
              onClick={() => (step === 0 ? setExitOpen(true) : setStep((s) => s - 1))}
              disabled={submitting}
            >
              {step === 0 ? "Exit" : "Back"}
            </Button>
            <Button
              size="lg"
              onClick={next}
              loading={submitting}
              loadingText="Submitting…"
              leadingIcon={step === STEPS.length - 1 ? <IconCheckCircle /> : undefined}
            >
              {step === STEPS.length - 1 ? "Submit listing" : "Continue"}
            </Button>
          </div>
        </div>
      </Container>

      <ConfirmDialog
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        onConfirm={() => {
          saveDraft();
          router.push("/host/listings");
        }}
        title="Save your draft and exit?"
        description="Your progress is saved. You can pick this listing back up any time from your listings page."
        confirmLabel="Save and exit"
        cancelLabel="Keep editing"
      />
    </div>
  );
}

function StepBlock({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-ink-600">{description}</p>
      ) : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-ink-200 p-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-bold text-ink-900">{title}</h3>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </div>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}
