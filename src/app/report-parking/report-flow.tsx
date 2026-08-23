"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { reports as reportsApi } from "@/lib/api";
import { getCurrentPosition, LOCATION_ERROR_COPY, toApproximateLocation } from "@/lib/geo";
import { formatTimeRemaining, toIso, toDateInput, toTimeInput } from "@/lib/format";
import { newId } from "@/lib/api/store";
import {
  REPORT_RESTRICTIONS,
  type Coordinates,
  type FreeParkingReport,
  type ReportConfidence,
  type ReportRestriction,
} from "@/lib/types";
import { Container } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, CommunityParkingNotice } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Field,
  Fieldset,
  FormErrorSummary,
  Input,
  RadioCard,
  Select,
  Textarea,
  TogglePill,
} from "@/components/ui/form";
import { Stepper } from "@/components/ui/menu";
import { useToast } from "@/components/ui/toast";
import {
  IconAlert,
  IconArrowLeft,
  IconCamera,
  IconCheckCircle,
  IconCrosshair,
  IconMapPin,
} from "@/components/ui/icons";
import { ParkingMap } from "@/components/map/parking-map";
import { DestinationInput } from "@/components/search/destination-input";

const STEPS = ["Location", "Availability", "Restrictions", "Evidence", "Review"];

type Draft = {
  center: Coordinates | null;
  label: string;
  city: string;
  state: string;
  spacesObserved: number;
  observedDate: string;
  observedTime: string;
  sideOfStreet: string;
  landmark: string;
  confidence: ReportConfidence;
  restrictions: ReportRestriction[];
  timeLimitMinutes: string;
  restrictionNotes: string;
  notes: string;
  photoName: string;
};

function nowParts() {
  const now = new Date().toISOString();
  return { date: toDateInput(now), time: toTimeInput(now) };
}

export function ReportFlow() {
  const router = useRouter();
  const { toast } = useToast();
  const initial = nowParts();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    center: null,
    label: "",
    city: "",
    state: "",
    spacesObserved: 1,
    observedDate: initial.date,
    observedTime: initial.time,
    sideOfStreet: "",
    landmark: "",
    confidence: "medium",
    restrictions: [],
    timeLimitMinutes: "",
    restrictionNotes: "",
    notes: "",
    photoName: "",
  });
  const [errors, setErrors] = useState<Array<{ field: string; message: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<FreeParkingReport | null>(null);
  const [locating, setLocating] = useState(false);

  const summaryRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  function patch(next: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...next }));
  }

  async function applyMyPosition() {
    setLocating(true);
    const result = await getCurrentPosition();
    setLocating(false);
    if (!result.ok) {
      const copy = LOCATION_ERROR_COPY[result.reason];
      toast({ tone: "warning", title: copy.title, description: copy.description });
      return;
    }
    patch({ center: result.center, label: "Your current location" });
  }

  function validate(index: number) {
    const found: Array<{ field: string; message: string }> = [];
    if (index === 0 && !draft.center) {
      found.push({ field: "center", message: "Choose where the parking is, or use your current location." });
    }
    if (index === 1) {
      if (draft.spacesObserved < 1) {
        found.push({ field: "spaces", message: "Enter how many spaces you saw." });
      }
      const observed = toIso(draft.observedDate, draft.observedTime);
      if (!observed) {
        found.push({ field: "observed", message: "Enter when you saw the parking." });
      } else if (new Date(observed).getTime() > Date.now() + 60_000) {
        found.push({ field: "observed", message: "The time you observed the parking cannot be in the future." });
      }
    }
    if (index === 2 && draft.restrictions.length === 0) {
      found.push({
        field: "restrictions",
        message: "Choose at least one option — pick “Restrictions unknown” if you are not sure.",
      });
    }
    return found;
  }

  // Without this, fixing a flagged field (e.g. choosing a location) left its
  // error message on screen until the next "Continue" click, even though it
  // was already valid again.
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
  }

  async function submit() {
    if (submitting || !draft.center) return;
    setSubmitting(true);
    setSubmitError(null);

    const observedAt = toIso(draft.observedDate, draft.observedTime) ?? new Date().toISOString();
    const result = await reportsApi.create({
      location: toApproximateLocation({
        id: newId("rpt"),
        street: draft.label,
        city: draft.city || draft.label,
        state: draft.state,
        center: draft.center,
      }),
      observedAt,
      spacesObserved: draft.spacesObserved,
      sideOfStreet: draft.sideOfStreet || undefined,
      landmark: draft.landmark || undefined,
      restrictions: draft.restrictions,
      restrictionNotes: draft.restrictionNotes || undefined,
      timeLimitMinutes: draft.timeLimitMinutes ? Number(draft.timeLimitMinutes) : undefined,
      confidence: draft.confidence,
      notes: draft.notes || undefined,
    });

    setSubmitting(false);
    if (result.ok) setSubmitted(result.data);
    else setSubmitError(result.error.message);
  }

  const err = (field: string) => errors.find((e) => e.field === field)?.message ?? null;

  /* ---------------------------- Confirmation ---------------------------- */

  if (submitted) {
    return (
      <Container size="narrow" className="py-8 lg:py-12">
        <div className="rounded-card border-2 border-success-500 bg-success-50 p-6 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-500 text-2xl text-white">
            <IconCheckCircle aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Thanks — your report is live</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">
            Nearby drivers can now see this parking on the map.
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-card border border-ink-200">
          <ParkingMap
            center={submitted.location.center}
            zoom={16}
            reports={[submitted]}
            className="h-64"
            showRecenter={false}
            ariaLabel={`Map showing your report near ${submitted.location.label}`}
          />
          <dl className="divide-y divide-ink-200 bg-white">
            {[
              ["Approximate location", submitted.location.label],
              ["Spaces reported", String(submitted.spacesObserved)],
              ["Expires", formatTimeRemaining(submitted.expiresAt)],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-wrap justify-between gap-3 px-4 py-3 text-sm">
                <dt className="text-ink-600">{label}</dt>
                <dd className="font-semibold text-ink-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Alert tone="info" className="mt-4">
          Reports expire on their own because street parking changes quickly. If
          you see the space is taken, come back and mark it so other drivers are
          not sent to a full street.
        </Alert>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            fullWidth
            onClick={() => {
              setSubmitted(null);
              setStep(0);
              setDraft({
                ...draft,
                center: null,
                label: "",
                spacesObserved: 1,
                restrictions: [],
                notes: "",
                landmark: "",
                sideOfStreet: "",
              });
            }}
          >
            Report Another Space
          </Button>
          <ButtonLink href="/parking?free=1" variant="secondary" fullWidth>
            Return to Map
          </ButtonLink>
        </div>
      </Container>
    );
  }

  /* -------------------------------- Flow -------------------------------- */

  return (
    <Container size="narrow" className="py-6 lg:py-10">
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          leadingIcon={<IconArrowLeft />}
          onClick={() => (step === 0 ? router.push("/") : setStep((s) => s - 1))}
        >
          {step === 0 ? "Cancel" : "Back"}
        </Button>
      </div>

      {step === 0 ? (
        <div className="mt-4">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Report free parking
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            Community reports help drivers discover recently observed parking.
            Availability is not guaranteed. Always follow posted signs and local
            parking laws.
          </p>
        </div>
      ) : null}

      <Stepper steps={STEPS} current={step} onStepClick={(i) => setStep(i)} className="mt-6" />

      {errors.length > 0 ? (
        <div ref={summaryRef} tabIndex={-1} className="mt-6 focus:outline-none">
          <FormErrorSummary errors={errors} />
        </div>
      ) : null}

      {submitError ? (
        <Alert tone="danger" live className="mt-6" title="Your report could not be submitted">
          <p>{submitError}</p>
          <p className="mt-2 font-medium">Everything you entered is still here — try again.</p>
        </Alert>
      ) : null}

      <div className="mt-6 rounded-card border border-ink-200 bg-white p-5 sm:p-6">
        {/* ------------------------------------------------------ Step 1 */}
        {step === 0 ? (
          <section>
            <h2 className="text-lg font-bold tracking-tight">Where is the parking?</h2>
            <p className="mt-1.5 text-sm text-ink-600">
              Use your location if you are there now, or search for the street.
            </p>

            <div className="mt-5 space-y-4">
              <Button
                fullWidth
                variant="secondary"
                size="lg"
                leadingIcon={<IconCrosshair />}
                loading={locating}
                loadingText="Finding you…"
                onClick={() => void applyMyPosition()}
              >
                Use my current location
              </Button>

              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-ink-200" />
                <span className="text-xs font-medium text-ink-500">or</span>
                <span className="h-px flex-1 bg-ink-200" />
              </div>

              <DestinationInput
                label="Search an address"
                placeholder="Street, intersection, or landmark"
                value={draft.label}
                onChange={(label) => patch({ label, center: null })}
                onSelect={(match) => {
                  const parts = match.label.split(",").map((p) => p.trim());
                  patch({
                    center: match.center,
                    label: parts[0] ?? match.label,
                    city: parts[1] ?? "",
                    state: parts[2] ?? "",
                  });
                }}
                error={err("center")}
              />
            </div>

            {draft.center ? (
              <>
                <div className="mt-5 overflow-hidden rounded-card border border-ink-200">
                  <ParkingMap
                    center={draft.center}
                    zoom={17}
                    destination={draft.center}
                    className="h-56"
                    showRecenter={false}
                    showLocateMe
                    onBoundsChange={(center) => patch({ center })}
                    ariaLabel="Drag the map to fine-tune where the parking is"
                  />
                </div>
                <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-500">
                  <IconMapPin className="mt-px shrink-0" aria-hidden="true" />
                  Move the map to fine-tune the position. Reports are published as
                  an approximate area, never an exact address.
                </p>
              </>
            ) : null}
          </section>
        ) : null}

        {/* ------------------------------------------------------ Step 2 */}
        {step === 1 ? (
          <section>
            <h2 className="text-lg font-bold tracking-tight">What did you see?</h2>
            <div className="mt-5 space-y-5">
              <Field label="Number of spaces you saw" required error={err("spaces")}>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  inputMode="numeric"
                  value={draft.spacesObserved}
                  onChange={(e) => patch({ spacesObserved: Number(e.target.value) })}
                />
              </Field>

              <fieldset>
                <legend className="text-sm font-semibold text-ink-800">
                  When did you see it?
                  <span aria-hidden="true" className="ml-0.5 text-danger-600">*</span>
                </legend>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    aria-label="Date observed"
                    value={draft.observedDate}
                    onChange={(e) => patch({ observedDate: e.target.value })}
                  />
                  <Input
                    type="time"
                    aria-label="Time observed"
                    value={draft.observedTime}
                    onChange={(e) => patch({ observedTime: e.target.value })}
                  />
                </div>
                {err("observed") ? (
                  <p className="mt-1.5 text-xs font-medium text-danger-700">{err("observed")}</p>
                ) : null}
              </fieldset>

              <Field label="Side of the street" optional>
                <Select
                  value={draft.sideOfStreet}
                  onChange={(e) => patch({ sideOfStreet: e.target.value })}
                  placeholder="Choose a side"
                >
                  {["North", "South", "East", "West", "Both sides", "Not applicable"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Nearby landmark" optional hint="Helps drivers find the exact block.">
                <Input
                  value={draft.landmark}
                  onChange={(e) => patch({ landmark: e.target.value })}
                  placeholder="Across from the library"
                  maxLength={80}
                />
              </Field>

              <Fieldset
                legend="How confident are you?"
                description="Higher confidence keeps your report visible for longer."
              >
                <ul className="grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["high", "Very confident", "I am there now and counted the spaces."],
                      ["medium", "Fairly confident", "I saw it recently while passing."],
                      ["low", "Not certain", "I glanced quickly, or it was a while ago."],
                    ] as const
                  ).map(([value, title, description]) => (
                    <li key={value}>
                      <RadioCard
                        name="confidence"
                        value={value}
                        checked={draft.confidence === value}
                        onChange={(v) => patch({ confidence: v as ReportConfidence })}
                        title={title}
                        description={description}
                      />
                    </li>
                  ))}
                </ul>
              </Fieldset>
            </div>
          </section>
        ) : null}

        {/* ------------------------------------------------------ Step 3 */}
        {step === 2 ? (
          <section>
            <h2 className="text-lg font-bold tracking-tight">What do the signs say?</h2>
            <p className="mt-1.5 text-sm text-ink-600">
              Restrictions are the most useful part of a report — they stop other
              drivers getting a ticket.
            </p>

            <div className="mt-5 space-y-5">
              <Fieldset legend="Posted restrictions" error={err("restrictions")}>
                <ul className="flex flex-wrap gap-2">
                  {REPORT_RESTRICTIONS.map((restriction) => (
                    <li key={restriction.value}>
                      <TogglePill
                        pressed={draft.restrictions.includes(restriction.value)}
                        onToggle={() =>
                          patch({
                            restrictions: draft.restrictions.includes(restriction.value)
                              ? draft.restrictions.filter((r) => r !== restriction.value)
                              : [...draft.restrictions, restriction.value],
                          })
                        }
                      >
                        {restriction.label}
                      </TogglePill>
                    </li>
                  ))}
                </ul>
              </Fieldset>

              {draft.restrictions.includes("time_limited") ? (
                <Field label="Time limit" hint="As posted on the sign.">
                  <Select
                    value={draft.timeLimitMinutes}
                    onChange={(e) => patch({ timeLimitMinutes: e.target.value })}
                    placeholder="Choose a limit"
                  >
                    {[15, 30, 60, 120, 180, 240].map((m) => (
                      <option key={m} value={m}>
                        {m < 60 ? `${m} minutes` : `${m / 60} hour${m > 60 ? "s" : ""}`}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}

              <Field label="Anything else on the sign?" optional>
                <Textarea
                  value={draft.restrictionNotes}
                  onChange={(e) => patch({ restrictionNotes: e.target.value })}
                  maxLength={300}
                  className="min-h-20"
                  placeholder="No parking 8–10am Tuesdays for street cleaning."
                />
              </Field>
            </div>
          </section>
        ) : null}

        {/* ------------------------------------------------------ Step 4 */}
        {step === 3 ? (
          <section>
            <h2 className="text-lg font-bold tracking-tight">Add a photo or note</h2>
            <p className="mt-1.5 text-sm text-ink-600">
              Optional, but a photo of the sign helps other drivers trust the report.
            </p>

            <div className="mt-5 space-y-5">
              <div>
                <Button
                  variant="secondary"
                  leadingIcon={<IconCamera />}
                  onClick={() => photoRef.current?.click()}
                >
                  {draft.photoName ? "Change photo" : "Add a photo of the sign"}
                </Button>
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  aria-label="Add a photo of the parking sign"
                  onChange={(e) => patch({ photoName: e.target.files?.[0]?.name ?? "" })}
                />
                {draft.photoName ? (
                  <p className="mt-2 text-xs font-medium text-success-700">
                    Attached: {draft.photoName}
                  </p>
                ) : null}
              </div>

              <Alert tone="warning" icon={<IconAlert />} title="Please keep photos to the sign">
                Do not include license plates, faces, house numbers, or anything
                with personal information. Reports are public.
              </Alert>

              <Field label="Notes for other drivers" optional>
                <Textarea
                  value={draft.notes}
                  onChange={(e) => patch({ notes: e.target.value })}
                  maxLength={300}
                  className="min-h-24"
                  placeholder="Tight spot — easier for a compact car."
                />
              </Field>
            </div>
          </section>
        ) : null}

        {/* ------------------------------------------------------ Step 5 */}
        {step === 4 ? (
          <section>
            <h2 className="text-lg font-bold tracking-tight">Review your report</h2>

            {draft.center ? (
              <div className="mt-5 overflow-hidden rounded-card border border-ink-200">
                <ParkingMap
                  center={draft.center}
                  zoom={16}
                  destination={draft.center}
                  className="h-48"
                  showRecenter={false}
                  ariaLabel="Where your report will appear"
                />
              </div>
            ) : null}

            <dl className="mt-4 divide-y divide-ink-200 overflow-hidden rounded-card border border-ink-200">
              {[
                ["Approximate street", draft.label || "—"],
                ["Spaces", String(draft.spacesObserved)],
                ["Observed", `${draft.observedDate} at ${draft.observedTime}`],
                ["Side of street", draft.sideOfStreet || "Not specified"],
                ["Landmark", draft.landmark || "Not specified"],
                ["Confidence", draft.confidence],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-wrap justify-between gap-3 px-4 py-3 text-sm">
                  <dt className="text-ink-600">{label}</dt>
                  <dd className="font-semibold capitalize text-ink-900">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4">
              <h3 className="text-sm font-bold text-ink-900">Restrictions</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {draft.restrictions.map((r) => (
                  <li key={r}>
                    <Badge tone="warning" size="sm">
                      {REPORT_RESTRICTIONS.find((x) => x.value === r)?.label}
                    </Badge>
                  </li>
                ))}
              </ul>
              {draft.restrictionNotes ? (
                <p className="mt-2 text-sm text-ink-700">{draft.restrictionNotes}</p>
              ) : null}
            </div>

            <Alert tone="info" className="mt-5" title="How long this stays visible">
              Reports expire automatically —{" "}
              {draft.confidence === "high" ? "about 4 hours" : draft.confidence === "medium" ? "about 2 hours" : "about 1 hour"}{" "}
              for the confidence level you chose. Other drivers can confirm it is
              still there, which extends it.
            </Alert>

            <CommunityParkingNotice className="mt-4" />
          </section>
        ) : null}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-ink-200 pt-6 sm:flex-row sm:justify-between">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => (step === 0 ? router.push("/") : setStep((s) => s - 1))}
            disabled={submitting}
          >
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          <Button size="lg" onClick={next} loading={submitting} loadingText="Submitting…">
            {step === STEPS.length - 1 ? "Submit report" : "Continue"}
          </Button>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-ink-500">
        By reporting, you agree to the{" "}
        <Link href="/legal/community-guidelines" className="font-semibold text-brand-700 underline underline-offset-2">
          Community Reporting Guidelines
        </Link>
        .
      </p>
    </Container>
  );
}
