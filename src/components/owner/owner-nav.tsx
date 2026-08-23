"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { OWNER_NAV, isActivePath } from "@/components/layout/nav-links";
import { IconArrowLeft } from "@/components/ui/icons";

export function OwnerNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Property owner" className="lg:sticky lg:top-24 lg:self-start">
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 scrollbar-none lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {OWNER_NAV.map((link) => {
          const active = link.href === "/owner" ? pathname === "/owner" : isActivePath(pathname, link.href);
          return (
            <li key={link.href} className="shrink-0 lg:shrink">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center whitespace-nowrap rounded-xl px-3.5 text-sm font-semibold transition-colors lg:whitespace-normal",
                  active ? "bg-brand-50 text-teal" : "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 hidden border-t border-ink-200 pt-5 lg:block">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg px-1 text-sm font-semibold text-ink-600 transition-colors hover:text-teal"
        >
          <IconArrowLeft aria-hidden="true" />
          Switch to driver mode
        </Link>
      </div>
    </nav>
  );
}
