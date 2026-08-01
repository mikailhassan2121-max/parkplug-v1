"use client";

import { useState } from "react";
import { reservations as reservationsApi } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import type { Reservation } from "@/lib/types";
import { EmptyState, ErrorState, SkeletonRow } from "@/components/ui/feedback";
import { Tabs, TabPanel } from "@/components/ui/menu";
import { ConfirmDialog } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { IconCalendar } from "@/components/ui/icons";
import { ReservationCard } from "@/components/dashboard/reservation-card";

type TabId = "upcoming" | "completed" | "canceled";

function bucket(reservation: Reservation): TabId {
  if (reservation.status === "canceled" || reservation.status === "refunded") return "canceled";
  if (reservation.status === "completed") return "completed";
  return new Date(reservation.endAt).getTime() < Date.now() ? "completed" : "upcoming";
}

export default function ReservationsPage() {
  const state = useAsync(() => reservationsApi.list(), []);
  const { toast } = useToast();
  const [active, setActive] = useState<TabId>("upcoming");
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [canceling, setCanceling] = useState(false);

  const all = state.status === "ready" ? state.data : [];
  const groups: Record<TabId, Reservation[]> = {
    upcoming: all.filter((r) => bucket(r) === "upcoming").sort((a, b) => a.startAt.localeCompare(b.startAt)),
    completed: all.filter((r) => bucket(r) === "completed"),
    canceled: all.filter((r) => bucket(r) === "canceled"),
  };

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCanceling(true);
    const result = await reservationsApi.cancel(cancelTarget.reference);
    setCanceling(false);
    setCancelTarget(null);
    if (result.ok) {
      toast({
        tone: "success",
        title: "Reservation canceled",
        description: "Any refund follows the cancellation policy on that booking.",
      });
      state.reload();
    } else {
      toast({ tone: "error", title: "Could not cancel", description: result.error.message });
    }
  }

  const emptyCopy: Record<TabId, { title: string; description: string }> = {
    upcoming: {
      title: "You have no upcoming reservations.",
      description: "When you reserve a space it will appear here with directions and host instructions.",
    },
    completed: {
      title: "No completed reservations yet.",
      description: "Reservations move here after your departure time passes.",
    },
    canceled: {
      title: "No canceled reservations.",
      description: "Anything you cancel will be listed here for your records.",
    },
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">My reservations</h1>
      <p className="mt-1.5 text-sm text-ink-600">
        Everything you have booked, past and upcoming.
      </p>

      <Tabs
        label="Reservation status"
        className="mt-6"
        active={active}
        onChange={(id) => setActive(id as TabId)}
        tabs={[
          { id: "upcoming", label: "Upcoming", count: groups.upcoming.length },
          { id: "completed", label: "Completed", count: groups.completed.length },
          { id: "canceled", label: "Canceled", count: groups.canceled.length },
        ]}
      />

      <div className="mt-6">
        {state.status === "loading" ? (
          <div role="status" aria-busy="true" className="space-y-4">
            <span className="sr-only">Loading your reservations</span>
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : state.status === "error" ? (
          <ErrorState
            title="We could not load your reservations"
            description={state.error.message}
            actions={[
              { label: "Try again", onClick: state.reload },
              { label: "Contact support", href: "/support", variant: "secondary" },
            ]}
          />
        ) : (
          (["upcoming", "completed", "canceled"] as TabId[]).map((id) => (
            <TabPanel key={id} id={id} active={active}>
              {groups[id].length === 0 ? (
                <EmptyState
                  icon={<IconCalendar />}
                  title={emptyCopy[id].title}
                  description={emptyCopy[id].description}
                  actions={id === "upcoming" ? [{ label: "Find Parking", href: "/search" }] : []}
                />
              ) : (
                <ul className="space-y-4">
                  {groups[id].map((reservation) => (
                    <li key={reservation.id}>
                      <ReservationCard
                        reservation={reservation}
                        onCancel={
                          reservation.canCancel ? () => setCancelTarget(reservation) : undefined
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </TabPanel>
          ))
        )}
      </div>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => void confirmCancel()}
        loading={canceling}
        title="Cancel this reservation?"
        description={
          <>
            <p className="font-semibold text-ink-900">{cancelTarget?.listing.title}</p>
            <p className="mt-2">{cancelTarget?.cancellationPolicy.summary}</p>
            <p className="mt-2">Your host will be notified. This cannot be undone.</p>
          </>
        }
        confirmLabel="Cancel reservation"
        cancelLabel="Keep reservation"
        destructive
      />
    </div>
  );
}
