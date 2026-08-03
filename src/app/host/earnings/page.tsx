"use client";

import { useState } from "react";
import { host as hostApi } from "@/lib/api";
import { business, feesConfigured, formatBps, PLACEHOLDER } from "@/config/business";
import { formatDate, formatMoney } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Select } from "@/components/ui/form";
import { IconDownload, IconWallet } from "@/components/ui/icons";

export default function HostEarningsPage() {
  const earningsState = useAsync(() => hostApi.earnings(), []);
  const transactionsState = useAsync(() => hostApi.transactions(), []);
  const [range, setRange] = useState("all");

  const earnings = earningsState.status === "ready" ? earningsState.data : null;
  const transactions = transactionsState.status === "ready" ? transactionsState.data : [];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Earnings</h1>
          <p className="mt-1.5 text-sm text-ink-600">
            What you have earned, what is pending, and when it pays out.
          </p>
        </div>
        <Button
          variant="secondary"
          leadingIcon={<IconDownload />}
          disabled={transactions.length === 0}
        >
          Export
        </Button>
      </div>

      {!feesConfigured ? (
        <Alert tone="warning" className="mt-6" title="Platform fees are not configured yet">
          Until ParkPlugs&rsquo;s host fee ({PLACEHOLDER.hostFee}) is set, we cannot
          calculate what you take home from a reservation. Amounts below show as
          a dash rather than an estimate we cannot stand behind.
        </Alert>
      ) : null}

      {/* -------------------------------------------------------- Balances */}
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Available balance", value: earnings?.availableBalanceCents },
          { label: "Pending earnings", value: earnings?.pendingCents },
          { label: "Total earned", value: earnings?.lifetimeCents },
        ].map((item) => (
          <li key={item.label} className="rounded-card border border-ink-200 bg-white p-4">
            <p className="text-xs font-medium text-ink-500">{item.label}</p>
            {earningsState.status === "loading" ? (
              <Skeleton className="mt-2 h-7 w-24" />
            ) : (
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-ink-950">
                {feesConfigured && item.value !== undefined
                  ? formatMoney(item.value, earnings?.currency ?? "USD")
                  : "—"}
              </p>
            )}
          </li>
        ))}
        <li className="rounded-card border border-ink-200 bg-white p-4">
          <p className="text-xs font-medium text-ink-500">Next payout</p>
          <p className="mt-1 text-sm font-semibold text-ink-800">
            {earnings?.nextPayout
              ? `${formatMoney(earnings.nextPayout.amountCents, earnings.currency)} on ${formatDate(earnings.nextPayout.expectedAt, true)}`
              : "No payout scheduled"}
          </p>
          <ButtonLink href="/host/payouts" variant="ghost" size="sm" className="mt-2 -ml-2">
            Payout settings
          </ButtonLink>
        </li>
      </ul>

      {/* ------------------------------------------------------ Fee summary */}
      <section aria-labelledby="fees-heading" className="mt-8 rounded-card border border-ink-200 bg-ink-50 p-5">
        <h2 id="fees-heading" className="text-base font-bold">How your earnings are calculated</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-600">Driver pays</dt>
            <dd className="font-semibold">Parking subtotal + service fee + tax</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-600">ParkPlugs host fee</dt>
            <dd className="font-semibold">{formatBps(business.hostFeeBps, PLACEHOLDER.hostFee)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-ink-200 pt-2">
            <dt className="font-bold text-ink-900">You receive</dt>
            <dd className="font-bold">Parking subtotal minus the host fee</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-ink-500">
          The service fee a driver pays is ParkPlugs&rsquo;s, and is separate from
          what you receive. Refunds reverse the matching earnings.
        </p>
      </section>

      {/* ------------------------------------------------------ Transactions */}
      <section aria-labelledby="transactions-heading" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="transactions-heading" className="text-lg font-bold tracking-tight">
            Recent transactions
          </h2>
          <div className="w-44">
            <label htmlFor="range" className="sr-only">
              Filter by date range
            </label>
            <Select id="range" size="sm" value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="all">All time</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="year">This year</option>
            </Select>
          </div>
        </div>

        <div className="mt-4">
          {transactionsState.status === "loading" ? (
            <Skeleton className="h-40 w-full" rounded="rounded-card" />
          ) : transactionsState.status === "error" ? (
            <ErrorState
              title="Transactions could not be loaded"
              description={transactionsState.error.message}
              actions={[{ label: "Try again", onClick: transactionsState.reload }]}
            />
          ) : transactions.length === 0 ? (
            <EmptyState
              icon={<IconWallet />}
              title="No earnings yet"
              description="When a driver completes a reservation at one of your spaces, the payment appears here with its fees broken out."
              actions={[{ label: "Manage listings", href: "/host/listings" }]}
            />
          ) : (
            <div className="overflow-x-auto rounded-card border border-ink-200">
              <table className="w-full min-w-[36rem] border-collapse bg-white text-sm">
                <caption className="sr-only">Your recent ParkPlugs transactions</caption>
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50 text-left">
                    <th scope="col" className="px-4 py-2.5 text-xs font-bold text-ink-700">Date</th>
                    <th scope="col" className="px-4 py-2.5 text-xs font-bold text-ink-700">Description</th>
                    <th scope="col" className="px-4 py-2.5 text-xs font-bold text-ink-700">Status</th>
                    <th scope="col" className="px-4 py-2.5 text-right text-xs font-bold text-ink-700">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-3 text-ink-700">{formatDate(t.occurredAt, true)}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-ink-900">{t.description}</span>
                        {t.reservationReference ? (
                          <span className="mt-0.5 block font-mono text-2xs text-ink-500">
                            {t.reservationReference}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Badge size="sm" tone={t.status === "paid" ? "success" : t.status === "failed" ? "danger" : "warning"}>
                          {t.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink-900">
                        {formatMoney(t.amountCents)}
                        {t.feeCents ? (
                          <span className="mt-0.5 block text-2xs font-normal text-ink-500">
                            after {formatMoney(t.feeCents)} fee
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
