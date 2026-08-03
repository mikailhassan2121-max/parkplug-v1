import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { RequireAuth } from "@/components/dashboard/require-auth";
import { Container } from "@/components/ui/card";
import { MessageThread } from "@/components/messaging/message-thread";

export const metadata: Metadata = buildMetadata({
  title: "Conversation",
  description: "Message your host about a confirmed reservation.",
  noIndex: true,
});

export default async function MessageThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireAuth>
      <Container size="default" className="py-6 lg:py-10">
        <MessageThread conversationId={id} audience="driver" />
      </Container>
    </RequireAuth>
  );
}
