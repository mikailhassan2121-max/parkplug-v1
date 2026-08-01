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
import { AuthShell, isValidEmail } from "@/components/auth/auth-shell";

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const session = useSession();
  const next = params.get("next") ?? "/dashboard";
  const expired = params.get("expired") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Array<{ field: string; message: string }>>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const err = (field: string) => errors.find((e) => e.field === field)?.message ?? null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const found: Array<{ field: string; message: string }> = [];
    if (!email.trim()) found.push({ field: "email", message: "Enter your email address." });
    else if (!isValidEmail(email)) found.push({ field: "email", message: "Enter a valid email address." });
    if (!password) found.push({ field: "password", message: "Enter your password." });

    setErrors(found);
    setFormError(null);
    if (found.length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }

    setSubmitting(true);
    const result = await auth.signIn({ email, password });
    setSubmitting(false);

    if (result.ok) {
      await session.refresh();
      router.push(next);
      return;
    }
    setFormError(result.error.message || ERROR_COPY[result.error.code].description);
  }

  return (
    <AuthShell
      title="Sign in"
      description="Welcome back to ParkPlug."
      footer={
        <>
          New to ParkPlug?{" "}
          <Link
            href={`/signup?next=${encodeURIComponent(next)}`}
            className="font-bold text-brand-700 underline underline-offset-2"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        {expired ? (
          <Alert tone="warning" title="Your session expired">
            Sign in again to pick up where you left off.
          </Alert>
        ) : null}

        {errors.length > 0 ? (
          <div ref={summaryRef} tabIndex={-1} className="focus:outline-none">
            <FormErrorSummary errors={errors} />
          </div>
        ) : null}

        {formError ? (
          <Alert tone="danger" live title="We could not sign you in">
            {formError}
          </Alert>
        ) : null}

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

        <Field label="Password" required error={err("password")}>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Your password"
            enterKeyHint="done"
          />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Checkbox
            label="Remember me"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <Link
            href="/forgot-password"
            className="text-sm font-bold text-brand-700 underline-offset-2 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" fullWidth loading={submitting} loadingText="Signing in…">
          Sign In
        </Button>
      </form>
    </AuthShell>
  );
}
