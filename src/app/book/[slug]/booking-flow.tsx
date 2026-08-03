"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { paymentsConfigured } from "@/config/business";
import { listings as listingsApi, reservations as reservationsApi, vehicles as vehiclesApi } from "@/lib/api";
import { quote } from "@/lib/api/pricing";
import { ERROR_COPY } from "@/lib/api/result";
import {
  formatDuration,
  formatMoney,
  formatRange,
  minutesBetween,
  toDateInput,
  toIso,
  toTimeInput,
} from "@/lib/format";
import { validateDateRange } from "@/lib/search-params";
import { useAsync, useUnsavedChangesWarning } from "@/lib/use-async";
import { useSession } from "@/lib/session";
import { VEHICLE_SIZES, type Listing, type Vehicle, type VehicleSize } from "@/lib/types";
import { Container } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ErrorState, Skeleton, Spinner } from "@/components/ui/feedback";
import { Checkbox, Field, FormErrorSummary, Input, Select } from "@/components/ui/form";
import { Stepper } from "@/components/ui/menu";
import { ConfirmDialog } from "@/components/ui/overlay";
import {
  IconAlert,
  IconArrowLeft,
  IconCar,
  IconCheckCircle,
  IconImage,
  IconLock,
  IconMapPin,
} from "@/components/ui/icons";
import { PriceBreakdown } from "@/components/listing/price-breakdown";

const STEPS = ["Reservation details", "Vehicle", "Rules", "Review and pay"];
const SIZE_ORDER: VehicleSize[] = ["compact", "standard", "large", "oversized"];

type NewVehicle = {
  make: string;
  model: string;
  color: string;
  licensePlate: string;
  plateRegion: string;
  size: VehicleSize | "";
};

const EMPTY_VEHICLE: NewVehicle = {
  make: "",
  model: "",
  color: "",
  licensePlate: "",
  plateRegion: "",
  size: "",
};

export function BookingFlow({ slug }: { slug: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const session = useSession();

  const listingState = useAsync(() => listingsApi.getBySlug(slug), [slug]);
  const vehiclesState = useAsync(() => vehiclesApi.list(), [session.status]);

  const [step, setStep] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [newVehicle, setNewVehicle] = useState<NewVehicle>(EMPTY_VEHICLE);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [acks, setAcks] = useState({ fits: false, times: false, rules: false, cancellation: false });
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Array<{ field: string; message: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ title: string; description: string } | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Seed the times from the listing page's query string.
  useEffect(() => {
    const start = params.get("start");
    const end = params.get("end");
    if (start) {
      setStartDate(toDateInput(start));
      setStartTime(toTimeInput(start));
    }
    if (end) {
      setEndDate(toDateInput(end));
      setEndTime(toTimeInput(end));
    }
  }, [params]);

  // Preselect the driver's default vehicle.
  useEffect(() => {
    if (vehiclesState.status === "ready" && !vehicleId) {
      const preferred = vehiclesState.data.find((v) => v.isDefault) ?? vehiclesState.data[0];
      if (preferred) setVehicleId(preferred.id);
      else setAddingVehicle(true);
    }
  }, [vehiclesState, vehicleId]);

  const startAt = toIso(startDate, startTime);
  const endAt = toIso(endDate, endTime);
  const minutes = startAt && endAt ? minutesBetween(startAt, endAt) : 0;

  const hasInput = Boolean(vehicleId || newVehicle.make || Object.values(acks).some(Boolean));
  useUnsavedChangesWarning(hasInput && step < STEPS.length);

  // Move focus to the new step heading so keyboard users are not left behind.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  if (listingState.status === "loading") return <BookingSkeleton />;

  if (listingState.status === "error") {
    const copy = ERROR_COPY[listingState.error.code];
    return (
      <Container size="narrow" className="py-16">
        <ErrorState
          title={listingState.error.code === "not_found" ? "This space is no longer available" : copy.title}
          description={listingState.error.message || copy.description}
          actions={[{ label: "Find other parking", href: "/search" }]}
        />
      </Container>
    );
  }

  const listing = listingState.data;
  const savedVehicles = vehiclesState.status === "ready" ? vehiclesState.data : [];
  const selectedVehicle = savedVehicles.find((v) => v.id === vehicleId);

  const price =
    minutes > 0
      ? quote({
          pricePerHourCents: listing.pricePerHourCents,
          dailyMaxCents: listing.dailyMaxCents,
          minutes,
          currency: listing.currency,
        })
      : null;

  const vehicleFits = selectedVehicle
    ? SIZE_ORDER.indexOf(listing.maxVehicleSize) >= SIZE_ORDER.indexOf(selectedVehicle.size)
    : newVehicle.size
      ? SIZE_ORDER.indexOf(listing.maxVehicleSize) >= SIZE_ORDER.indexOf(newVehicle.size)
      : null;

  /* ------------------------------ Validation ----------------------------- */

  function validateStep(index: number): Array<{ field: string; message: string }> {
    const found: Array<{ field: string; message: string }> = [];

    if (index === 0) {
      const rangeError = validateDateRange(startAt, endAt);
      if (!startAt || !endAt) found.push({ field: "times", message: "Enter both an arrival and a departure time." });
      else if (rangeError) found.push({ field: "times", message: rangeError });
      else if (minutes < listing.minimumMinutes) {
        found.push({
          field: "times",
          message: `This space has a ${formatDuration(listing.minimumMinutes)} minimum reservation.`,
        });
      } else if (minutes > listing.maximumMinutes) {
        found.push({
          field: "times",
          message: `This space allows at most ${formatDuration(listing.maximumMinutes)}.`,
        });
      }
    }

    if (index === 1) {
      if (addingVehicle) {
        if (!newVehicle.make.trim()) found.push({ field: "make", message: "Enter the vehicle make." });
        if (!newVehicle.model.trim()) found.push({ field: "model", message: "Enter the vehicle model." });
        if (!newVehicle.licensePlate.trim())
          found.push({ field: "plate", message: "Enter the license plate so your host can identify the vehicle." });
        if (!newVehicle.plateRegion.trim())
          found.push({ field: "region", message: "Enter the state or jurisdiction on the plate." });
        if (!newVehicle.size) found.push({ field: "size", message: "Choose the vehicle size." });
      } else if (!vehicleId) {
        found.push({ field: "vehicle", message: "Choose which vehicle you are parking." });
      }
    }

    if (index === 2) {
      if (!acks.fits) found.push({ field: "fits", message: "Confirm your vehicle fits this space." });
      if (!acks.times) found.push({ field: "times-ack", message: "Confirm your arrival and departure times." });
      if (!acks.rules) found.push({ field: "rules", message: "Confirm you have read the parking rules." });
      if (!acks.cancellation)
        found.push({ field: "cancellation", message: "Confirm you understand the cancellation policy." });
    }

    if (index === 3) {
      if (!terms) found.push({ field: "terms", message: "Agree to the Terms of Service to continue." });
    }

    return found;
  }

  function goNext() {
    const found = validateStep(step);
    setErrors(found);
    if (found.length > 0) {
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }
    if (step === STEPS.length - 1) {
      void submit();
      return;
    }
    setStep((s) => s + 1);
  }

  /* -------------------------------- Submit ------------------------------- */

  async function submit() {
    if (submitting || !startAt || !endAt) return;

    if (session.status !== "authenticated") {
      router.push(`/signin?next=${encodeURIComponent(`/book/${slug}?start=${startAt}&end=${endAt}`)}`);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    let resolvedVehicleId = vehicleId;
    if (addingVehicle) {
      const created = await vehiclesApi.create({
        make: newVehicle.make.trim(),
        model: newVehicle.model.trim(),
        color: newVehicle.color.trim(),
        licensePlate: newVehicle.licensePlate.trim().toUpperCase(),
        plateRegion: newVehicle.plateRegion.trim().toUpperCase(),
        size: newVehicle.size as VehicleSize,
      });
      if (!created.ok) {
        setSubmitting(false);
        setSubmitError({ title: "Your vehicle could not be saved", description: created.error.message });
        return;
      }
      resolvedVehicleId = created.data.id;
    }

    const result = await reservationsApi.create({
      listingSlug: slug,
      startAt,
      endAt,
      vehicleId: resolvedVehicleId,
    });

    setSubmitting(false);

    if (result.ok) {
      router.push(`/reservations/${result.data.reference}?new=1`);
      return;
    }

    const copy = ERROR_COPY[result.error.code];
    setSubmitError({
      title: copy.title,
      description: result.error.message || copy.description,
    });
  }

  /* -------------------------------- Render ------------------------------- */

  if (submitting) {
    return (
      <div className="grid min-h-[70dvh] place-items-center px-4">
        <div className="max-w-sm text-center">
          <Spinner size="lg" label="Confirming your reservation" />
          <h1 className="mt-5 text-xl font-bold tracking-tight">Confirming your reservation…</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            This usually takes a few seconds. Please do not close or refresh this
            page — doing so could leave your reservation in an unclear state.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Container size="default" className="py-6 lg:py-10">
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon={<IconArrowLeft />}
          onClick={() => (step === 0 ? setLeaveOpen(true) : setStep((s) => s - 1))}
        >
          {step === 0 ? "Back to listing" : "Back"}
        </Button>
      </div>

      <h1 ref={headingRef} tabIndex={-1} className="sr-only">
        Reserve {listing.title} — step {step + 1} of {STEPS.length}: {STEPS[step]}
      </h1>

      <Stepper steps={STEPS} current={step} onStepClick={(i) => setStep(i)} className="mt-4" />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <div className="min-w-0">
          {errors.length > 0 ? (
            <div ref={errorSummaryRef} tabIndex={-1} className="mb-6 focus:outline-none">
              <FormErrorSummary errors={errors} />
            </div>
          ) : null}

          {submitError ? (
            <Alert tone="danger" live title={submitError.title} className="mb-6">
              <p>{submitError.description}</p>
              <p className="mt-2 font-medium">
                Nothing has been charged and no reservation was created. Your
                details on this page have been kept.
              </p>
            </Alert>
          ) : null}

          {step === 0 ? (
            <StepDetails
              listing={listing}
              startDate={startDate}
              startTime={startTime}
              endDate={endDate}
              endTime={endTime}
              onChange={{ setStartDate, setStartTime, setEndDate, setEndTime }}
              minutes={minutes}
            />
          ) : null}

          {step === 1 ? (
            <StepVehicle
              listing={listing}
              vehicles={savedVehicles}
              loading={vehiclesState.status === "loading"}
              vehicleId={vehicleId}
              setVehicleId={setVehicleId}
              addingVehicle={addingVehicle}
              setAddingVehicle={setAddingVehicle}
              newVehicle={newVehicle}
              setNewVehicle={setNewVehicle}
              fits={vehicleFits}
              errors={errors}
            />
          ) : null}

          {step === 2 ? (
            <StepRules listing={listing} acks={acks} setAcks={setAcks} errors={errors} />
          ) : null}

          {step === 3 ? (
            <StepReview
              listing={listing}
              startAt={startAt}
              endAt={endAt}
              minutes={minutes}
              vehicle={selectedVehicle}
              newVehicle={addingVehicle ? newVehicle : null}
              terms={terms}
              setTerms={setTerms}
              errors={errors}
            />
          ) : null}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {step > 0 ? (
              <Button variant="secondary" size="lg" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            ) : null}
            <Button
              size="lg"
              onClick={goNext}
              disabled={step === STEPS.length - 1 && !paymentsConfigured}
            >
              {step === STEPS.length - 1 ? "Confirm and Pay" : "Continue"}
            </Button>
          </div>

          {step === STEPS.length - 1 && !paymentsConfigured ? (
            <Alert tone="warning" className="mt-4" title="Payment processing is not connected">
              This ParkPlugs environment has no payment provider configured, so a
              reservation cannot be completed. Everything you have entered is
              kept — set a payment provider key to enable checkout.
            </Alert>
          ) : null}
        </div>

        {/* ------------------------------------------------ Summary sidebar */}
        <aside aria-label="Reservation summary">
          <div className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-card border border-ink-200 bg-white">
              <div className="flex gap-3 p-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                  {listing.photos[0] ? (
                    <Image
                      src={listing.photos[0].url}
                      alt={listing.photos[0].alt}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-ink-400">
                      <IconImage aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-bold text-ink-900">{listing.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-600">
                    <IconMapPin className="shrink-0 text-ink-400" aria-hidden="true" />
                    <span className="truncate">{listing.location.label}</span>
                  </p>
                </div>
              </div>

              <div className="border-t border-ink-200 px-4 py-3 text-sm">
                <p className="font-semibold text-ink-800">
                  {startAt && endAt && minutes > 0 ? formatRange(startAt, endAt) : "Choose your times"}
                </p>
                {minutes > 0 ? (
                  <p className="mt-0.5 text-xs text-ink-500">{formatDuration(minutes)}</p>
                ) : null}
              </div>

              {price ? (
                <div className="border-t border-ink-200 p-4">
                  <PriceBreakdown
                    price={price}
                    minutes={minutes}
                    hourlyRateCents={listing.pricePerHourCents}
                  />
                </div>
              ) : null}
            </div>

            <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink-500">
              <IconLock className="mt-0.5 shrink-0" aria-hidden="true" />
              The exact address and entry instructions are shown once your
              reservation is confirmed.
            </p>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onConfirm={() => router.push(`/spaces/${slug}`)}
        title="Leave this reservation?"
        description="The details you have entered will not be saved."
        confirmLabel="Leave"
        cancelLabel="Keep booking"
        destructive
      />
    </Container>
  );
}

/* ------------------------------- Step 1 ---------------------------------- */

function StepDetails({
  listing,
  startDate,
  startTime,
  endDate,
  endTime,
  onChange,
  minutes,
}: {
  listing: Listing;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  onChange: {
    setStartDate: (v: string) => void;
    setStartTime: (v: string) => void;
    setEndDate: (v: string) => void;
    setEndTime: (v: string) => void;
  };
  minutes: number;
}) {
  return (
    <section aria-labelledby="step-details">
      <h2 id="step-details" className="text-xl font-bold tracking-tight">
        When do you need this space?
      </h2>
      <p className="mt-1.5 text-sm text-ink-600">
        You can change these times until you confirm.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <fieldset>
          <legend className="text-sm font-semibold text-ink-800">Arrival</legend>
          <div className="mt-1.5 grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-2">
            <Input type="date" aria-label="Arrival date" value={startDate} onChange={(e) => onChange.setStartDate(e.target.value)} />
            <Input type="time" aria-label="Arrival time" step={900} value={startTime} onChange={(e) => onChange.setStartTime(e.target.value)} />
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-semibold text-ink-800">Departure</legend>
          <div className="mt-1.5 grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-2">
            <Input type="date" aria-label="Departure date" min={startDate} value={endDate} onChange={(e) => onChange.setEndDate(e.target.value)} />
            <Input type="time" aria-label="Departure time" step={900} value={endTime} onChange={(e) => onChange.setEndTime(e.target.value)} />
          </div>
        </fieldset>
      </div>

      {minutes > 0 ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800">
          <IconCheckCircle aria-hidden="true" />
          {formatDuration(minutes)} reservation
        </p>
      ) : null}

      <dl className="mt-6 grid gap-x-8 gap-y-3 rounded-card border border-ink-200 p-4 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-600">Minimum</dt>
          <dd className="font-semibold">{formatDuration(listing.minimumMinutes)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-600">Maximum</dt>
          <dd className="font-semibold">{formatDuration(listing.maximumMinutes)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-600">Advance notice</dt>
          <dd className="font-semibold">{formatDuration(listing.advanceNoticeMinutes)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-600">Rate</dt>
          <dd className="font-semibold">
            {formatMoney(listing.pricePerHourCents, listing.currency)}/hr
          </dd>
        </div>
      </dl>
    </section>
  );
}

/* ------------------------------- Step 2 ---------------------------------- */

function StepVehicle({
  listing,
  vehicles,
  loading,
  vehicleId,
  setVehicleId,
  addingVehicle,
  setAddingVehicle,
  newVehicle,
  setNewVehicle,
  fits,
  errors,
}: {
  listing: Listing;
  vehicles: Vehicle[];
  loading: boolean;
  vehicleId: string;
  setVehicleId: (id: string) => void;
  addingVehicle: boolean;
  setAddingVehicle: (v: boolean) => void;
  newVehicle: NewVehicle;
  setNewVehicle: (v: NewVehicle) => void;
  fits: boolean | null;
  errors: Array<{ field: string; message: string }>;
}) {
  const err = (field: string) => errors.find((e) => e.field === field)?.message ?? null;
  const maxSize = VEHICLE_SIZES.find((s) => s.value === listing.maxVehicleSize);

  return (
    <section aria-labelledby="step-vehicle">
      <h2 id="step-vehicle" className="text-xl font-bold tracking-tight">
        Which vehicle are you parking?
      </h2>
      <p className="mt-1.5 text-sm text-ink-600">
        Your host uses these details to identify your vehicle.
        {maxSize ? ` This space fits up to a ${maxSize.label.toLowerCase()} vehicle.` : ""}
      </p>

      {loading ? (
        <div className="mt-6 space-y-3" role="status" aria-busy="true">
          <span className="sr-only">Loading your saved vehicles</span>
          <Skeleton className="h-20 w-full" rounded="rounded-card" />
          <Skeleton className="h-20 w-full" rounded="rounded-card" />
        </div>
      ) : (
        <>
          {vehicles.length > 0 ? (
            <fieldset className="mt-6">
              <legend className="sr-only">Choose a saved vehicle</legend>
              <ul className="space-y-3">
                {vehicles.map((vehicle) => {
                  const selected = !addingVehicle && vehicleId === vehicle.id;
                  const vehicleFits =
                    SIZE_ORDER.indexOf(listing.maxVehicleSize) >= SIZE_ORDER.indexOf(vehicle.size);
                  return (
                    <li key={vehicle.id}>
                      <label
                        className={`flex cursor-pointer items-start gap-3.5 rounded-card border-2 p-4 transition-colors ${
                          selected ? "border-brand-600 bg-brand-50" : "border-ink-200 hover:border-ink-400"
                        }`}
                      >
                        <input
                          type="radio"
                          name="vehicle"
                          value={vehicle.id}
                          checked={selected}
                          onChange={() => {
                            setVehicleId(vehicle.id);
                            setAddingVehicle(false);
                          }}
                          className="mt-1 h-4.5 w-4.5"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-ink-900">
                              {vehicle.color} {vehicle.make} {vehicle.model}
                            </span>
                            {vehicle.isDefault ? <Badge size="sm">Default</Badge> : null}
                          </span>
                          <span className="mt-0.5 block text-xs text-ink-600">
                            {vehicle.licensePlate} · {vehicle.plateRegion} ·{" "}
                            {VEHICLE_SIZES.find((s) => s.value === vehicle.size)?.label}
                          </span>
                          <span
                            className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold ${
                              vehicleFits ? "text-success-700" : "text-danger-700"
                            }`}
                          >
                            {vehicleFits ? <IconCheckCircle aria-hidden="true" /> : <IconAlert aria-hidden="true" />}
                            {vehicleFits ? "Fits this space" : "May not fit this space"}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              {err("vehicle") ? (
                <p className="mt-2 text-xs font-medium text-danger-700">{err("vehicle")}</p>
              ) : null}
            </fieldset>
          ) : null}

          {!addingVehicle ? (
            <Button variant="secondary" className="mt-4" leadingIcon={<IconCar />} onClick={() => setAddingVehicle(true)}>
              Add a different vehicle
            </Button>
          ) : (
            <div className="mt-6 rounded-card border border-ink-200 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-bold">Add a vehicle</h3>
                {vehicles.length > 0 ? (
                  <Button variant="ghost" size="sm" onClick={() => setAddingVehicle(false)}>
                    Use a saved vehicle
                  </Button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Make" required error={err("make")}>
                  <Input
                    value={newVehicle.make}
                    onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                    placeholder="Toyota"
                    autoComplete="off"
                  />
                </Field>
                <Field label="Model" required error={err("model")}>
                  <Input
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                    placeholder="Corolla"
                    autoComplete="off"
                  />
                </Field>
                <Field label="Color" optional>
                  <Input
                    value={newVehicle.color}
                    onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                    placeholder="Silver"
                  />
                </Field>
                <Field label="License plate" required error={err("plate")}>
                  <Input
                    value={newVehicle.licensePlate}
                    onChange={(e) =>
                      setNewVehicle({ ...newVehicle, licensePlate: e.target.value.toUpperCase() })
                    }
                    placeholder="ABC1234"
                    maxLength={12}
                    autoCapitalize="characters"
                    className="uppercase"
                  />
                </Field>
                <Field label="State or jurisdiction" required error={err("region")}>
                  <Input
                    value={newVehicle.plateRegion}
                    onChange={(e) =>
                      setNewVehicle({ ...newVehicle, plateRegion: e.target.value.toUpperCase() })
                    }
                    placeholder="NJ"
                    maxLength={4}
                    className="uppercase"
                  />
                </Field>
                <Field label="Vehicle size" required error={err("size")}>
                  <Select
                    value={newVehicle.size}
                    onChange={(e) =>
                      setNewVehicle({ ...newVehicle, size: e.target.value as VehicleSize })
                    }
                    placeholder="Choose a size"
                  >
                    {VEHICLE_SIZES.map((size) => (
                      <option key={size.value} value={size.value}>
                        {size.label} — {size.hint}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              {fits === false ? (
                <Alert tone="warning" className="mt-4" live>
                  This space accepts vehicles up to {maxSize?.label.toLowerCase()}.
                  A larger vehicle may not fit, and the host may decline it on
                  arrival.
                </Alert>
              ) : null}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ------------------------------- Step 3 ---------------------------------- */

function StepRules({
  listing,
  acks,
  setAcks,
  errors,
}: {
  listing: Listing;
  acks: { fits: boolean; times: boolean; rules: boolean; cancellation: boolean };
  setAcks: (next: typeof acks) => void;
  errors: Array<{ field: string; message: string }>;
}) {
  const err = (field: string) => errors.find((e) => e.field === field)?.message ?? null;

  return (
    <section aria-labelledby="step-rules">
      <h2 id="step-rules" className="text-xl font-bold tracking-tight">
        Before you book
      </h2>
      <p className="mt-1.5 text-sm text-ink-600">
        Please read what your host expects, then confirm each point.
      </p>

      <div className="mt-6 space-y-5">
        <div className="rounded-card border border-ink-200 p-5">
          <h3 className="text-base font-bold">Parking rules from your host</h3>
          {listing.rules.length > 0 ? (
            <ul className="mt-3 space-y-2.5">
              {listing.rules.map((rule) => (
                <li key={rule} className="flex gap-2.5 text-sm leading-relaxed text-ink-700">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400" />
                  {rule}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-600">
              This host has not added specific rules. ParkPlugs&rsquo;s standard
              expectations still apply.
            </p>
          )}
          <ul className="mt-4 space-y-2 border-t border-ink-200 pt-4 text-sm text-ink-700">
            <li>Arrive and leave within the times you booked.</li>
            <li>Do not block driveways, sidewalks, gates, or emergency access.</li>
            <li>Park only in the space your host has described.</li>
          </ul>
        </div>

        <div className="rounded-card border border-ink-200 bg-ink-50 p-5">
          <h3 className="text-base font-bold">Cancellation</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-700">
            {listing.cancellationPolicy.summary}
          </p>
          <Link
            href="/legal/cancellation"
            className="mt-2 inline-block text-xs font-bold text-brand-700 underline underline-offset-2"
          >
            Read the full policy
          </Link>
        </div>

        <fieldset className="space-y-4 rounded-card border border-ink-200 p-5">
          <legend className="px-1 text-sm font-bold text-ink-900">Please confirm</legend>
          <Checkbox
            label="My vehicle fits this space"
            checked={acks.fits}
            error={err("fits")}
            onChange={(e) => setAcks({ ...acks, fits: e.target.checked })}
          />
          <Checkbox
            label="My arrival and departure times are correct"
            checked={acks.times}
            error={err("times-ack")}
            onChange={(e) => setAcks({ ...acks, times: e.target.checked })}
          />
          <Checkbox
            label="I have read and understand the parking rules"
            checked={acks.rules}
            error={err("rules")}
            onChange={(e) => setAcks({ ...acks, rules: e.target.checked })}
          />
          <Checkbox
            label="I understand the cancellation policy"
            checked={acks.cancellation}
            error={err("cancellation")}
            onChange={(e) => setAcks({ ...acks, cancellation: e.target.checked })}
          />
        </fieldset>
      </div>
    </section>
  );
}

/* ------------------------------- Step 4 ---------------------------------- */

function StepReview({
  listing,
  startAt,
  endAt,
  minutes,
  vehicle,
  newVehicle,
  terms,
  setTerms,
  errors,
}: {
  listing: Listing;
  startAt?: string;
  endAt?: string;
  minutes: number;
  vehicle?: Vehicle;
  newVehicle: NewVehicle | null;
  terms: boolean;
  setTerms: (v: boolean) => void;
  errors: Array<{ field: string; message: string }>;
}) {
  const err = (field: string) => errors.find((e) => e.field === field)?.message ?? null;
  const vehicleLabel = vehicle
    ? `${vehicle.color} ${vehicle.make} ${vehicle.model} · ${vehicle.licensePlate}`
    : newVehicle
      ? `${newVehicle.color} ${newVehicle.make} ${newVehicle.model} · ${newVehicle.licensePlate}`
      : "—";

  return (
    <section aria-labelledby="step-review">
      <h2 id="step-review" className="text-xl font-bold tracking-tight">
        Review and pay
      </h2>
      <p className="mt-1.5 text-sm text-ink-600">
        Check everything below, then confirm to complete your reservation.
      </p>

      <dl className="mt-6 divide-y divide-ink-200 overflow-hidden rounded-card border border-ink-200">
        <ReviewRow label="Space" value={listing.title} />
        <ReviewRow label="Approximate location" value={listing.location.label} />
        <ReviewRow
          label="When"
          value={startAt && endAt && minutes > 0 ? `${formatRange(startAt, endAt)} · ${formatDuration(minutes)}` : "—"}
        />
        <ReviewRow label="Vehicle" value={vehicleLabel} />
        <ReviewRow label="Cancellation" value={listing.cancellationPolicy.summary} />
      </dl>

      <div className="mt-6 rounded-card border border-ink-200 p-5">
        <h3 className="flex items-center gap-2 text-base font-bold">
          <IconLock className="text-brand-600" aria-hidden="true" />
          Secure checkout
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
          Payments are securely processed by Stripe. ParkPlugs never stores your
          full card details.
        </p>

        {paymentsConfigured ? (
          // Stripe Elements mounts here once the provider is connected.
          <div
            id="payment-element"
            className="mt-4 min-h-32 rounded-xl border border-dashed border-ink-300 bg-ink-50 p-4"
          >
            <p className="text-sm text-ink-500">Loading secure payment form…</p>
          </div>
        ) : (
          <Alert tone="neutral" className="mt-4">
            The payment form appears here once a payment provider is connected to
            this environment.
          </Alert>
        )}
      </div>

      <div className="mt-6">
        <Checkbox
          label={
            <>
              I agree to ParkPlugs&rsquo;s{" "}
              <Link href="/legal/terms" className="font-bold text-brand-700 underline underline-offset-2">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/legal/cancellation" className="font-bold text-brand-700 underline underline-offset-2">
                Cancellation Policy
              </Link>
              .
            </>
          }
          checked={terms}
          error={err("terms")}
          onChange={(e) => setTerms(e.target.checked)}
        />
      </div>
    </section>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-3.5">
      <dt className="text-sm text-ink-600">{label}</dt>
      <dd className="text-sm font-semibold text-ink-900">{value}</dd>
    </div>
  );
}

function BookingSkeleton() {
  return (
    <Container size="default" className="py-10">
      <div role="status" aria-busy="true">
        <span className="sr-only">Loading reservation</span>
        <Skeleton className="h-2 w-full" rounded="rounded-full" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-4">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-32 w-full" rounded="rounded-card" />
          </div>
          <Skeleton className="h-64 w-full" rounded="rounded-card" />
        </div>
      </div>
    </Container>
  );
}
