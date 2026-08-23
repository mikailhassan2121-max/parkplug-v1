"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { Logo } from "@/components/brand/logo";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/badge";
import { DropdownMenu, type MenuItem } from "@/components/ui/menu";
import {
  IconBell,
  IconCalendar,
  IconCar,
  IconChart,
  IconChevronDown,
  IconHeart,
  IconHelp,
  IconHome,
  IconList,
  IconLogout,
  IconMenu,
  IconPlus,
  IconSearch,
  IconSettings,
  IconUser,
  IconX,
} from "@/components/ui/icons";
import { PRIMARY_NAV, isActivePath } from "./nav-links";

export function SiteHeader() {
  const pathname = usePathname();
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Focus returns to whatever opened the menu; the trap handles restoration.
  const menuRef = useFocusTrap<HTMLDivElement>(menuOpen, () => setMenuOpen(false));

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const user = session.user;

  const accountMenu: MenuItem[] = [
    { kind: "label", label: user?.email ?? "Account" },
    { kind: "link", label: "Dashboard", href: "/dashboard", icon: <IconHome /> },
    { kind: "link", label: "My Reservations", href: "/dashboard/reservations", icon: <IconCalendar /> },
    { kind: "link", label: "Saved Spaces", href: "/dashboard/saved", icon: <IconHeart /> },
    { kind: "link", label: "My Vehicles", href: "/dashboard/vehicles", icon: <IconCar /> },
    { kind: "separator" },
    ...(user?.isHost
      ? ([
          { kind: "link", label: "Host Dashboard", href: "/host", icon: <IconList /> },
          { kind: "link", label: "List a Space", href: "/host/listings/new", icon: <IconPlus /> },
        ] as MenuItem[])
      : ([
          {
            kind: "link",
            label: "Become a Host",
            href: "/host/listings/new",
            icon: <IconPlus />,
            description: "List your unused parking",
          },
        ] as MenuItem[])),
    { kind: "link", label: "Owner Dashboard", href: "/owner", icon: <IconChart /> },
    { kind: "separator" },
    { kind: "link", label: "Account Settings", href: "/dashboard/settings", icon: <IconSettings /> },
    { kind: "link", label: "Help", href: "/help", icon: <IconHelp /> },
    { kind: "separator" },
    { kind: "button", label: "Sign Out", onSelect: () => void session.signOut(), icon: <IconLogout /> },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-70 bg-surface/95 backdrop-blur-md transition-shadow duration-200",
        scrolled ? "shadow-e1 border-b border-border" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-18 lg:gap-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 rounded-lg"
          aria-label="ParkPlugs home"
        >
          <Logo />
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Main" className="hidden flex-1 lg:block">
          <ul className="flex items-center gap-1">
            {PRIMARY_NAV.map((link) => {
              const active = isActivePath(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                      active ? "text-teal" : "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
                    )}
                  >
                    {link.label}
                    {active ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-teal"
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/*
            Responsive visibility lives on a wrapper, never on the button
            itself: Button/ButtonLink carry `inline-flex` in their base classes,
            which beats a `hidden` utility passed through `className`.
          */}
          <span className="lg:hidden">
            <ButtonLink href="/parking" variant="ghost" size="sm" aria-label="Find parking">
              <IconSearch className="text-lg" />
            </ButtonLink>
          </span>

          {session.status === "loading" ? (
            <div className="h-9 w-24 skeleton rounded-xl" aria-hidden="true" />
          ) : session.status === "authenticated" && user ? (
            <>
              <Link
                href="/notifications"
                className="relative hidden h-11 w-11 place-items-center rounded-xl text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 sm:grid"
                aria-label={
                  session.unreadNotifications > 0
                    ? `Notifications, ${session.unreadNotifications} unread`
                    : "Notifications"
                }
              >
                <IconBell className="text-xl" />
                <CountBadge count={session.unreadNotifications} label="unread notifications" />
              </Link>

              <DropdownMenu
                triggerLabel="Account menu"
                align="end"
                items={accountMenu}
                trigger={
                  <span className="flex items-center gap-1.5 rounded-xl border border-ink-300 bg-ink-100 py-1.5 pl-1.5 pr-2.5 shadow-e1 transition-colors hover:bg-ink-200">
                    <Avatar name={user.fullName} url={user.avatarUrl} />
                    <IconChevronDown className="text-ink-500" />
                  </span>
                }
              />
            </>
          ) : (
            // Below `sm` these give way to the menu, which carries the same
            // actions — otherwise they overflow a 320px header.
            <span className="hidden items-center gap-2 sm:flex">
              <ButtonLink href="/signin" variant="ghost" size="sm">
                Sign In
              </ButtonLink>
              <ButtonLink href="/signup" size="sm">
                Get Started
              </ButtonLink>
            </span>
          )}

          <span className="lg:hidden">
            <IconButton
              label={menuOpen ? "Close menu" : "Open menu"}
              icon={menuOpen ? <IconX /> : <IconMenu />}
              size="sm"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((v) => !v)}
            />
          </span>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen ? (
        <div className="fixed inset-0 top-16 z-60 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/40 animate-fade-in"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={menuRef}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
            tabIndex={-1}
            className="relative max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-b border-ink-200 bg-surface pb-6 shadow-e3 animate-slide-up focus:outline-none"
          >
            <nav aria-label="Mobile" className="px-4 pt-4">
              <ul className="space-y-1">
                {PRIMARY_NAV.map((link) => {
                  const active = isActivePath(pathname, link.href);
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-12 items-center rounded-xl px-4 text-[0.9375rem] font-semibold transition-colors",
                          active
                            ? "bg-brand-50 text-teal"
                            : "text-ink-800 hover:bg-ink-100",
                        )}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="my-4 h-px bg-ink-200" />

              {session.status === "authenticated" && user ? (
                <ul className="space-y-1">
                  <li className="px-4 pb-2">
                    <p className="text-sm font-bold text-ink-900">{user.fullName}</p>
                    <p className="truncate text-xs text-ink-500">{user.email}</p>
                  </li>
                  {[
                    { href: "/dashboard", label: "Dashboard" },
                    { href: "/dashboard/reservations", label: "My Reservations" },
                    { href: "/dashboard/saved", label: "Saved Spaces" },
                    { href: "/dashboard/vehicles", label: "My Vehicles" },
                    { href: "/notifications", label: "Notifications" },
                    ...(user.isHost ? [{ href: "/host", label: "Host Dashboard" }] : []),
                    { href: "/dashboard/settings", label: "Account Settings" },
                  ].map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex min-h-12 items-center rounded-xl px-4 text-[0.9375rem] font-medium text-ink-800 transition-colors hover:bg-ink-100"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                  <li className="pt-2">
                    <Button
                      variant="secondary"
                      fullWidth
                      leadingIcon={<IconLogout />}
                      onClick={() => {
                        setMenuOpen(false);
                        void session.signOut();
                      }}
                    >
                      Sign Out
                    </Button>
                  </li>
                </ul>
              ) : (
                <div className="space-y-2.5 px-1">
                  <ButtonLink href="/signup" fullWidth size="lg">
                    Get Started
                  </ButtonLink>
                  <ButtonLink href="/signin" variant="secondary" fullWidth size="lg">
                    Sign In
                  </ButtonLink>
                </div>
              )}
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function Avatar({
  name,
  url,
  size = "sm",
}: {
  name: string;
  url?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-16 w-16 text-lg",
  } as const;
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  if (url) {
    return (
      // Avatars come from arbitrary API-supplied origins, so they bypass the
      // Next image optimizer rather than requiring every host be allow-listed.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        className={cn("shrink-0 rounded-full object-cover", sizes[size])}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-800",
        sizes[size],
      )}
    >
      {initials || <IconUser />}
    </span>
  );
}
