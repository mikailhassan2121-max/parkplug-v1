export type NavLink = { href: string; label: string };

/** Primary navigation, shared by the desktop header and the mobile menu. */
export const PRIMARY_NAV: NavLink[] = [
  { href: "/search", label: "Find Parking" },
  { href: "/live", label: "Live Map" },
  { href: "/host/listings/new", label: "List Your Parking" },
  { href: "/for-property-owners", label: "For Property Owners" },
];

export const HOST_NAV: NavLink[] = [
  { href: "/host", label: "Overview" },
  { href: "/host/listings", label: "Listings" },
  { href: "/host/calendar", label: "Calendar" },
  { href: "/host/reservations", label: "Reservations" },
  { href: "/host/earnings", label: "Earnings" },
  { href: "/host/reviews", label: "Reviews" },
  { href: "/host/messages", label: "Messages" },
  { href: "/host/payouts", label: "Payout Settings" },
  { href: "/host/settings", label: "Host Settings" },
];

export const ACCOUNT_NAV: NavLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/reservations", label: "My Reservations" },
  { href: "/dashboard/saved", label: "Saved Spaces" },
  { href: "/dashboard/vehicles", label: "My Vehicles" },
  { href: "/dashboard/settings", label: "Account Settings" },
];

/**
 * True when `href` is the active route. Uses prefix matching for section roots
 * so a child page still highlights its parent, while keeping "/" exact.
 */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
