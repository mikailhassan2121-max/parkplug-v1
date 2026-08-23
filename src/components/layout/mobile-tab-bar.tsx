"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session";
import {
  IconCalendar,
  IconCompass,
  IconHeart,
  IconMap,
  IconUser,
} from "@/components/ui/icons";
import { isActivePath } from "./nav-links";

const TABS = [
  { href: "/", label: "Explore", icon: IconCompass, exact: true },
  { href: "/parking", label: "Map", icon: IconMap },
  { href: "/dashboard/reservations", label: "Trips", icon: IconCalendar },
  { href: "/dashboard/saved", label: "Saved", icon: IconHeart },
];

/**
 * Bottom navigation for small screens. Hidden on routes that own the full
 * viewport (search map, multi-step flows) so it never covers a sticky action.
 */
const HIDDEN_ON = ["/parking", "/book/", "/host/listings/new", "/report-parking", "/signin", "/signup"];

export function MobileTabBar() {
  const pathname = usePathname();
  const session = useSession();

  if (HIDDEN_ON.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return null;
  }

  const profileHref = session.status === "authenticated" ? "/dashboard" : "/signin";

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-60 border-t border-ink-200 bg-white safe-bottom lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : isActivePath(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 transition-colors",
                  active ? "text-brand-700" : "text-ink-500 hover:text-ink-800",
                )}
              >
                <Icon className={cn("text-xl", active && "scale-110 transition-transform")} />
                <span className="text-2xs font-semibold">{tab.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href={profileHref}
            aria-current={isActivePath(pathname, "/dashboard") && pathname === "/dashboard" ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 transition-colors",
              pathname === "/dashboard" ? "text-brand-700" : "text-ink-500 hover:text-ink-800",
            )}
          >
            <IconUser className="text-xl" />
            <span className="text-2xs font-semibold">
              {session.status === "authenticated" ? "Profile" : "Sign in"}
            </span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}

/**
 * Spacer that reserves room for the tab bar so page content is never hidden
 * behind it. Mirrors the same route exclusions.
 */
export function MobileTabBarSpacer() {
  const pathname = usePathname();
  if (HIDDEN_ON.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return null;
  }
  return <div aria-hidden="true" className="h-14 safe-bottom lg:hidden" />;
}
