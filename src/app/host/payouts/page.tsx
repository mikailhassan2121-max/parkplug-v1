"use client";

import { host as hostApi } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { IconCheckCircle, IconLock } from "@/components/ui/icons";

export default function HostPayoutsPage() {
  const state = useAsync(() => hostApi.payoutState(), []);

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Payout settings</h1>
      <p className="mt-1.5 text-sm text-ink-600">
        Where ParkPlug sends the money you earn from reservations.
      </p>

      <div className="mt-6">
        {state.status === "loading" ? (
          <Skeleton className="h-48 w-full" rounded="rounded-card" />
        ) : state.status === "error" ? (
          <ErrorState
            title="Payout status could not be loaded"
            description={state.error.message}
            actions={[{ label: "Try again", onClick: state.reload }]}
          />
        ) : (
          <div className="rounded-card border border-ink-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold">Setup status</h2>
              <Badge
                tone={
                  state.data.state === "complete"
                    ? "success"
                    : state.data.state === "action_required"
                      ? "danger"
                      : state.data.state === "pending_verification"
                        ? "info"
                        : "warning"
                }
              >
                {
                  {
                    not_started: "Not started",
                    incomplete: "Incomplete",
                    pending_verification: "Verification pending",
                    action_required: "Action required",
                    complete: "Complete",
                  }[state.data.state]
                }
              </Badge>
            </div>

            <div className="mt-4">
              {state.data.state === "not_started" ? (
                <>
                  <p className="text-sm leading-relaxed text-ink-700">
                    Before your first payout you need to confirm your identity and
                    add a bank account. This takes a few minutes and is handled by
                    our payment provider.
                  </p>
                  <Button size="lg" className="mt-5">
                    Start payout setup
                  </Button>
                </>
              ) : null}

              {state.data.state === "incomplete" ? (
                <>
                  <p className="text-sm leading-relaxed text-ink-700">
                    A few details are still needed before payouts can be released.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-sm text-ink-700">
                    {state.data.missing.map((item) => (
                      <li key={item}>· {item}</li>
                    ))}
                  </ul>
                  <Button size="lg" className="mt-5">
                    Continue payout setup
                  </Button>
                </>
              ) : null}

              {state.data.state === "pending_verification" ? (
                <Alert tone="info">
                  Your details are being verified. This usually finishes on its own
                  — we will let you know if anything else is needed.
                </Alert>
              ) : null}

              {state.data.state === "action_required" ? (
                <>
                  <Alert tone="danger" title="Payouts are on hold">
                    {state.data.reason}
                  </Alert>
                  <Button size="lg" className="mt-5">
                    Resolve now
                  </Button>
                </>
              ) : null}

              {state.data.state === "complete" ? (
                <Alert tone="success" icon={<IconCheckCircle />} title="Payouts are set up">
                  Earnings are sent to {state.data.methodSummary}.
                </Alert>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-card border border-ink-200 bg-ink-50 p-5">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <IconLock className="text-brand-600" aria-hidden="true" />
          How your banking details are handled
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-700">
          Payout information is handled securely by our payment provider. ParkPlug
          does not collect, see, or store your bank account or tax identification
          numbers — you enter them directly with the provider, on their own secure
          form.
        </p>
      </div>
    </div>
  );
}
