import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/business";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // "List Your Space" is a public marketing entry point and must stay
        // indexable even though the rest of /host is private.
        allow: ["/", "/host/listings/new"],
        // Anything containing personal data, an exact address, or a payment
        // step stays out of the index.
        disallow: [
          "/dashboard",
          "/host/",
          "/book",
          "/reservations",
          "/notifications",
          "/messages",
          "/reviews",
          "/signin",
          "/verify-email",
          "/reset-password",
          "/forgot-password",
          "/api/",
        ],
      },
    ],
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
