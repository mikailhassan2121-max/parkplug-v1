import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "ParkPlug — Parking made easier, one space at a time";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default social card, generated at build time so no binary asset is needed. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #032723 0%, #12816f 100%)",
          padding: "72px",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 38,
              fontWeight: 800,
              color: "#12816f",
            }}
          >
            P
          </div>
          <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.02em" }}>ParkPlug</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.08,
              maxWidth: 900,
            }}
          >
            Parking made easier, one space at a time.
          </div>
          <div style={{ fontSize: 30, color: "#aeead9", maxWidth: 860, lineHeight: 1.35 }}>
            Find reservable private parking and recently reported free spaces
            near your destination.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
