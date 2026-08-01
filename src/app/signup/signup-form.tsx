"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { auth } from "@/lib/api";
import { ERROR_COPY } from "@/lib/api/result";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormErrorSummary, Input, PasswordInput } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import {
  AuthShell,
  PasswordRequirements,
  isValidEmail,
  passwordMeetsRequirements,
} from "@/components/auth/auth-shell";

export function SignUpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const session = useSession();
  const next = params.get("next") ?? "/dashboard";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [errors, setErrors] = useState<Array<{ field: string; message: string }>>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const err = (field: string) => errors.find((e) => e.field === field)?.message ?? null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const found: Array<{ field: string; message: string }> = [];
    if (!fullName.trim()) found.push({ field: "name", message: "Enter your full name." });
    if (!email.trim()) found.push({ field: "email", message: "Enter your email address." });
    else if (!isValidEmail(email)) found.push({ field: "email", message: "Enter a valid email address." });
    if (!password) found.push({ field: "password", message: "Choose a password." });
    else if (!passwordMeetsRequirements(password))
      found.push({ field: "password", message: "Your password does not meet all the requirements." });
    if (!agreed)
      found.push({ field: "terms", message: "Agree to the Terms of Service and Privacy Policy." });
    if (!ageConfirmed)
      found.push({ field: "age", message: "Confirm you are at least 18 years old." });

    setErrors(found);
    setFormError(null);
    if (found.length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    setSubmitting(true);
    const result = await auth.signUp({ fullName, email, password });
    setSubmitting(false);

    if (result.ok) {
      await session.refresh();
      router.push(`/verify-email?next=${encodeURIComponent(next)}`);
      return;
    }

    if (result.error.fieldErrors) {
      setErrors(
        Object.entries(result.error.fieldErrors).map(([field, message]) => ({ field, message })),
      );
      requestAnimationFrame(() => summaryRef.current?.focus());
    } else {
      setFormError(result.error.message || ERROR_COPY[result.error.code].description);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      description="One account covers finding parking, hosting a space, and reporting free parking."
      footer={
        <>
          Already have an account?{" "}
          <Link href={`/signin?next=${encodeURIComponent(next)}`} className="font-bold text-brand-700 underline underline-offset-2">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        {errors.length > 0 ? (
          <div ref={summaryRef} tabIndex={-1} className="focus:outline-none">
            <FormErrorSummary errors={errors} />
          </div>
        ) : null}

        {formError ? (
          <Alert tone="danger" live title="We could not create your account">
            {formError}
          </Alert>
        ) : null}

        <Field label="Full name" required error={err("name")}>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            placeholder="Alex Rivera"
            enterKeyHint="next"
          />
        </Field>

        <Field label="Email" required error={err("email")}>
          <Input
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            enterKeyHint="next"
          />
        </Field>

        <div>
          <Field label="Password" required error={err("password")}>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Create a password"
              enterKeyHint="done"
            />
          </Field>
          <PasswordRequirements value={password} />
        </div>

        <div className="space-y-3.5 border-t border-ink-200 pt-5">
          <Checkbox
            label={
              <>
                I agree to the{" "}
                <Link href="/legal/terms" className="font-bold text-brand-700 underline underline-offset-2">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/legal/privacy" className="font-bold text-brand-700 underline underline-offset-2">
                  Privacy Policy
                </Link>
                .
              </>
            }
            checked={agreed}
            error={err("terms")}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <Checkbox
            label="I am at least 18 years old."
            checked={ageConfirmed}
            error={err("age")}
            onChange={(e) => setAgeConfirmed(e.target.checked)}
          />
        </div>

        <Button type="submit" size="lg" fullWidth loading={submitting} loadingText="Creating account…">
          Create Account
        </Button>
      </form>
    </AuthShell>
  );
}
