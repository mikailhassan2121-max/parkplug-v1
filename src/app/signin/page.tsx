import { Suspense } from "react";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Spinner } from "@/components/ui/feedback";
import { SignInForm } from "./signin-form";

export const metadata: Metadata = buildMetadata({
  title: "Sign in",
  description: "Sign in to ParkPlugs to manage reservations, saved spaces, and your listings.",
  path: "/signin",
  noIndex: true,
});

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="grid flex-1 place-items-center py-20"><Spinner size="lg" /></div>}>
      <SignInForm />
    </Suspense>
  );
}
