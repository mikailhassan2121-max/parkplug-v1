"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session";
import { ButtonLink } from "@/components/ui/button";
import {
  IconBell,
  IconCalendar,
  IconCar,
  IconHeart,
  IconHome,
  IconList,
  IconPlus,
  IconSettings,
} from "@/components/ui/icons";

const LINKS = [
  { href: "/dashboard", label: "Overview", icon: IconHome, exact: true },
  { href: "/dashboard/reservations", label: "My Reservations", icon: IconCalendar },
  { href: "/dashboard/saved", label: "Saved Spaces", icon: IconHeart },
  { href: "/dashboard/vehicles", label: "My Vehicles", icon: IconCar },
  { href: "/notifications", label: "Notifications", icon: IconBell },
  { href: "/dashboard/settings", label: "Account Settings", icon: IconSettings },
];

export function DashboardNav() {
  const pathname = usePathname();
  const session = useSession();

  return (
    <nav aria-label="Account" className="lg:sticky lg:top-24 lg:self-start">
      {/* Horizontal scroller on small screens, vertical rail on desktop. */}
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 scrollbar-none lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {LINKS.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <li key={link.href} className="shrink-0 lg:shrink">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 text-sm font-semibold transition-colors lg:whitespace-normal",
                  active
                    ? "bg-brand-50 text-brand-800"
                    : "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
                )}
              >
                <Icon className="shrink-0 text-lg" aria-hidden="true" />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 hidden border-t border-ink-200 pt-5 lg:block">
        {session.user?.isHost ? (
          <ButtonLink href="/host" variant="secondary" fullWidth leadingIcon={<IconList />}>
            Host Dashboard
          </ButtonLink>
        ) : (
          <div className="rounded-card border border-ink-200 bg-ink-50 p-4">
            <h2 className="text-sm font-bold text-ink-900">Have a space to share?</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-600">
              List a driveway, garage, or lot and earn when drivers reserve it.
            </p>
            <ButtonLink
              href="/host/listings/new"
              size="sm"
              fullWidth
              className="mt-3"
              leadingIcon={<IconPlus />}
            >
              Become a Host
            </ButtonLink>
          </div>
        )}
      </div>
    </nav>
  );
}
