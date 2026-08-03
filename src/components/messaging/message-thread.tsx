"use client";

import { useEffect, useRef, useState } from "react";
import { messaging } from "@/lib/api";
import type { Conversation, Message } from "@/lib/types";
import { formatRelative } from "@/lib/format";
import { useAsync, useAction } from "@/lib/use-async";
import { cn } from "@/lib/cn";
import { Textarea } from "@/components/ui/form";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/feedback";
import { IconArrowLeft, IconSend } from "@/components/ui/icons";

/**
 * A conversation thread. Header details (counterpart, listing, reservation)
 * come from the same owner-scoped conversation list the list page already
 * uses — there is no separate "get one conversation" endpoint, and reusing
 * this one means a conversation that isn't yours simply never appears here,
 * the same guarantee the backend's own ownership check provides.
 */
export function MessageThread({ conversationId, audience }: { conversationId: string; audience: "driver" | "host" }) {
  const listState = useAsync(() => messaging.listConversations(), []);
  const messagesState = useAsync(() => messaging.getMessages(conversationId), [conversationId]);
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const listEndRef = useRef<HTMLDivElement>(null);
  const backHref = audience === "host" ? "/host/messages" : "/messages";

  const send = useAction((body: string) => messaging.sendMessage(conversationId, body));

  const conversation: Conversation | undefined =
    listState.status === "ready" ? listState.data.find((c) => c.id === conversationId) : undefined;

  const serverMessages = messagesState.status === "ready" ? messagesState.data : [];
  const allMessages = [...serverMessages, ...pendingMessages];

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: "end" });
  }, [allMessages.length]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || send.pending) return;

    const tempId = `pending-${Date.now()}`;
    setPendingMessages((prev) => [
      ...prev,
      { id: tempId, body, sentAt: new Date().toISOString(), direction: "outgoing", status: "sending" },
    ]);
    setDraft("");

    const result = await send.run(body);
    setPendingMessages((prev) => {
      if (!result || !result.ok) {
        return prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m));
      }
      return prev.filter((m) => m.id !== tempId);
    });
    if (result?.ok) messagesState.reload();
  }

  function retry(pending: Message) {
    setPendingMessages((prev) => prev.filter((m) => m.id !== pending.id));
    setDraft(pending.body);
  }

  const loading = listState.status === "loading" || messagesState.status === "loading";
  const errored = listState.status === "error" ? listState.error : messagesState.status === "error" ? messagesState.error : null;

  return (
    <div className="flex h-[calc(100dvh-8rem)] max-h-[42rem] flex-col overflow-hidden rounded-card border border-ink-200 bg-white sm:h-[36rem]">
      <div className="flex items-center gap-3 border-b border-ink-200 px-4 py-3">
        <ButtonLink href={backHref} variant="ghost" size="sm" leadingIcon={<IconArrowLeft />}>
          Back
        </ButtonLink>
        <div className="min-w-0 flex-1">
          {conversation ? (
            <>
              <p className="truncate text-sm font-bold text-ink-900">{conversation.counterpart.displayName}</p>
              <p className="truncate text-xs text-ink-600">
                {conversation.listingTitle} · {conversation.reservationReference}
              </p>
            </>
          ) : (
            <p className="text-sm font-bold text-ink-900">Conversation</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div role="status" aria-busy="true" className="grid h-full place-items-center">
            <span className="sr-only">Loading conversation</span>
            <Spinner size="lg" />
          </div>
        ) : errored ? (
          <ErrorState
            title="This conversation could not be loaded"
            description={errored.message}
            actions={[{ label: "Try again", onClick: () => (listState.status === "error" ? listState.reload() : messagesState.reload()) }]}
          />
        ) : listState.status === "ready" && !conversation ? (
          <ErrorState
            title="Conversation not found"
            description="This conversation does not exist, or is not one of yours."
            actions={[{ label: "Back to messages", href: backHref }]}
          />
        ) : allMessages.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="Say hello — messages here are only visible to you and the person you booked with."
          />
        ) : (
          <ul className="space-y-3">
            {allMessages.map((message) => (
              <li key={message.id} className={cn("flex", message.direction === "outgoing" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    message.direction === "outgoing"
                      ? "bg-brand-600 text-white"
                      : "border border-ink-200 bg-ink-50 text-ink-900",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <p
                    className={cn(
                      "mt-1 text-2xs",
                      message.direction === "outgoing" ? "text-brand-100" : "text-ink-500",
                    )}
                  >
                    {message.status === "sending"
                      ? "Sending…"
                      : message.status === "failed"
                        ? "Not sent"
                        : formatRelative(message.sentAt)}
                    {message.status === "failed" ? (
                      <button
                        type="button"
                        onClick={() => retry(message)}
                        className="ml-2 font-semibold underline underline-offset-2"
                      >
                        Retry
                      </button>
                    ) : null}
                  </p>
                </div>
              </li>
            ))}
            <div ref={listEndRef} />
          </ul>
        )}
      </div>

      {send.error ? (
        <div className="px-4">
          <Alert tone="danger" live>
            {send.error.message}
          </Alert>
        </div>
      ) : null}

      <form onSubmit={submit} className="flex items-end gap-2 border-t border-ink-200 p-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit(e as unknown as React.FormEvent);
            }
          }}
          placeholder="Write a message…"
          aria-label="Message"
          maxLength={2000}
          className="min-h-11 flex-1 resize-none"
          rows={1}
          disabled={!conversation && listState.status === "ready"}
        />
        <Button
          type="submit"
          size="md"
          leadingIcon={<IconSend />}
          loading={send.pending}
          loadingText="Sending"
          disabled={!draft.trim() || (!conversation && listState.status === "ready")}
        >
          <span className="sr-only sm:not-sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}
