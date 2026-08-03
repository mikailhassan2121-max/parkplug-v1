"use client";

import { use } from "react";
import { MessageThread } from "@/components/messaging/message-thread";

export default function HostMessageThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <MessageThread conversationId={id} audience="host" />;
}
