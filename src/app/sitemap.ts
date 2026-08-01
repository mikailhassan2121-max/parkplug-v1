import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/business";

/**
 * Public pages only. Anything behind sign-in, and anything that could expose a
 * reservation or an exact address, is deliberately excluded.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const routes: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/search", priority: 0.9, changeFrequency: "daily" },
    { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly" },
    { path: "/host/listings/new", priority: 0.8, changeFrequency: "monthly" },
    { path: "/report-parking", priority: 0.8, changeFrequency: "monthly" },
    { path: "/pricing", priority: 0.7, changeFrequency: "monthly" },
    { path: "/about", priority: 0.6, changeFrequency: "monthly" },
    { path: "/safety", priority: 0.6, changeFrequency: "monthly" },
    { path: "/hosting-guide", priority: 0.6, changeFrequency: "monthly" },
    { path: "/help", priority: 0.6, changeFrequency: "weekly" },
    { path: "/support", priority: 0.5, changeFrequency: "monthly" },
    { path: "/accessibility", priority: 0.4, changeFrequency: "yearly" },
    { path: "/signup", priority: 0.4, changeFrequency: "yearly" },
    { path: "/legal/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/legal/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/legal/cancellation", priority: 0.3, changeFrequency: "yearly" },
    { path: "/legal/host-standards", priority: 0.3, changeFrequency: "yearly" },
    { path: "/legal/driver-standards", priority: 0.3, changeFrequency: "yearly" },
    { path: "/legal/community-guidelines", priority: 0.3, changeFrequency: "yearly" },
    { path: "/legal/prohibited-conduct", priority: 0.3, changeFrequency: "yearly" },
    { path: "/legal/cookies", priority: 0.2, changeFrequency: "yearly" },
    { path: "/legal/data-deletion", priority: 0.2, changeFrequency: "yearly" },
  ];

  return routes.map((route) => ({
    url: new URL(route.path, siteUrl).toString(),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
