import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { SimulatorView } from "./simulator-view";

export const metadata: Metadata = buildMetadata({
  title: "Sensor Simulator",
  description: "Demo tool for exercising the live sensor ingest pipeline.",
  path: "/admin/sensor-simulator",
  noIndex: true,
});

export default function SensorSimulatorPage() {
  return <SimulatorView />;
}
