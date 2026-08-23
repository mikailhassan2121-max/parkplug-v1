import type { Metadata, Viewport } from "next";
import { Outfit, Source_Sans_3 } from "next/font/google";
import { siteUrl } from "@/config/business";
import { SessionProvider } from "@/lib/session";
import { ToastProvider } from "@/components/ui/toast";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileTabBar, MobileTabBarSpacer } from "@/components/layout/mobile-tab-bar";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { CookieConsent } from "@/components/layout/cookie-consent";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-sans",
  // Self-hosted at build time and preloaded, so there is no runtime font fetch.
  preload: true,
});

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ParkPlugs · Parking made easier, one space at a time",
    template: "%s · ParkPlugs",
  },
  description:
    "Find reservable private parking and recently reported free spaces near your destination.",
  applicationName: "ParkPlugs",
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  // Users must be able to zoom; never lock the scale.
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${outfit.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-focusable left-4 top-4 z-200 rounded-xl bg-brand-700 px-4 py-3 text-sm font-bold text-white shadow-e3">
          Skip to main content
        </a>

        <SessionProvider>
          <ToastProvider>
            <OfflineBanner />
            <SiteHeader />

            <main id="main" className="flex flex-1 flex-col">
              {children}
            </main>

            <SiteFooter />
            <MobileTabBarSpacer />
            <MobileTabBar />
            <CookieConsent />
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
