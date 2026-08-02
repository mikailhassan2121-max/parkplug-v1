import { Router } from "express";
import { z } from "zod";
import { asyncRoute } from "../middleware/error-handler.js";
import { badRequest } from "../lib/errors.js";
import { env } from "../env.js";

export const geocodeRouter = Router();

type NominatimAddress = Record<string, string>;

type NominatimEntry = {
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: NominatimAddress;
};

export type GeocodeMatch = {
  label: string;
  center: { lat: number; lng: number };
  city?: string;
  state?: string;
};

// Nominatim's usage policy requires a custom User-Agent or Referer that
// identifies the calling application — browsers refuse to let client-side JS
// set a custom User-Agent at all, which is one concrete reason this lives on
// the server rather than being called directly from the page.
const NOMINATIM_USER_AGENT = `ParkPlug/1.0 (${env.FRONTEND_URL})`;

const querySchema = z.object({
  q: z.string().trim().min(3, "Enter at least 3 characters to search."),
});

geocodeRouter.get(
  "/search",
  asyncRoute(async (req, res) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Enter an address to search.");

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", parsed.data.q);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "6");

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "User-Agent": NOMINATIM_USER_AGENT, Accept: "application/json" },
      });
    } catch {
      // A network hiccup talking to Nominatim is not the caller's fault —
      // report an empty result set rather than a 502, matching the "no
      // matches" empty state the combobox already renders.
      res.json([]);
      return;
    }

    if (!response.ok) {
      console.error(`[geocode] Nominatim responded ${response.status}`);
      res.json([]);
      return;
    }

    const payload: unknown = await response.json();
    const entries = Array.isArray(payload) ? (payload as NominatimEntry[]) : [];

    const matches: GeocodeMatch[] = entries.flatMap((entry) => {
      const lat = Number(entry.lat);
      const lng = Number(entry.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
      const address = entry.address ?? {};
      return [
        {
          label: entry.display_name ?? parsed.data.q,
          center: { lat, lng },
          city: address.city ?? address.town ?? address.village ?? address.hamlet,
          state: address.state,
        },
      ];
    });

    res.json(matches);
  }),
);
