"use client";

import { useEffect, useState } from "react";
import { fetchMyFacilities } from "@/lib/api/sensors";
import type { ApiError } from "@/lib/api/result";
import type { Facility } from "@/lib/sensor-types";

export type OwnerFacilitiesState =
  | { status: "loading" }
  | { status: "ready"; facilities: Facility[] }
  | { status: "error"; error: ApiError };

/** The signed-in owner/host's facilities, shared by every /owner page. */
export function useOwnerFacilities(): OwnerFacilitiesState & { reload: () => void } {
  const [state, setState] = useState<OwnerFacilitiesState>({ status: "loading" });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    void fetchMyFacilities().then((result) => {
      if (cancelled) return;
      setState(result.ok ? { status: "ready", facilities: result.data } : { status: "error", error: result.error });
    });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}
