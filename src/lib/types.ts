/**
 * ParkPlugs domain model.
 *
 * These types are the contract between the frontend and the API. Field names
 * mirror what the UI renders, so a backend can be mapped onto them directly.
 */

/* --------------------------------- Geo ---------------------------------- */

export type Coordinates = { lat: number; lng: number };

/** Full street address. Only ever returned for confirmed reservations. */
export type ExactAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

/**
 * What the public map and listing pages are allowed to show. Never contains a
 * house number, and the point is offset from the real driveway.
 */
export type ApproximateLocation = {
  /** e.g. "Near Chatham Station · Main St & Elm Ave" */
  label: string;
  neighborhood?: string;
  city: string;
  state: string;
  /** Deliberately jittered centre point for the privacy circle. */
  center: Coordinates;
  /** Radius in metres of the circle drawn on public maps. */
  radiusMeters: number;
};

/* ------------------------------- Vehicles -------------------------------- */

export type VehicleSize = "compact" | "standard" | "large" | "oversized";

export const VEHICLE_SIZES: Array<{
  value: VehicleSize;
  label: string;
  hint: string;
}> = [
  { value: "compact", label: "Compact", hint: "Small hatchbacks and subcompacts" },
  { value: "standard", label: "Standard", hint: "Most sedans and small SUVs" },
  { value: "large", label: "Large", hint: "Full-size SUVs, pickups, minivans" },
  { value: "oversized", label: "Oversized", hint: "Extended trucks, vans with racks" },
];

export type Vehicle = {
  id: string;
  make: string;
  model: string;
  color: string;
  licensePlate: string;
  /** State, province, or other issuing jurisdiction. */
  plateRegion: string;
  size: VehicleSize;
  isDefault: boolean;
};

/* -------------------------------- Parking -------------------------------- */

export type ParkingType =
  | "driveway"
  | "garage"
  | "private_lot"
  | "apartment_space"
  | "business_lot"
  | "organization_lot"
  | "other";

export const PARKING_TYPES: Array<{ value: ParkingType; label: string; description: string }> = [
  { value: "driveway", label: "Driveway", description: "A residential driveway or carport" },
  { value: "garage", label: "Garage", description: "An enclosed private garage" },
  { value: "private_lot", label: "Private lot", description: "A small privately owned lot" },
  { value: "apartment_space", label: "Apartment space", description: "An assigned spot in a residential building" },
  { value: "business_lot", label: "Business lot", description: "Spaces at a shop, office, or restaurant" },
  { value: "organization_lot", label: "Church or organization lot", description: "Spaces at a place of worship, school, or club" },
  { value: "other", label: "Other", description: "Something not covered above" },
];

export type Amenity =
  | "covered"
  | "ev_charging"
  | "accessible"
  | "lit"
  | "gated"
  | "camera_monitored"
  | "attended"
  | "paved"
  | "level_entry";

export const AMENITIES: Array<{ value: Amenity; label: string }> = [
  { value: "covered", label: "Covered" },
  { value: "ev_charging", label: "EV charging" },
  { value: "accessible", label: "Accessible space" },
  { value: "lit", label: "Lit at night" },
  { value: "gated", label: "Gated entry" },
  { value: "camera_monitored", label: "Camera monitored" },
  { value: "attended", label: "Attended" },
  { value: "paved", label: "Paved surface" },
  { value: "level_entry", label: "Level entry" },
];

export type SurfaceType = "asphalt" | "concrete" | "gravel" | "grass" | "paver";

export type ListingPhoto = {
  id: string;
  url: string;
  /** Author-supplied description used as the image alt text. */
  alt: string;
  width: number;
  height: number;
  /** Tiny blurred preview, used to avoid layout shift while loading. */
  blurDataUrl?: string;
};

export type HostProfile = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  joinedAt: string;
  /** Omitted entirely until enough real reservations exist to compute them. */
  responseRatePercent?: number;
  responseTimeMinutes?: number;
  completedReservations?: number;
  /** Only badges the platform has actually issued. */
  badges?: Array<{ id: string; label: string; description: string }>;
};

export type CancellationPolicy = {
  id: string;
  label: string;
  summary: string;
  /** Full refund when cancelled at least this many hours before arrival. */
  fullRefundHoursBefore: number;
};

export type ListingAvailabilityWindow = {
  /** 0 = Sunday. */
  dayOfWeek: number;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
};

export type Listing = {
  id: string;
  slug: string;
  title: string;
  description: string;
  parkingType: ParkingType;
  photos: ListingPhoto[];
  location: ApproximateLocation;
  /** Present only on a confirmed reservation. */
  exactAddress?: ExactAddress;
  pricePerHourCents: number;
  dailyMaxCents?: number;
  currency: string;
  spacesTotal: number;
  maxVehicleSize: VehicleSize;
  heightClearanceCm?: number;
  amenities: Amenity[];
  surface?: SurfaceType;
  entranceNotes?: string;
  accessibilityNotes?: string;
  minimumMinutes: number;
  maximumMinutes: number;
  advanceNoticeMinutes: number;
  availability: ListingAvailabilityWindow[];
  rules: string[];
  cancellationPolicy: CancellationPolicy;
  host: HostProfile;
  rating?: { average: number; count: number };
  instantBook: boolean;
  status: ListingStatus;
  /** False only when the server has confirmed the host's payout account is not ready; absent (e.g. the local-storage demo adapter) means "no gating information," not "not ready." */
  hostPayoutReady?: boolean;
};

export type ListingStatus =
  | "draft"
  | "in_review"
  | "needs_changes"
  | "active"
  | "paused"
  | "archived";

/** Compact shape used by search results and map markers. */
export type ListingSummary = {
  id: string;
  slug: string;
  title: string;
  photo?: ListingPhoto;
  location: ApproximateLocation;
  pricePerHourCents: number;
  currency: string;
  parkingType: ParkingType;
  maxVehicleSize: VehicleSize;
  amenities: Amenity[];
  rating?: { average: number; count: number };
  instantBook: boolean;
  distanceMeters?: number;
  walkingMinutes?: number;
  /** Total for the searched window, so the card never hides the real cost. */
  estimatedTotalCents?: number;
  availableForQuery: boolean;
};

/* ------------------------- Community free parking ------------------------ */

export type ReportRestriction =
  | "time_limited"
  | "metered"
  | "free_certain_hours"
  | "permit_required"
  | "street_cleaning"
  | "loading_zone"
  | "accessible_only"
  | "other"
  | "unknown";

export const REPORT_RESTRICTIONS: Array<{ value: ReportRestriction; label: string }> = [
  { value: "time_limited", label: "Time limit posted" },
  { value: "metered", label: "Metered" },
  { value: "free_certain_hours", label: "Free during certain hours" },
  { value: "permit_required", label: "Permit required" },
  { value: "street_cleaning", label: "Street cleaning restrictions" },
  { value: "loading_zone", label: "Loading zone" },
  { value: "accessible_only", label: "Accessible parking only" },
  { value: "other", label: "Other posted restriction" },
  { value: "unknown", label: "Restrictions unknown" },
];

export type ReportConfidence = "low" | "medium" | "high";

export type FreeParkingReport = {
  id: string;
  location: ApproximateLocation;
  /** ISO timestamp of when the reporter observed the parking. */
  observedAt: string;
  createdAt: string;
  /** When the report stops being shown on the map. */
  expiresAt: string;
  spacesObserved: number;
  sideOfStreet?: string;
  landmark?: string;
  restrictions: ReportRestriction[];
  restrictionNotes?: string;
  timeLimitMinutes?: number;
  confidence: ReportConfidence;
  confirmations: number;
  markedTakenCount: number;
  status: "active" | "expired" | "taken" | "withdrawn";
  photoUrl?: string;
  notes?: string;
};

/* ------------------------------ Reservations ----------------------------- */

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "canceled"
  | "refunded";

export type PriceBreakdown = {
  currency: string;
  /** Hourly rate multiplied by the reserved duration. */
  subtotalCents: number;
  serviceFeeCents: number;
  taxCents: number;
  discountCents?: number;
  totalCents: number;
  /** Host's share, shown only in host-facing views. */
  hostEarningsCents?: number;
  hostFeeCents?: number;
};

export type Reservation = {
  id: string;
  /** Human-readable reference shown on the confirmation page. */
  reference: string;
  status: ReservationStatus;
  listing: ListingSummary;
  /** Released only once the reservation is confirmed. */
  exactAddress?: ExactAddress;
  hostInstructions?: string;
  startAt: string;
  endAt: string;
  vehicle: Vehicle;
  price: PriceBreakdown;
  createdAt: string;
  canceledAt?: string;
  cancellationPolicy: CancellationPolicy;
  canCancel: boolean;
  canReview: boolean;
  timeline: Array<{ at: string; label: string; description?: string }>;
};

/* -------------------------------- Reviews -------------------------------- */

export type ReviewCategoryScores = {
  accuracy: number;
  access: number;
  safety: number;
  value: number;
};

export type Review = {
  id: string;
  rating: number;
  categories?: ReviewCategoryScores;
  body: string;
  createdAt: string;
  author: {
    displayName: string;
    avatarUrl?: string;
    generalLocation?: string;
    role: "driver" | "host";
  };
  /** Public reply from the reviewed party. */
  response?: { body: string; createdAt: string };
};

export type DriverReviewScores = {
  communication: number;
  timeliness: number;
  ruleCompliance: number;
};

export type ReviewEligibility =
  | { state: "eligible"; reservationId: string; deadlineAt: string }
  | { state: "submitted"; reviewId: string }
  | { state: "expired" }
  | { state: "not_yet"; availableAt: string }
  | { state: "under_moderation" };

/* ----------------------------- Notifications ----------------------------- */

export type NotificationType =
  | "reservation_confirmed"
  | "reservation_reminder"
  | "host_new_booking"
  | "reservation_canceled"
  | "refund_update"
  | "listing_approved"
  | "listing_needs_changes"
  | "review_reminder"
  | "new_message"
  | "report_update"
  | "support_reply";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
  href?: string;
};

/* ------------------------------- Messaging ------------------------------- */

export type Conversation = {
  id: string;
  counterpart: { displayName: string; avatarUrl?: string; role: "driver" | "host" };
  listingTitle: string;
  reservationReference: string;
  reservationStartAt: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
};

export type Message = {
  id: string;
  body: string;
  sentAt: string;
  direction: "outgoing" | "incoming";
  status?: "sending" | "sent" | "failed";
};

/* -------------------------------- Earnings ------------------------------- */

export type HostEarnings = {
  currency: string;
  availableBalanceCents: number;
  pendingCents: number;
  lifetimeCents: number;
  nextPayout?: { amountCents: number; expectedAt: string };
};

export type EarningsTransaction = {
  id: string;
  kind: "reservation" | "payout" | "refund" | "adjustment";
  description: string;
  occurredAt: string;
  amountCents: number;
  feeCents?: number;
  status: "pending" | "paid" | "failed" | "reversed";
  reservationReference?: string;
};

export type PayoutSetupState =
  | { state: "not_started" }
  | { state: "incomplete"; missing: string[] }
  | { state: "pending_verification" }
  | { state: "action_required"; reason: string }
  | { state: "complete"; methodSummary: string };

/* --------------------------------- Search -------------------------------- */

export type SortOption =
  | "recommended"
  | "closest"
  | "price_low"
  | "rating_high"
  | "recently_reported"
  | "available_soonest";

export const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "recommended", label: "Recommended" },
  { value: "closest", label: "Closest" },
  { value: "price_low", label: "Lowest price" },
  { value: "rating_high", label: "Highest rated" },
  { value: "recently_reported", label: "Most recently reported" },
  { value: "available_soonest", label: "Available soonest" },
];

export type SearchFilters = {
  includePaid: boolean;
  includeFree: boolean;
  availableNow: boolean;
  maxPriceCents?: number;
  maxDistanceMeters?: number;
  parkingTypes: ParkingType[];
  amenities: Amenity[];
  vehicleSize?: VehicleSize;
  minHeightClearanceCm?: number;
  instantBookOnly: boolean;
  minRating?: number;
};

export const DEFAULT_FILTERS: SearchFilters = {
  includePaid: true,
  includeFree: true,
  availableNow: false,
  parkingTypes: [],
  amenities: [],
  instantBookOnly: false,
};

export type SearchQuery = {
  destination: string;
  center?: Coordinates;
  startAt?: string;
  endAt?: string;
  vehicleSize?: VehicleSize;
  sort: SortOption;
  filters: SearchFilters;
};

export type SearchResults = {
  listings: ListingSummary[];
  reports: FreeParkingReport[];
  /** Centre the map should settle on for this query. */
  center: Coordinates;
  /** Set when one of the two sources failed but the other succeeded. */
  partial?: { failed: "listings" | "reports"; message: string };
};

/* ------------------------------ Help content ----------------------------- */

export type HelpArticle = {
  slug: string;
  title: string;
  audience: "drivers" | "hosts" | "account";
  summary: string;
  body: Array<{ heading?: string; paragraphs: string[]; bullets?: string[] }>;
  related?: string[];
};
