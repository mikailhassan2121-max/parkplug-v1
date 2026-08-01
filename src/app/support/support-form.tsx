"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { support } from "@/lib/api";
import { business } from "@/config/business";
import { useSession } from "@/lib/session";
import { Container, SectionHeading } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, FormErrorSummary, Input, Select, Textarea } from "@/components/ui/form";
import { IconAlert, IconCheckCircle, IconUpload } from "@/components/ui/icons";
import { isValidEmail } from "@/components/auth/auth-shell";

const CATEGORIES = [
  "Booking issue",
  "Payment issue",
  "Host issue",
  "Driver issue",
  "Listing problem",
  "Public-parking report",
  "Safety concern",
  "Account issue",
  "Technical problem",
  "Other",
];

export function SupportForm() {
  const params = useSearchParams();
  const session = useSession();
  const summaryRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState("");
  const [reference, setReference] = useState(params.get("ref") ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [preferredResponse, setPreferredResponse] = useState("email");
  const [attachmentName, setAttachmentName] = useState("");
  const [errors, setErrors] = useState<Array<{ field: string; message: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);

  // Pre-fill from the signed-in account so people are not retyping.
  useEffect(() => {
    if (session.user) {
      setName((current) => current || session.user!.fullName);
      setEmail((current) => current || session.user!.email);
    }
  }, [session.user]);

  const err = (field: string) => errors.find((e) => e.field === field)?.message ?? null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const found: Array<{ field: string; message: string }> = [];
    if (!category) found.push({ field: "category", message: "Choose what your message is about." });
    if (!name.trim()) found.push({ field: "name", message: "Enter your name." });
    if (!email.trim()) found.push({ field: "email", message: "Enter your email address." });
    else if (!isValidEmail(email)) found.push({ field: "email", message: "Enter a valid email address." });
    if (!description.trim()) found.push({ field: "description", message: "Describe what happened." });
    else if (description.trim().length < 20)
      found.push({ field: "description", message: "Add a little more detail so we can help properly." });

    setErrors(found);
    setFormError(null);
    if (found.length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    setSubmitting(true);
    const result = await support.createTicket({
      category,
      reference: reference || undefined,
      name: name.trim(),
      email: email.trim(),
      description: description.trim(),
      preferredResponse,
      attachmentName: attachmentName || undefined,
    });
    setSubmitting(false);

    if (result.ok) setTicket(result.data.ticketReference);
    else setFormError(result.error.message);
  }

  if (ticket) {
    return (
      <Container size="narrow" className="py-12 lg:py-20">
        <div className="rounded-card border-2 border-success-500 bg-success-50 p-6 text-center sm:p-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-500 text-2xl text-white">
            <IconCheckCircle aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">We have your message</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">
            Your reference is{" "}
            <strong className="font-mono font-bold text-ink-950">{ticket}</strong>. We
            have emailed a copy to {email}.
          </p>
          {business.supportResponseTime ? (
            <p className="mt-2 text-sm text-ink-700">
              We aim to reply within {business.supportResponseTime}.
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/help" variant="secondary" fullWidth>
            Back to Help Center
          </ButtonLink>
          <ButtonLink href="/" fullWidth>
            Return home
          </ButtonLink>
        </div>
      </Container>
    );
  }

  return (
    <Container size="narrow" className="py-8 lg:py-14">
      <SectionHeading
        as="h1"
        title="Contact support"
        description="Tell us what happened and we will pick it up. Including a reservation or listing reference helps us find it faster."
      />

      <Alert tone="warning" className="mt-6" icon={<IconAlert />} title="In an emergency">
        For immediate danger or emergencies, contact local emergency services.
        ParkPlug support cannot respond to emergencies.
      </Alert>

      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        {errors.length > 0 ? (
          <div ref={summaryRef} tabIndex={-1} className="focus:outline-none">
            <FormErrorSummary errors={errors} />
          </div>
        ) : null}

        {formError ? (
          <Alert tone="danger" live title="Your message could not be sent">
            <p>{formError}</p>
            <p className="mt-2 font-medium">
              Everything you typed is still here — try again in a moment.
            </p>
          </Alert>
        ) : null}

        <Field label="What is this about?" required error={err("category")}>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Choose a category"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Reservation or listing reference"
          optional
          hint="For example PP-4KD9-27XA. You can find this on your reservation."
        >
          <Input
            value={reference}
            onChange={(e) => setReference(e.target.value.toUpperCase())}
            placeholder="PP-XXXX-XXXX"
            className="font-mono uppercase"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Your name" required error={err("name")}>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
          <Field label="Email" required error={err("email")}>
            <Input
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </Field>
        </div>

        <Field
          label="What happened?"
          required
          error={err("description")}
          hint="Dates, times, and what you expected to happen all help."
        >
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            className="min-h-36"
            placeholder="Describe the problem in your own words."
          />
        </Field>

        <div>
          <span className="block text-sm font-semibold text-ink-800">Attachment</span>
          <span className="mt-0.5 block text-xs text-ink-500">
            Optional. A screenshot or photo often explains it faster than words.
          </span>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            leadingIcon={<IconUpload />}
            onClick={() => fileRef.current?.click()}
          >
            {attachmentName ? "Change file" : "Choose a file"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            aria-label="Attach a file to your support request"
            onChange={(e) => setAttachmentName(e.target.files?.[0]?.name ?? "")}
          />
          {attachmentName ? (
            <p className="mt-2 text-xs font-medium text-success-700">Attached: {attachmentName}</p>
          ) : null}
        </div>

        <Field label="How should we reply?" required>
          <Select
            value={preferredResponse}
            onChange={(e) => setPreferredResponse(e.target.value)}
          >
            <option value="email">Email</option>
            <option value="in_app">ParkPlug notification</option>
          </Select>
        </Field>

        <Button type="submit" size="lg" fullWidth loading={submitting} loadingText="Sending…">
          Send message
        </Button>

        <p className="text-center text-xs leading-relaxed text-ink-500">
          By sending this you agree to our{" "}
          <Link href="/legal/privacy" className="font-semibold text-brand-700 underline underline-offset-2">
            Privacy Policy
          </Link>
          . Please do not include card numbers or passwords.
        </p>
      </form>
    </Container>
  );
}
