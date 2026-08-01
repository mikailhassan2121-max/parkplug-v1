"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { notifications as notificationsApi } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import type { AppNotification, NotificationType } from "@/lib/types";
import { RequireAuth } from "@/components/dashboard/require-auth";
import { Container } from "@/components/ui/card";
import { Button, IconButton } from "@/components/ui/button";
import { EmptyState, ErrorState, SkeletonRow } from "@/components/ui/feedback";
import { Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import {
  IconBell,
  IconCalendar,
  IconCheckCircle,
  IconMessage,
  IconTrash,
  IconWallet,
} from "@/components/ui/icons";

const TYPE_META: Record<NotificationType, { label: string; icon: React.ReactNode }> = {
  reservation_confirmed: { label: "Reservations", icon: <IconCheckCircle /> },
  reservation_reminder: { label: "Reservations", icon: <IconCalendar /> },
  host_new_booking: { label: "Hosting", icon: <IconCalendar /> },
  reservation_canceled: { label: "Reservations", icon: <IconCalendar /> },
  refund_update: { label: "Payments", icon: <IconWallet /> },
  listing_approved: { label: "Hosting", icon: <IconCheckCircle /> },
  listing_needs_changes: { label: "Hosting", icon: <IconBell /> },
  review_reminder: { label: "Reviews", icon: <IconBell /> },
  new_message: { label: "Messages", icon: <IconMessage /> },
  report_update: { label: "Parking reports", icon: <IconBell /> },
  support_reply: { label: "Support", icon: <IconMessage /> },
};

const FILTERS = [
  { value: "all", label: "All notifications" },
  { value: "Reservations", label: "Reservations" },
  { value: "Hosting", label: "Hosting" },
  { value: "Messages", label: "Messages" },
  { value: "Payments", label: "Payments" },
  { value: "Reviews", label: "Reviews" },
  { value: "Parking reports", label: "Parking reports" },
  { value: "Support", label: "Support" },
];

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <NotificationsView />
    </RequireAuth>
  );
}

function NotificationsView() {
  const state = useAsync(() => notificationsApi.list(), []);
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");

  const all = state.status === "ready" ? state.data : [];
  const visible =
    filter === "all" ? all : all.filter((n) => TYPE_META[n.type]?.label === filter);
  const unreadCount = all.filter((n) => !n.readAt).length;

  async function markAllRead() {
    const result = await notificationsApi.markAllRead();
    if (result.ok) {
      state.reload();
      toast({ tone: "success", title: "All notifications marked as read" });
    }
  }

  async function remove(notification: AppNotification) {
    const result = await notificationsApi.remove(notification.id);
    if (result.ok) state.reload();
    else toast({ tone: "error", title: "Could not delete", description: result.error.message });
  }

  async function markRead(notification: AppNotification) {
    if (notification.readAt) return;
    await notificationsApi.markRead(notification.id);
    state.reload();
  }

  return (
    <Container size="default" className="py-6 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Notifications</h1>
          <p className="mt-1.5 text-sm text-ink-600">
            {unreadCount > 0
              ? `${unreadCount} unread ${unreadCount === 1 ? "notification" : "notifications"}`
              : "You are all caught up."}
          </p>
        </div>
        {unreadCount > 0 ? (
          <Button variant="secondary" size="sm" onClick={() => void markAllRead()}>
            Mark all as read
          </Button>
        ) : null}
      </div>

      <div className="mt-6 max-w-xs">
        <label htmlFor="notification-filter" className="sr-only">
          Filter notifications by type
        </label>
        <Select
          id="notification-filter"
          size="sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-6">
        {state.status === "loading" ? (
          <div role="status" aria-busy="true" className="space-y-3">
            <span className="sr-only">Loading notifications</span>
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : state.status === "error" ? (
          <ErrorState
            title="We could not load your notifications"
            description={state.error.message}
            actions={[{ label: "Try again", onClick: state.reload }]}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<IconBell />}
            title={filter === "all" ? "No notifications yet" : "Nothing in this category"}
            description={
              filter === "all"
                ? "Reservation updates, host activity, and replies from support will appear here."
                : "Try a different category, or view all notifications."
            }
            actions={
              filter === "all"
                ? [{ label: "Find Parking", href: "/search" }]
                : [{ label: "View all", onClick: () => setFilter("all") }]
            }
          />
        ) : (
          <ul className="divide-y divide-ink-200 overflow-hidden rounded-card border border-ink-200 bg-white">
            {visible.map((notification) => {
              const meta = TYPE_META[notification.type];
              const unread = !notification.readAt;
              const body = (
                <>
                  <span
                    className={cn(
                      "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-base",
                      unread ? "bg-brand-50 text-brand-700" : "bg-ink-100 text-ink-500",
                    )}
                    aria-hidden="true"
                  >
                    {meta?.icon ?? <IconBell />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn("text-sm", unread ? "font-bold text-ink-900" : "font-semibold text-ink-700")}>
                        {notification.title}
                      </span>
                      {unread ? (
                        <>
                          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-brand-600" />
                          <span className="sr-only">Unread</span>
                        </>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-600">
                      {notification.body}
                    </span>
                    <span className="mt-1 block text-2xs text-ink-500">
                      {formatRelative(notification.createdAt)}
                    </span>
                  </span>
                </>
              );

              return (
                <li key={notification.id} className={cn("flex items-start gap-3 px-4 py-4", unread && "bg-brand-50/30")}>
                  {notification.href ? (
                    <Link
                      href={notification.href}
                      onClick={() => void markRead(notification)}
                      className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left"
                    >
                      {body}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void markRead(notification)}
                      className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left"
                    >
                      {body}
                    </button>
                  )}
                  <IconButton
                    label={`Delete notification: ${notification.title}`}
                    icon={<IconTrash />}
                    size="sm"
                    onClick={() => void remove(notification)}
                    className="shrink-0 text-ink-400 hover:text-danger-700"
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Container>
  );
}
