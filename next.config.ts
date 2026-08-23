import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Host photo uploads are served from the configured media origin.
    // Add the real bucket/CDN host here when the upload API is connected.
    remotePatterns: [],
  },
  async redirects() {
    return [
      // /search and /live merged into one unified driver discovery
      // experience; /host/facilities became the property-owner app shell.
      { source: "/search", destination: "/parking", permanent: false },
      { source: "/live", destination: "/parking", permanent: false },
      { source: "/host/facilities", destination: "/owner/facilities", permanent: false },
      { source: "/host/facilities/:facilityId", destination: "/owner/facilities/:facilityId", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
