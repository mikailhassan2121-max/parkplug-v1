"use client";

import Link from "next/link";
import { messaging } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import { Alert } from "@/components/ui/alert";
import { EmptyState, ErrorState, SkeletonRow } from "@/components/ui/feedback";
import { IconMessage } from "@/components/ui/icons";

/**
 * Conversations are scoped to a reservation — there is no open inbox, so a
 * host and driver can only reach each other about a booking they share.
 */
export function ConversationList({ audience }: { audience: "driver" | "host" }) {
  const state = useAsync(() => messaging.listConversations(), []);

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Messages</h1>
      <p className="mt-1.5 text-sm text-ink-600">
        {audience === "host"
          ? "Conversations with drivers about reservations at your spaces."
          : "Conversations with hosts about your reservations."}
      </p>

      <Alert tone="neutral" className="mt-6">
        For everyone&rsquo;s safety, keep messages on ParkPlugs. Phone numbers and
        email addresses are not shared by default.
      </Alert>

      <div className="mt-6">
        {state.status === "loading" ? (
          <div role="status" aria-busy="true" className="space-y-3">
            <span className="sr-only">Loading conversations</span>
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : state.status === "error" ? (
          <ErrorState
            title="Messages could not be loaded"
            description={state.error.message}
            actions={[{ label: "Try again", onClick: state.reload }]}
          />
        ) : state.data.length === 0 ? (
          <EmptyState
            icon={<IconMessage />}
            title="No conversations yet"
            description={
              audience === "host"
                ? "When a driver reserves one of your spaces, you will be able to message each other here."
                : "Once you have a confirmed reservation, you can message your host here."
            }
            actions={
              audience === "host"
                ? [{ label: "View reservations", href: "/host/reservations" }]
                : [{ label: "Find Parking", href: "/search" }]
            }
          />
        ) : (
          <ul className="divide-y divide-ink-200 overflow-hidden rounded-card border border-ink-200 bg-white">
            {state.data.map((conversation) => (
              <li key={conversation.id}>
                <Link
                  href={`${audience === "host" ? "/host/messages" : "/messages"}/${conversation.id}`}
                  className="flex items-start gap-3 px-4 py-4 transition-colors hover:bg-ink-50 focus-visible:bg-ink-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-ink-900">
                      {conversation.counterpart.displayName}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-600">
                      {conversation.listingTitle} · {conversation.reservationReference}
                    </p>
                    <p className="mt-1 truncate text-sm text-ink-700">
                      {conversation.lastMessagePreview}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-2xs text-ink-500">
                      {formatRelative(conversation.lastMessageAt)}
                    </p>
                    {conversation.unreadCount > 0 ? (
                      <span className="mt-1 inline-grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1.5 text-2xs font-bold text-white">
                        {conversation.unreadCount}
                        <span className="sr-only"> unread messages</span>
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
