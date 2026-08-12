import type {
  User,
  Vehicle,
  Listing,
  ListingPhoto,
  ListingAvailability,
  FreeParkingReport,
  Reservation,
  ReservationTimelineEvent,
  Review,
  Notification,
  Conversation,
  Message,
} from "@prisma/client";
import { distanceMeters, obfuscate, walkingMinutes, type Coordinates } from "./geo.js";
import { quote } from "./pricing.js";

const undef = <T>(v: T | null | undefined): T | undefined => (v === null ? undefined : v);

/* -------------------------------------------------------------------------
   Session / user
   ------------------------------------------------------------------------- */

export function toSessionUser(user: User) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    emailVerified: user.emailVerified,
    avatarUrl: undef(user.avatarUrl),
    isHost: user.isHost,
    createdAt: user.createdAt.toISOString(),
    notificationPrefs: {
      reservationUpdates: user.notifyReservationUpdates,
      reminders: user.notifyReminders,
      messages: user.notifyMessages,
      productNews: user.notifyProductNews,
      channelEmail: user.notifyChannelEmail,
      channelPush: user.notifyChannelPush,
    },
  };
}

/* -------------------------------------------------------------------------
   Vehicles
   ------------------------------------------------------------------------- */

export function toVehicleDto(v: Vehicle) {
  return {
    id: v.id,
    make: v.make,
    model: v.model,
    color: v.color,
    licensePlate: v.licensePlate,
    plateRegion: v.plateRegion,
    size: v.size,
    isDefault: v.isDefault,
  };
}

/* -------------------------------------------------------------------------
   Listings
   ------------------------------------------------------------------------- */

type ListingWithRelations = Listing & {
  photos: ListingPhoto[];
  availability: ListingAvailability[];
  host: User;
};

function photosDto(photos: ListingPhoto[]) {
  return [...photos]
    .sort((a, b) => a.position - b.position)
    .map((p) => ({ id: p.id, url: p.url, alt: p.alt, width: p.width, height: p.height }));
}

function availabilityDto(rows: ListingAvailability[]) {
  return rows.map((a) => ({ dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime }));
}

function locationDto(listing: Listing) {
  return {
    label: listing.locationLabel,
    neighborhood: undef(listing.neighborhood),
    city: listing.city,
    state: listing.state,
    center: { lat: listing.centerLat, lng: listing.centerLng },
    radiusMeters: listing.radiusMeters,
  };
}

function cancellationPolicyDto(listing: Listing) {
  return {
    id: "standard",
    label: "Standard",
    summary: listing.cancellationSummary,
    fullRefundHoursBefore: listing.cancellationFullRefundHoursBefore,
  };
}

/**
 * Public listing DTO. Deliberately has no `exactAddress` and no
 * `privateInstructions` field at all — those live only on the host-facing
 * DTO and on a confirmed reservation, never on a publicly reachable route.
 */
export function toListingPublicDto(
  listing: ListingWithRelations,
  extra: {
    rating?: { average: number; count: number };
    completedReservations?: number;
    /** Omit when the caller hasn't looked it up — the frontend treats "absent" as "no gating information," never as "not ready." */
    hostPayoutReady?: boolean;
  },
) {
  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    description: listing.description,
    parkingType: listing.parkingType,
    photos: photosDto(listing.photos),
    location: locationDto(listing),
    pricePerHourCents: listing.pricePerHourCents,
    dailyMaxCents: undef(listing.dailyMaxCents),
    currency: listing.currency,
    spacesTotal: listing.spacesTotal,
    maxVehicleSize: listing.maxVehicleSize,
    heightClearanceCm: undef(listing.heightClearanceCm),
    amenities: listing.amenities,
    surface: undef(listing.surface),
    entranceNotes: undef(listing.entranceNotes),
    accessibilityNotes: undef(listing.accessibilityNotes),
    minimumMinutes: listing.minimumMinutes,
    maximumMinutes: listing.maximumMinutes,
    advanceNoticeMinutes: listing.advanceNoticeMinutes,
    availability: availabilityDto(listing.availability),
    rules: listing.rules,
    cancellationPolicy: cancellationPolicyDto(listing),
    host: {
      id: listing.host.id,
      displayName: listing.host.fullName.split(" ")[0] ?? listing.host.fullName,
      avatarUrl: undef(listing.host.avatarUrl),
      joinedAt: listing.host.createdAt.toISOString(),
      completedReservations: extra.completedReservations,
    },
    rating: extra.rating && extra.rating.count > 0 ? extra.rating : undefined,
    instantBook: listing.instantBook,
    status: listing.status,
    hostPayoutReady: extra.hostPayoutReady,
  };
}

/** Host-facing DTO: everything the public one has, plus private fields the
 *  owner needs to edit their own listing. Only ever returned to the host. */
export function toListingHostDto(listing: ListingWithRelations) {
  return {
    ...toListingPublicDto(listing, {}),
    hostUserId: listing.hostId,
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
    viewCount: listing.viewCount,
    privateAddress: {
      line1: listing.addressLine1,
      line2: undef(listing.addressLine2),
      city: listing.addressCity,
      state: listing.addressState,
      postalCode: listing.addressPostalCode,
      country: listing.addressCountry,
    },
    privateInstructions: listing.privateInstructions,
  };
}

export function toListingSummaryDto(
  listing: ListingWithRelations,
  opts: {
    center?: Coordinates;
    minutes?: number;
    rating?: { average: number; count: number };
  } = {},
) {
  const center = { lat: listing.centerLat, lng: listing.centerLng };
  const distance = opts.center ? distanceMeters(opts.center, center) : undefined;

  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    photo: listing.photos[0] ? photosDto(listing.photos)[0] : undefined,
    location: locationDto(listing),
    pricePerHourCents: listing.pricePerHourCents,
    currency: listing.currency,
    parkingType: listing.parkingType,
    maxVehicleSize: listing.maxVehicleSize,
    amenities: listing.amenities,
    rating: opts.rating && opts.rating.count > 0 ? opts.rating : undefined,
    instantBook: listing.instantBook,
    distanceMeters: distance,
    walkingMinutes: distance === undefined ? undefined : walkingMinutes(distance),
    estimatedTotalCents:
      opts.minutes && opts.minutes > 0
        ? quote({
            pricePerHourCents: listing.pricePerHourCents,
            dailyMaxCents: listing.dailyMaxCents,
            minutes: opts.minutes,
            currency: listing.currency,
          }).totalCents
        : undefined,
    availableForQuery: true,
  };
}

export { obfuscate };

/* -------------------------------------------------------------------------
   Community reports
   ------------------------------------------------------------------------- */

export function toReportDto(report: FreeParkingReport) {
  return {
    id: report.id,
    location: {
      label: report.locationLabel,
      neighborhood: undef(report.neighborhood),
      city: report.city,
      state: report.state,
      center: { lat: report.centerLat, lng: report.centerLng },
      radiusMeters: report.radiusMeters,
    },
    observedAt: report.observedAt.toISOString(),
    createdAt: report.createdAt.toISOString(),
    expiresAt: report.expiresAt.toISOString(),
    spacesObserved: report.spacesObserved,
    sideOfStreet: undef(report.sideOfStreet),
    landmark: undef(report.landmark),
    restrictions: report.restrictions,
    restrictionNotes: undef(report.restrictionNotes),
    timeLimitMinutes: undef(report.timeLimitMinutes),
    confidence: report.confidence,
    confirmations: report.confirmations,
    markedTakenCount: report.markedTakenCount,
    status: report.status,
    photoUrl: undef(report.photoUrl),
    notes: undef(report.notes),
  };
}

/* -------------------------------------------------------------------------
   Reservations
   ------------------------------------------------------------------------- */

type ReservationWithRelations = Reservation & {
  listing: ListingWithRelations;
  vehicle: Vehicle;
  timeline: ReservationTimelineEvent[];
};

export function toReservationDto(res: ReservationWithRelations) {
  const addressReleased = res.status === "confirmed" || res.status === "in_progress" || res.status === "completed";

  return {
    id: res.id,
    reference: res.reference,
    status: res.status,
    listing: toListingSummaryDto(res.listing),
    exactAddress: addressReleased
      ? {
          line1: res.exactAddressLine1,
          line2: undef(res.exactAddressLine2),
          city: res.exactAddressCity,
          state: res.exactAddressState,
          postalCode: res.exactAddressPostalCode,
          country: res.exactAddressCountry,
        }
      : undefined,
    hostInstructions: addressReleased ? res.hostInstructions : undefined,
    startAt: res.startAt.toISOString(),
    endAt: res.endAt.toISOString(),
    vehicle: toVehicleDto(res.vehicle),
    price: {
      currency: res.currency,
      subtotalCents: res.subtotalCents,
      discountCents: undef(res.discountCents),
      serviceFeeCents: res.serviceFeeCents,
      taxCents: res.taxCents,
      totalCents: res.totalCents,
      hostEarningsCents: undef(res.hostEarningsCents),
      hostFeeCents: undef(res.hostFeeCents),
    },
    createdAt: res.createdAt.toISOString(),
    canceledAt: res.canceledAt ? res.canceledAt.toISOString() : undefined,
    cancellationPolicy: {
      id: "standard",
      label: "Standard",
      summary: res.cancellationSummary,
      fullRefundHoursBefore: res.cancellationFullRefundHoursBefore,
    },
    canCancel: res.status === "confirmed" || res.status === "pending",
    canReview: res.status === "completed",
    timeline: res.timeline
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .map((t) => ({ at: t.at.toISOString(), label: t.label, description: undef(t.description) })),
  };
}

/* -------------------------------------------------------------------------
   Reviews
   ------------------------------------------------------------------------- */

export function toReviewDto(review: Review & { author: User }) {
  const categories =
    review.role === "driver"
      ? review.categoryAccuracy !== null
        ? {
            accuracy: review.categoryAccuracy!,
            access: review.categoryAccess!,
            safety: review.categorySafety!,
            value: review.categoryValue!,
          }
        : undefined
      : undefined;

  return {
    id: review.id,
    rating: review.rating,
    categories,
    body: review.body,
    createdAt: review.createdAt.toISOString(),
    author: {
      displayName:
        review.role === "driver"
          ? `${review.author.fullName.split(" ")[0]} ${review.author.fullName.split(" ")[1]?.[0] ?? ""}.`.trim()
          : review.author.fullName.split(" ")[0]!,
      avatarUrl: undef(review.author.avatarUrl),
      role: review.role,
    },
    response:
      review.responseBody && review.responseAt
        ? { body: review.responseBody, createdAt: review.responseAt.toISOString() }
        : undefined,
  };
}

/* -------------------------------------------------------------------------
   Notifications
   ------------------------------------------------------------------------- */

export function toNotificationDto(n: Notification) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt ? n.readAt.toISOString() : undefined,
    href: undef(n.href),
  };
}

/* -------------------------------------------------------------------------
   Messaging
   ------------------------------------------------------------------------- */

export function toConversationDto(
  conv: Conversation & {
    listing: Listing;
    driver: User;
    host: User;
    reservation: Reservation;
    messages: Message[];
  },
  viewerId: string,
) {
  const isViewerHost = viewerId === conv.hostId;
  const counterpart = isViewerHost ? conv.driver : conv.host;
  const lastMessage = conv.messages[conv.messages.length - 1];
  const unreadCount = conv.messages.filter((m) => m.senderId !== viewerId && !m.readAt).length;

  return {
    id: conv.id,
    counterpart: {
      displayName: counterpart.fullName.split(" ")[0]!,
      avatarUrl: undef(counterpart.avatarUrl),
      role: (isViewerHost ? "driver" : "host") as "driver" | "host",
    },
    listingTitle: conv.listing.title,
    reservationReference: conv.reservation.reference,
    reservationStartAt: conv.reservation.startAt.toISOString(),
    lastMessagePreview: lastMessage?.body ?? "",
    lastMessageAt: (lastMessage?.sentAt ?? conv.createdAt).toISOString(),
    unreadCount,
  };
}

export function toMessageDto(message: Message, viewerId: string) {
  return {
    id: message.id,
    body: message.body,
    sentAt: message.sentAt.toISOString(),
    direction: (message.senderId === viewerId ? "outgoing" : "incoming") as "outgoing" | "incoming",
    status: "sent" as const,
  };
}
