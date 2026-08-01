import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { RequireAuth } from "@/components/dashboard/require-auth";
import { Container } from "@/components/ui/card";
import { ConversationList } from "@/components/messaging/conversation-list";

export const metadata: Metadata = buildMetadata({
  title: "Messages",
  description: "Message your host about a confirmed reservation.",
  noIndex: true,
});

export default function MessagesPage() {
  return (
    <RequireAuth>
      <Container size="default" className="py-6 lg:py-10">
        <ConversationList audience="driver" />
      </Container>
    </RequireAuth>
  );
}
