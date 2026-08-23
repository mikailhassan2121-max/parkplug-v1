"use client";

import Link from "next/link";
import { useSession } from "@/lib/session";
import { Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { IconUser } from "@/components/ui/icons";

export function OwnerSettingsView() {
  const session = useSession();

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 sm:text-3xl">Settings</h1>
      <p className="mt-1 text-sm text-ink-600">Your account details for the property owner dashboard.</p>

      <div className="mt-6 rounded-card border border-ink-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-bold text-ink-900">Account</h2>
        {session.status === "loading" ? (
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : session.status === "authenticated" ? (
          <div className="mt-3 flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-800">
              <IconUser aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-ink-900">{session.user.fullName}</p>
              <p className="truncate text-sm text-ink-500">{session.user.email}</p>
            </div>
          </div>
        ) : null}
        <div className="mt-4">
          <ButtonLink href="/dashboard/settings" variant="secondary" size="sm">
            Edit account settings
          </ButtonLink>
        </div>
      </div>

      <div className="mt-6 rounded-card border border-dashed border-ink-300 bg-ink-50/50 p-5 text-center sm:p-6">
        <p className="text-sm font-semibold text-ink-800">Team members</p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-ink-500">
          Inviting other people to help manage your facilities is not available yet. For now, each
          facility is managed by a single account.
        </p>
      </div>

      <p className="mt-6 text-xs text-ink-500">
        Looking for hosting a marketplace listing instead of a sensor-monitored facility? That lives
        under{" "}
        <Link href="/host/settings" className="font-semibold text-teal hover:underline">
          Host settings
        </Link>
        .
      </p>
    </div>
  );
}
