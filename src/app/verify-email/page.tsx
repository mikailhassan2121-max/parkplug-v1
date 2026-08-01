import { Suspense } from "react";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Spinner } from "@/components/ui/feedback";
import { VerifyEmailView } from "./verify-view";

export const metadata: Metadata = buildMetadata({
  title: "Verify your email",
  path: "/verify-email",
  noIndex: true,
});

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="grid flex-1 place-items-center py-20"><Spinner size="lg" /></div>}>
      <VerifyEmailView />
    </Suspense>
  );
}
