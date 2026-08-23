import type { SVGProps } from "react";

/**
 * Inline icon set.
 *
 * Icons are decorative by default (`aria-hidden`), so the accessible name must
 * come from the surrounding control's text or `aria-label`. Pass a `title` when
 * an icon genuinely carries meaning on its own.
 */
type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Svg({ title, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export const IconSearch = (p: IconProps) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>
);
export const IconMapPin = (p: IconProps) => (
  <Svg {...p}><path d="M20 10c0 4.4-5.4 9.6-7.4 11.3a1 1 0 0 1-1.2 0C9.4 19.6 4 14.4 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></Svg>
);
export const IconMap = (p: IconProps) => (
  <Svg {...p}><path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2Z" /><path d="M9 4v14M15 6v14" /></Svg>
);
export const IconList = (p: IconProps) => (
  <Svg {...p}><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></Svg>
);
export const IconCalendar = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></Svg>
);
export const IconClock = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></Svg>
);
export const IconCar = (p: IconProps) => (
  <Svg {...p}><path d="M5 17v2a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1v-2M21.5 17v2a1 1 0 0 1-1 1H19a1 1 0 0 1-1-1v-2" /><path d="M2.5 17v-4.2a2 2 0 0 1 .2-.9l2-4A2 2 0 0 1 6.5 7h11a2 2 0 0 1 1.8 1.1l2 4a2 2 0 0 1 .2.9V17a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1Z" /><path d="M3 13h18" /><circle cx="7" cy="15.5" r="1" /><circle cx="17" cy="15.5" r="1" /></Svg>
);
export const IconUser = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="8" r="3.75" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></Svg>
);
export const IconHeart = (p: IconProps) => (
  <Svg {...p}><path d="M12 20s-7.5-4.7-7.5-10A4.5 4.5 0 0 1 12 7.6 4.5 4.5 0 0 1 19.5 10c0 5.3-7.5 10-7.5 10Z" /></Svg>
);
export const IconStar = (p: IconProps) => (
  <Svg {...p}><path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.6Z" /></Svg>
);
export const IconCheck = (p: IconProps) => (
  <Svg {...p}><path d="m4.5 12.5 5 5 10-11" /></Svg>
);
export const IconCheckCircle = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12.2 2.4 2.4 4.6-5" /></Svg>
);
export const IconX = (p: IconProps) => (
  <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>
);
export const IconAlert = (p: IconProps) => (
  <Svg {...p}><path d="M12 4.5 2.8 20h18.4L12 4.5Z" /><path d="M12 10v4M12 17.2h.01" /></Svg>
);
export const IconInfo = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></Svg>
);
export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}><path d="m6 9.5 6 6 6-6" /></Svg>
);
export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}><path d="m9.5 6 6 6-6 6" /></Svg>
);
export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}><path d="m14.5 6-6 6 6 6" /></Svg>
);
export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}><path d="M4 12h15M13 6l6 6-6 6" /></Svg>
);
export const IconArrowLeft = (p: IconProps) => (
  <Svg {...p}><path d="M20 12H5M11 6l-6 6 6 6" /></Svg>
);
export const IconMenu = (p: IconProps) => (
  <Svg {...p}><path d="M3.5 7h17M3.5 12h17M3.5 17h17" /></Svg>
);
export const IconBell = (p: IconProps) => (
  <Svg {...p}><path d="M18 9a6 6 0 1 0-12 0c0 4.5-2 6-2 6h16s-2-1.5-2-6Z" /><path d="M10.3 19a2 2 0 0 0 3.4 0" /></Svg>
);
export const IconMessage = (p: IconProps) => (
  <Svg {...p}><path d="M20.5 12.5a7.5 7.5 0 0 1-10.8 6.7L4 20.5l1.3-5.4A7.5 7.5 0 1 1 20.5 12.5Z" /></Svg>
);
export const IconSend = (p: IconProps) => (
  <Svg {...p}><path d="M4.5 12 20 4.5 12.5 20l-2-6.5-6-1.5Z" /><path d="M10.5 13.5 20 4.5" /></Svg>
);
export const IconSettings = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="2.75" /><path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" /></Svg>
);
export const IconLogout = (p: IconProps) => (
  <Svg {...p}><path d="M15 5.5V4a1.5 1.5 0 0 0-1.5-1.5h-8A1.5 1.5 0 0 0 4 4v16a1.5 1.5 0 0 0 1.5 1.5h8A1.5 1.5 0 0 0 15 20v-1.5" /><path d="M10 12h11M17.5 8.5l3.5 3.5-3.5 3.5" /></Svg>
);
export const IconHome = (p: IconProps) => (
  <Svg {...p}><path d="m3.5 10.5 8.5-7 8.5 7" /><path d="M5.5 9.2V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.2" /><path d="M10 21v-6h4v6" /></Svg>
);
export const IconGarage = (p: IconProps) => (
  <Svg {...p}><path d="M3 21V8.6a1 1 0 0 1 .6-.9l8-3.5a1 1 0 0 1 .8 0l8 3.5a1 1 0 0 1 .6.9V21" /><path d="M7 21v-7.5h10V21M7 17h10" /></Svg>
);
export const IconBuilding = (p: IconProps) => (
  <Svg {...p}><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16" /><path d="M15 10h4a1 1 0 0 1 1 1v10M2.5 21h19" /><path d="M7.5 8h1.5M7.5 12h1.5M7.5 16h1.5" /></Svg>
);
export const IconBolt = (p: IconProps) => (
  <Svg {...p}><path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12l1-8Z" /></Svg>
);
export const IconAccessible = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="4.5" r="1.8" /><path d="M9 8.5h6M12 8.5v5h4.5l2 6" /><path d="M12 13.5a5 5 0 1 0 4.2 7.7" /></Svg>
);
export const IconShield = (p: IconProps) => (
  <Svg {...p}><path d="M12 21.5s7.5-3.4 7.5-9.4V5.8L12 2.5 4.5 5.8v6.3c0 6 7.5 9.4 7.5 9.4Z" /></Svg>
);
export const IconLock = (p: IconProps) => (
  <Svg {...p}><rect x="4.5" y="10" width="15" height="11" rx="2.5" /><path d="M8 10V7.5a4 4 0 1 1 8 0V10" /></Svg>
);
export const IconEye = (p: IconProps) => (
  <Svg {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></Svg>
);
export const IconEyeOff = (p: IconProps) => (
  <Svg {...p}><path d="M9.9 5.8A9.3 9.3 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.2 4.1M6.2 7.9A17 17 0 0 0 2.5 12S6 18.5 12 18.5c1.3 0 2.4-.3 3.5-.7" /><path d="M10 10a3 3 0 0 0 4.2 4.2M3 3l18 18" /></Svg>
);
export const IconUpload = (p: IconProps) => (
  <Svg {...p}><path d="M12 16V4M8 7.5 12 3.5l4 4" /><path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15" /></Svg>
);
export const IconImage = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><circle cx="8.5" cy="10" r="1.5" /><path d="m4 17 4.5-4.5 3.5 3.5 3-2.5 5 4.5" /></Svg>
);
export const IconTrash = (p: IconProps) => (
  <Svg {...p}><path d="M4.5 7h15M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" /><path d="M6.5 7v12.5A1.5 1.5 0 0 0 8 21h8a1.5 1.5 0 0 0 1.5-1.5V7M10 11v6M14 11v6" /></Svg>
);
export const IconEdit = (p: IconProps) => (
  <Svg {...p}><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="m14.5 7.5 3 3" /></Svg>
);
export const IconPlus = (p: IconProps) => (
  <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
);
export const IconMinus = (p: IconProps) => (
  <Svg {...p}><path d="M5 12h14" /></Svg>
);
export const IconFilter = (p: IconProps) => (
  <Svg {...p}><path d="M3.5 5.5h17l-6.5 8V20l-4 1.5V13.5l-6.5-8Z" /></Svg>
);
export const IconSort = (p: IconProps) => (
  <Svg {...p}><path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" /></Svg>
);
export const IconShare = (p: IconProps) => (
  <Svg {...p}><circle cx="18" cy="5.5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18.5" r="2.5" /><path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1" /></Svg>
);
export const IconFlag = (p: IconProps) => (
  <Svg {...p}><path d="M5 21V4M5 5h11l-1.6 3.5L16 12H5" /></Svg>
);
export const IconNavigation = (p: IconProps) => (
  <Svg {...p}><path d="M20.5 3.5 3.5 10.2l7.3 2.9 2.9 7.4 6.8-17Z" /></Svg>
);
export const IconCrosshair = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="2" /><path d="M12 2v3M12 19v3M22 12h-3M5 12H2" /></Svg>
);
export const IconWallet = (p: IconProps) => (
  <Svg {...p}><path d="M20 8V6.5A1.5 1.5 0 0 0 18.5 5H5a2 2 0 0 0 0 4h14a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19 19H5a2 2 0 0 1-2-2V7" /><circle cx="16.5" cy="14" r="1.2" /></Svg>
);
export const IconChart = (p: IconProps) => (
  <Svg {...p}><path d="M4 20h16M7 20v-6M12 20V8M17 20v-9" /></Svg>
);
export const IconReceipt = (p: IconProps) => (
  <Svg {...p}><path d="M5 21V3.8a.5.5 0 0 1 .8-.4l2 1.4 2.4-1.6a.5.5 0 0 1 .6 0L13 4.8l2.4-1.6a.5.5 0 0 1 .6 0L18.2 4.8l1-.7a.5.5 0 0 1 .8.4V21l-2.5-1.5L15 21l-2.5-1.5L10 21l-2.5-1.5L5 21Z" /><path d="M9 9h6M9 13h6" /></Svg>
);
export const IconHelp = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M9.7 9.5a2.4 2.4 0 1 1 3.2 2.2c-.6.2-.9.8-.9 1.4v.4M12 16.8h.01" /></Svg>
);
export const IconCompass = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="m14.8 9.2-1.6 4.4-4.4 1.6 1.6-4.4 4.4-1.6Z" /></Svg>
);
export const IconRoof = (p: IconProps) => (
  <Svg {...p}><path d="M2.5 11 12 4l9.5 7" /><path d="M6 13.5v6M18 13.5v6M6 19.5h12" /></Svg>
);
export const IconLightbulb = (p: IconProps) => (
  <Svg {...p}><path d="M9.5 18h5M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5.9 1.2.9 1.9v.2h5.2v-.2c0-.7.3-1.4.9-1.9A6 6 0 0 0 12 3Z" /></Svg>
);
export const IconCamera = (p: IconProps) => (
  <Svg {...p}><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2a1 1 0 0 0 .8-.4l1.1-1.5a1 1 0 0 1 .8-.4h5.2a1 1 0 0 1 .8.4l1.1 1.5a1 1 0 0 0 .8.4h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-9Z" /><circle cx="12" cy="12.5" r="3.2" /></Svg>
);
export const IconRefresh = (p: IconProps) => (
  <Svg {...p}><path d="M20 11.5a8 8 0 1 0-.7 4.5" /><path d="M20 4v7.5h-7" /></Svg>
);
export const IconWifiOff = (p: IconProps) => (
  <Svg {...p}><path d="M3 3l18 18" /><path d="M8.5 15.5a5 5 0 0 1 7 0M5 12a10 10 0 0 1 3.5-2.3M19 12a10 10 0 0 0-7-2.9M2 8.8A15 15 0 0 1 7 6M22 8.8a15 15 0 0 0-6-3.2" /><path d="M12 19h.01" /></Svg>
);
export const IconWifi = (p: IconProps) => (
  <Svg {...p}><path d="M8.5 15.5a5 5 0 0 1 7 0M5 12a10 10 0 0 1 14 0M2 8.8a15 15 0 0 1 20 0" /><path d="M12 19h.01" /></Svg>
);
export const IconDownload = (p: IconProps) => (
  <Svg {...p}><path d="M12 3.5v12M8 11.5l4 4 4-4" /><path d="M4 16v2.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V16" /></Svg>
);
export const IconPause = (p: IconProps) => (
  <Svg {...p}><path d="M9 5v14M15 5v14" /></Svg>
);
export const IconCopy = (p: IconProps) => (
  <Svg {...p}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></Svg>
);
export const IconArchive = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="4" width="18" height="4.5" rx="1.5" /><path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5M10 12.5h4" /></Svg>
);
export const IconSpinner = ({ className, ...p }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    aria-hidden="true"
    focusable="false"
    className={className}
    {...p}
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" fill="none" />
    <path
      d="M21 12a9 9 0 0 0-9-9"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);
