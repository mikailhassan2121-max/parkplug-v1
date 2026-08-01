import { Suspense } from "react";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Spinner } from "@/components/ui/feedback";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = buildMetadata({
  title: "Choose a new password",
  path: "/reset-password",
  noIndex: true,
});

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="grid flex-1 place-items-center py-20"><Spinner size="lg" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
