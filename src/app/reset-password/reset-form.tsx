"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { auth } from "@/lib/api";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, PasswordInput } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import {
  AuthShell,
  PasswordRequirements,
  passwordMeetsRequirements,
} from "@/components/auth/auth-shell";
import { IconCheckCircle } from "@/components/ui/icons";

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // A missing token means the user arrived without a valid reset link.
  if (!token) {
    return (
      <AuthShell
        title="This reset link is not valid"
        description="The link may have expired, already been used, or been copied incompletely. Reset links are valid for 60 minutes."
      >
        <div className="space-y-3">
          <ButtonLink href="/forgot-password" fullWidth size="lg">
            Request a new link
          </ButtonLink>
          <ButtonLink href="/signin" variant="secondary" fullWidth>
            Back to sign in
          </ButtonLink>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell
        title="Password updated"
        description="You can now sign in with your new password."
      >
        <Alert tone="success" icon={<IconCheckCircle />}>
          For your security, you have been signed out on other devices.
        </Alert>
        <Button size="lg" fullWidth className="mt-4" onClick={() => router.push("/signin")}>
          Sign in
        </Button>
      </AuthShell>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const next: typeof errors = {};
    if (!password) next.password = "Choose a new password.";
    else if (!passwordMeetsRequirements(password))
      next.password = "Your password does not meet all the requirements.";
    if (password !== confirm) next.confirm = "Both passwords must match.";

    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    const result = await auth.resetPassword({ token, password });
    setSubmitting(false);

    if (result.ok) setDone(true);
    else setFormError(result.error.message);
  }

  return (
    <AuthShell
      title="Choose a new password"
      footer={
        <Link href="/signin" className="font-bold text-brand-700 underline underline-offset-2">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        {formError ? (
          <Alert tone="danger" live title="We could not reset your password">
            {formError}
          </Alert>
        ) : null}

        <div>
          <Field label="New password" required error={errors.password}>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <PasswordRequirements value={password} />
        </div>

        <Field label="Confirm new password" required error={errors.confirm}>
          <PasswordInput
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            enterKeyHint="done"
          />
        </Field>

        <Button type="submit" size="lg" fullWidth loading={submitting} loadingText="Updating…">
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}
