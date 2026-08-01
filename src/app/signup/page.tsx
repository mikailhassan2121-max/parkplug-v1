import { Suspense } from "react";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Spinner } from "@/components/ui/feedback";
import { SignUpForm } from "./signup-form";

export const metadata: Metadata = buildMetadata({
  title: "Create your account",
  description:
    "Create a ParkPlug account to reserve parking, list a space, and report free public parking.",
  path: "/signup",
});

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="grid flex-1 place-items-center py-20"><Spinner size="lg" /></div>}>
      <SignUpForm />
    </Suspense>
  );
}
