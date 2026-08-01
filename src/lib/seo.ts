import type { Metadata } from "next";
import { siteUrl } from "@/config/business";

const DEFAULT_DESCRIPTION =
  "Find reservable private parking and recently reported free spaces near your destination. List your unused driveway or lot and earn when drivers reserve.";

/**
 * Builds page metadata with a canonical URL, Open Graph and Twitter cards.
 * `noIndex` is used for anything behind sign-in or containing personal data.
 */
export function buildMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  noIndex = false,
  image,
  type = "website",
}: {
  title: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  /** Overrides the generated Open Graph image for this route. */
  image?: string;
  type?: "website" | "article";
}): Metadata {
  const url = new URL(path, siteUrl).toString();
  const fullTitle = title === "ParkPlug" ? title : `${title} · ParkPlug`;
  // When no override is given, Next's generated `opengraph-image` is used.
  const images = image
    ? [{ url: new URL(image, siteUrl).toString(), width: 1200, height: 630, alt: fullTitle }]
    : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: "ParkPlug",
      type,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      ...(images ? { images: images.map((i) => i.url) } : {}),
    },
    robots: noIndex
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
  };
}
