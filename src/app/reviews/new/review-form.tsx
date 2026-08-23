"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { reservations as reservationsApi, reviews as reviewsApi } from "@/lib/api";
import { formatRange } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import { Container } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Field, FormErrorSummary, Textarea } from "@/components/ui/form";
import { IconCheckCircle, IconStar } from "@/components/ui/icons";

const DRIVER_CATEGORIES = [
  { key: "accuracy", label: "Accuracy", hint: "Did the space match the listing?" },
  { key: "access", label: "Ease of access", hint: "How easy was it to get in and out?" },
  { key: "safety", label: "Safety and comfort", hint: "Did you feel comfortable leaving your car?" },
  { key: "value", label: "Value", hint: "Was it worth what you paid?" },
] as const;

const HOST_CATEGORIES = [
  { key: "communication", label: "Communication", hint: "Were they easy to reach and clear?" },
  { key: "timeliness", label: "Timeliness", hint: "Did they arrive and leave on time?" },
  { key: "ruleCompliance", label: "Rule compliance", hint: "Did they follow your parking rules?" },
] as const;

export function ReviewForm() {
  const params = useSearchParams();
  const reference = params.get("reservation") ?? "";
  const asHost = params.get("as") === "host";

  const state = useAsync(() => reservationsApi.get(reference), [reference]);

  const [overall, setOverall] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [body, setBody] = useState("");
  const [privateFeedback, setPrivateFeedback] = useState("");
  const [errors, setErrors] = useState<Array<{ field: string; message: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const categories = asHost ? HOST_CATEGORIES : DRIVER_CATEGORIES;

  if (!reference) {
    return (
      <Container size="narrow" className="py-16">
        <EmptyState
          icon={<IconStar />}
          title="Nothing to review yet"
          description="Open a completed reservation and choose “Leave a review” to get started."
          actions={[{ label: "My reservations", href: "/dashboard/reservations" }]}
        />
      </Container>
    );
  }

  if (state.status === "loading") {
    return (
      <Container size="narrow" className="py-10">
        <Skeleton className="h-80 w-full" rounded="rounded-card" />
      </Container>
    );
  }

  if (state.status === "error") {
    return (
      <Container size="narrow" className="py-16">
        <ErrorState
          title="We could not find that reservation"
          description={state.error.message}
          actions={[{ label: "My reservations", href: "/dashboard/reservations" }]}
        />
      </Container>
    );
  }

  const reservation = state.data;

  /* ------------------------- Eligibility states ------------------------- */

  if (reservation.status === "canceled") {
    return (
      <Container size="narrow" className="py-16">
        <EmptyState
          icon={<IconStar />}
          title="This reservation was canceled"
          description="Reviews are only available for reservations that were actually used."
          actions={[{ label: "My reservations", href: "/dashboard/reservations" }]}
        />
      </Container>
    );
  }

  if (new Date(reservation.endAt).getTime() > Date.now()) {
    return (
      <Container size="narrow" className="py-16">
        <EmptyState
          icon={<IconStar />}
          title="Not eligible to review yet"
          description={`You can review this space after your reservation ends on ${formatRange(
            reservation.startAt,
            reservation.endAt,
          )}.`}
          actions={[
            { label: "View reservation", href: `/reservations/${reservation.reference}` },
          ]}
        />
      </Container>
    );
  }

  if (!reservation.canReview && !done) {
    return (
      <Container size="narrow" className="py-16">
        <EmptyState
          icon={<IconCheckCircle />}
          title="You have already reviewed this reservation"
          description="Thanks — your review helps other drivers choose with confidence."
          actions={[
            { label: "View the space", href: `/spaces/${reservation.listing.slug}` },
            { label: "My reservations", href: "/dashboard/reservations", variant: "secondary" },
          ]}
        />
      </Container>
    );
  }

  if (done) {
    return (
      <Container size="narrow" className="py-16">
        <div className="rounded-card border-2 border-success-500 bg-success-50 p-6 text-center sm:p-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-500 text-2xl text-white">
            <IconCheckCircle aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Thanks for your review</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">
            It will appear on the listing shortly. Any private feedback goes only to
            the {asHost ? "driver" : "host"}.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/dashboard/reservations" variant="secondary" fullWidth>
            My reservations
          </ButtonLink>
          <ButtonLink href="/parking" fullWidth>
            Find Parking
          </ButtonLink>
        </div>
      </Container>
    );
  }

  /* -------------------------------- Form -------------------------------- */

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const found: Array<{ field: string; message: string }> = [];
    if (overall === 0) found.push({ field: "overall", message: "Choose an overall rating." });
    categories.forEach((category) => {
      if (!scores[category.key]) {
        found.push({ field: category.key, message: `Rate ${category.label.toLowerCase()}.` });
      }
    });
    if (body.trim().length < 10) {
      found.push({ field: "body", message: "Write at least a sentence about your experience." });
    }

    setErrors(found);
    setFormError(null);
    if (found.length > 0) return;

    setSubmitting(true);
    const result = await reviewsApi.create({
      reservationId: reservation.id,
      listingId: reservation.listing.id,
      rating: overall,
      categories: asHost
        ? undefined
        : {
            accuracy: scores.accuracy,
            access: scores.access,
            safety: scores.safety,
            value: scores.value,
          },
      driverScores: asHost
        ? {
            communication: scores.communication,
            timeliness: scores.timeliness,
            ruleCompliance: scores.ruleCompliance,
          }
        : undefined,
      body: body.trim(),
      privateFeedback: privateFeedback.trim() || undefined,
    });
    setSubmitting(false);

    if (result.ok) setDone(true);
    else setFormError(result.error.message);
  }

  const err = (field: string) => errors.find((e) => e.field === field)?.message ?? null;

  return (
    <Container size="narrow" className="py-8 lg:py-12">
      <Link
        href={`/reservations/${reservation.reference}`}
        className="text-xs font-semibold text-ink-600 underline-offset-2 hover:text-brand-700 hover:underline"
      >
        ← Back to reservation
      </Link>

      <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
        {asHost ? "Review this driver" : "Review this space"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-600">
        {reservation.listing.title} · {formatRange(reservation.startAt, reservation.endAt)}
      </p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-7">
        {errors.length > 0 ? <FormErrorSummary errors={errors} /> : null}

        {formError ? (
          <Alert tone="danger" live title="Your review could not be submitted">
            <p>{formError}</p>
            <p className="mt-2 font-medium">What you wrote is still here — try again.</p>
          </Alert>
        ) : null}

        <fieldset>
          <legend className="text-base font-bold text-ink-900">
            Overall rating
            <span aria-hidden="true" className="ml-0.5 text-danger-600">*</span>
          </legend>
          <StarPicker value={overall} onChange={setOverall} label="Overall rating" size="lg" />
          {err("overall") ? (
            <p className="mt-1.5 text-xs font-medium text-danger-700">{err("overall")}</p>
          ) : null}
        </fieldset>

        <fieldset className="space-y-5 rounded-card border border-ink-200 p-5">
          <legend className="px-1 text-base font-bold text-ink-900">Rate the details</legend>
          {categories.map((category) => (
            <div key={category.key}>
              <p className="text-sm font-semibold text-ink-800">{category.label}</p>
              <p className="text-xs text-ink-500">{category.hint}</p>
              <StarPicker
                value={scores[category.key] ?? 0}
                onChange={(v) => setScores((s) => ({ ...s, [category.key]: v }))}
                label={category.label}
              />
              {err(category.key) ? (
                <p className="mt-1 text-xs font-medium text-danger-700">{err(category.key)}</p>
              ) : null}
            </div>
          ))}
        </fieldset>

        <Field
          label="Your review"
          required
          error={err("body")}
          hint="This is public. Describe what the experience was actually like."
        >
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1500}
            className="min-h-32"
            placeholder={
              asHost
                ? "Did they arrive on time, park where asked, and leave the space tidy?"
                : "Was the space easy to find? Did it match the listing? Anything the next driver should know?"
            }
          />
        </Field>

        <Field
          label={`Private feedback for the ${asHost ? "driver" : "host"}`}
          optional
          hint="Not published. Only they will see it."
        >
          <Textarea
            value={privateFeedback}
            onChange={(e) => setPrivateFeedback(e.target.value)}
            maxLength={800}
            className="min-h-24"
          />
        </Field>

        <Alert tone="neutral">
          Reviews should describe your own experience. Please do not include personal
          details, and do not use a review to press for a refund —{" "}
          <Link href="/support" className="font-semibold underline underline-offset-2">
            contact support
          </Link>{" "}
          for that.
        </Alert>

        <Button type="submit" size="lg" fullWidth loading={submitting} loadingText="Submitting…">
          Submit review
        </Button>
      </form>
    </Container>
  );
}

function StarPicker({
  value,
  onChange,
  label,
  size = "md",
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  size?: "md" | "lg";
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="mt-2 flex items-center gap-1"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault();
          onChange(Math.min(5, value + 1));
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault();
          onChange(Math.max(1, value - 1));
        }
      }}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} out of 5`}
          tabIndex={value === star || (value === 0 && star === 1) ? 0 : -1}
          onClick={() => onChange(star)}
          className={cn(
            "rounded-lg p-1 transition-transform hover:scale-110",
            size === "lg" ? "text-3xl" : "text-2xl",
            star <= value ? "text-accent-500" : "text-ink-300",
          )}
        >
          <IconStar className={star <= value ? "fill-current" : ""} aria-hidden="true" />
        </button>
      ))}
      <span className="ml-2 text-sm font-semibold tabular-nums text-ink-600" aria-live="polite">
        {value > 0 ? `${value} of 5` : "Not rated"}
      </span>
    </div>
  );
}
