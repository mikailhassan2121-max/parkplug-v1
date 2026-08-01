"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { AuthShell } from "@/components/auth/auth-shell";
import { IconCheckCircle } from "@/components/ui/icons";

type Phase = "prompt" | "verifying" | "verified" | "invalid";

export function VerifyEmailView() {
  const params = useSearchParams();
  const router = useRouter();
  const session = useSession();
  const { toast } = useToast();

  const token = params.get("token");
  const next = params.get("next") ?? "/dashboard";

  const [phase, setPhase] = useState<Phase>(token ? "verifying" : "prompt");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) return;
    void auth.verifyEmail(token).then(async (result) => {
      if (result.ok) {
        await session.refresh();
        setPhase("verified");
      } else {
        setPhase("invalid");
      }
    });
    // Runs once for the token in the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function resend() {
    setResending(true);
    const result = await auth.resendVerification();
    setResending(false);
    toast(
      result.ok
        ? { tone: "success", title: "Verification email sent", description: "Check your inbox in a moment." }
        : { tone: "error", title: "Could not send the email", description: result.error.message },
    );
  }

  if (phase === "verifying") {
    return (
      <AuthShell title="Verifying your email…">
        <div className="flex justify-center py-4">
          <Spinner size="lg" label="Verifying your email address" />
        </div>
      </AuthShell>
    );
  }

  if (phase === "verified") {
    return (
      <AuthShell title="Email verified" description="Your email address is confirmed.">
        <Alert tone="success" icon={<IconCheckCircle />}>
          You now have full access to reservations, hosting, and notifications.
        </Alert>
        <Button size="lg" fullWidth className="mt-4" onClick={() => router.push(next)}>
          Continue
        </Button>
      </AuthShell>
    );
  }

  if (phase === "invalid") {
    return (
      <AuthShell
        title="This verification link is not valid"
        description="The link may have expired or already been used. Verification links are valid for 24 hours."
      >
        <div className="space-y-3">
          <Button size="lg" fullWidth loading={resending} loadingText="Sending…" onClick={() => void resend()}>
            Send a new verification email
          </Button>
          <ButtonLink href="/dashboard/settings" variant="secondary" fullWidth>
            Change my email address
          </ButtonLink>
        </div>
      </AuthShell>
    );
  }

  const email = session.user?.email;

  return (
    <AuthShell
      title="Verify your email"
      description={
        email ? (
          <>
            We sent a verification link to{" "}
            <strong className="font-semibold text-ink-800">{email}</strong>. Open it
            to finish setting up your account.
          </>
        ) : (
          "We sent a verification link to the email address on your account."
        )
      }
    >
      <Alert tone="info">
        You can browse and search parking right away. Verifying your email is
        required before you reserve a space or publish a listing.
      </Alert>

      <div className="mt-5 space-y-3">
        <Button size="lg" fullWidth loading={resending} loadingText="Sending…" onClick={() => void resend()}>
          Resend verification email
        </Button>
        <ButtonLink href="/dashboard/settings" variant="secondary" fullWidth>
          Change my email address
        </ButtonLink>
        <ButtonLink href={next} variant="ghost" fullWidth>
          Continue for now
        </ButtonLink>
      </div>
    </AuthShell>
  );
}
