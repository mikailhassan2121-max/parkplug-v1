"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/form";
import { Overlay } from "@/components/ui/overlay";
import { COLLECTIONS, readRecord, writeRecord } from "@/lib/api/store";

type Preferences = { analytics: boolean; decidedAt: string };

/**
 * Only rendered when optional tracking actually exists. ParkPlug ships with no
 * analytics by default, so no banner is shown — a consent prompt for cookies
 * that are not set would be theatre.
 */
const optionalCookiesExist = Boolean(process.env.NEXT_PUBLIC_ANALYTICS_ID);

export function CookieConsent() {
  const [decided, setDecided] = useState(true);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    if (!optionalCookiesExist) return;
    const stored = readRecord<Preferences>(COLLECTIONS.cookiePrefs);
    setDecided(Boolean(stored));
    setAnalytics(stored?.analytics ?? false);
  }, []);

  if (!optionalCookiesExist || decided) return null;

  function save(next: boolean) {
    writeRecord<Preferences>(COLLECTIONS.cookiePrefs, {
      analytics: next,
      decidedAt: new Date().toISOString(),
    });
    setAnalytics(next);
    setDecided(true);
    setCustomizeOpen(false);
  }

  return (
    <>
      <div
        role="region"
        aria-label="Cookie preferences"
        className="fixed inset-x-0 bottom-0 z-90 border-t border-ink-200 bg-white p-4 shadow-e3 safe-bottom
                   lg:inset-x-auto lg:bottom-6 lg:left-6 lg:max-w-md lg:rounded-2xl lg:border"
      >
        <h2 className="text-sm font-bold text-ink-900">Cookies on ParkPlug</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-600">
          We use essential cookies to keep you signed in and to remember your
          preferences. With your permission we also use analytics cookies to
          understand how the site is used. Read our{" "}
          <Link href="/legal/cookies" className="font-semibold text-brand-700 underline underline-offset-2">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="mt-3.5 flex flex-col gap-2 sm:flex-row">
          <Button size="sm" onClick={() => save(true)} className="sm:flex-1">
            Accept All
          </Button>
          <Button size="sm" variant="secondary" onClick={() => save(false)} className="sm:flex-1">
            Reject Nonessential
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCustomizeOpen(true)}>
            Customize
          </Button>
        </div>
      </div>

      <Overlay
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title="Cookie preferences"
        description="Essential cookies are always on because the site cannot work without them."
        variant="sheet"
        size="md"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setCustomizeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save(analytics)}>Save preferences</Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
            <p className="text-sm font-semibold text-ink-900">Essential cookies</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-600">
              Keep you signed in, remember your search, and protect the site.
              These cannot be turned off.
            </p>
          </div>
          <div className="rounded-xl border border-ink-200 p-4">
            <Switch
              label="Analytics cookies"
              description="Help us understand which pages people use so we can improve them."
              checked={analytics}
              onChange={setAnalytics}
            />
          </div>
        </div>
      </Overlay>
    </>
  );
}
