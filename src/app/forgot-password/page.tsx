"use client";

import Link from "next/link";
import { useState } from "react";
import { auth } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { AuthShell, isValidEmail } from "@/components/auth/auth-shell";
import { IconCheckCircle } from "@/components/ui/icons";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    setError(null);
    await auth.requestPasswordReset(email);
    setSubmitting(false);
    setSent(true);
  }

  if (sent) {
    return (
      <AuthShell
        title="Check your email"
        description={
          <>
            If an account exists for <strong className="font-semibold text-ink-800">{email}</strong>,
            we have sent a link to reset your password. The link expires in 60
            minutes.
          </>
        }
        footer={
          <Link href="/signin" className="font-bold text-brand-700 underline underline-offset-2">
            Back to sign in
          </Link>
        }
      >
        <Alert tone="success" icon={<IconCheckCircle />}>
          Nothing arrived? Check your spam folder, or try again with a different
          email address.
        </Alert>
        <Button
          variant="secondary"
          fullWidth
          className="mt-4"
          onClick={() => {
            setSent(false);
            setEmail("");
          }}
        >
          Use a different email
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      description="Enter the email address on your account and we will send you a reset link."
      footer={
        <Link href="/signin" className="font-bold text-brand-700 underline underline-offset-2">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <Field label="Email" required error={error}>
          <Input
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            autoComplete="email"
            placeholder="you@example.com"
            enterKeyHint="send"
          />
        </Field>
        <Button type="submit" size="lg" fullWidth loading={submitting} loadingText="Sending…">
          Send reset link
        </Button>
      </form>
    </AuthShell>
  );
}
