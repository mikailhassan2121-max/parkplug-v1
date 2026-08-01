"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Switch } from "@/components/ui/form";
import { ButtonLink } from "@/components/ui/button";

export default function HostSettingsPage() {
  const [prefs, setPrefs] = useState({
    instantBook: true,
    newBookingAlerts: true,
    cancellationAlerts: true,
    reviewReminders: true,
    weeklySummary: false,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Host settings</h1>
        <p className="mt-1.5 text-sm text-ink-600">
          Preferences that apply across all of your listings.
        </p>
      </div>

      <section className="rounded-card border border-ink-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold tracking-tight">Booking preferences</h2>
        <div className="mt-5 space-y-5">
          <Switch
            label="Allow instant booking"
            description="Drivers can reserve without waiting for you to approve. Turning this off means you must respond to each request."
            checked={prefs.instantBook}
            onChange={(v) => setPrefs({ ...prefs, instantBook: v })}
          />
        </div>
        <Alert tone="info" className="mt-5">
          Changing this affects new reservations only. Bookings that are already
          confirmed are unaffected.
        </Alert>
      </section>

      <section className="rounded-card border border-ink-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold tracking-tight">Hosting notifications</h2>
        <div className="mt-5 space-y-5">
          <Switch
            label="New bookings"
            description="When a driver reserves one of your spaces."
            checked={prefs.newBookingAlerts}
            onChange={(v) => setPrefs({ ...prefs, newBookingAlerts: v })}
          />
          <Switch
            label="Cancellations"
            description="When a reservation at one of your spaces is canceled."
            checked={prefs.cancellationAlerts}
            onChange={(v) => setPrefs({ ...prefs, cancellationAlerts: v })}
          />
          <Switch
            label="Review reminders"
            description="A nudge to review a driver after their reservation ends."
            checked={prefs.reviewReminders}
            onChange={(v) => setPrefs({ ...prefs, reviewReminders: v })}
          />
          <Switch
            label="Weekly summary"
            description="A recap of bookings and earnings each week."
            checked={prefs.weeklySummary}
            onChange={(v) => setPrefs({ ...prefs, weeklySummary: v })}
          />
        </div>
      </section>

      <section className="rounded-card border border-ink-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold tracking-tight">Standards and responsibilities</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-700">
          Hosting on ParkPlug means keeping your availability accurate, describing
          your space honestly, and making sure it is safe to use. ParkPlug does not
          inspect spaces or verify property ownership.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <ButtonLink href="/legal/host-standards" variant="secondary" size="sm">
            Host Standards
          </ButtonLink>
          <ButtonLink href="/safety" variant="secondary" size="sm">
            Safety &amp; Trust
          </ButtonLink>
        </div>
      </section>

      <p className="text-sm text-ink-600">
        Looking for your profile, password, or payment details?{" "}
        <Link href="/dashboard/settings" className="font-bold text-brand-700 underline underline-offset-2">
          Account settings
        </Link>
      </p>
    </div>
  );
}
