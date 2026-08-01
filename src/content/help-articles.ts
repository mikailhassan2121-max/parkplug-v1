import type { HelpArticle } from "@/lib/types";

/**
 * Help content. Kept as data so it can be searched, filtered, and later moved
 * behind a CMS without touching the page.
 */
export const HELP_ARTICLES: HelpArticle[] = [
  /* ------------------------------- Drivers ------------------------------- */
  {
    slug: "finding-parking",
    title: "Finding parking near your destination",
    audience: "drivers",
    summary: "How search works, and how to read the map.",
    body: [
      {
        paragraphs: [
          "Enter where you are going and when you need to park. ParkPlug shows two kinds of result side by side: private spaces you can reserve, and free public parking that other users have recently reported.",
        ],
        bullets: [
          "Teal price markers are reservable spaces. The price shown is the hourly rate.",
          "Amber diamond markers are community reports. They are not reserved and not guaranteed.",
          "Move the map and choose “Search this area” to look somewhere else.",
          "Switch between List and Map on a phone using the toggle at the bottom.",
        ],
      },
      {
        heading: "Narrowing the results",
        paragraphs: [
          "Filters let you limit by price, distance, parking type, amenities, vehicle size, height clearance, and rating. Active filters appear as chips under the search bar so you can always see why a result is missing.",
        ],
      },
    ],
    related: ["reserving-a-space", "free-parking-reports"],
  },
  {
    slug: "reserving-a-space",
    title: "Reserving a space",
    audience: "drivers",
    summary: "What happens between choosing a space and parking in it.",
    body: [
      {
        paragraphs: [
          "Booking takes four steps: confirm your times, choose your vehicle, read the host's rules, then review and pay. The full price, including every fee, is shown from the first step.",
        ],
      },
      {
        heading: "After you book",
        paragraphs: [
          "Once your reservation is confirmed you get the exact address, entry instructions, and a directions link. These are not shown before booking, to protect host privacy.",
        ],
      },
    ],
    related: ["payment", "cancellations-driver", "directions"],
  },
  {
    slug: "payment",
    title: "How payment works",
    audience: "drivers",
    summary: "When you are charged, and what the fees cover.",
    body: [
      {
        paragraphs: [
          "You pay when you confirm your reservation. The total covers the host's parking price, ParkPlug's service fee, and any tax that applies. Every line is shown before you pay.",
          "Card details are handled by our payment provider. ParkPlug does not store your full card number.",
        ],
      },
    ],
    related: ["cancellations-driver", "reserving-a-space"],
  },
  {
    slug: "cancellations-driver",
    title: "Cancelling a reservation",
    audience: "drivers",
    summary: "How to cancel and what you get back.",
    body: [
      {
        paragraphs: [
          "Open the reservation from your dashboard and choose Cancel. The refund depends on how far ahead of your arrival time you cancel — the exact terms are shown on the reservation before you confirm.",
          "If your host cancels, you are refunded in full including the service fee.",
        ],
      },
    ],
    related: ["payment"],
  },
  {
    slug: "directions",
    title: "Getting to your space",
    audience: "drivers",
    summary: "Directions, entry instructions, and arriving on time.",
    body: [
      {
        paragraphs: [
          "Your reservation page has the exact address, a map, and a directions button that opens your usual maps app. Read the host's entry instructions before you set off — many spaces have a specific approach or a gate code.",
          "Arrive and leave within your booked window. Another driver may be booked immediately after you.",
        ],
      },
    ],
    related: ["parking-rules"],
  },
  {
    slug: "parking-rules",
    title: "Parking rules and what hosts expect",
    audience: "drivers",
    summary: "The basics that apply at every space.",
    body: [
      {
        paragraphs: ["Beyond a host's own rules, these apply everywhere on ParkPlug:"],
        bullets: [
          "Park only in the space described, not anywhere else on the property.",
          "Never block a driveway, garage door, gate, hydrant, or emergency access.",
          "Bring the vehicle you booked with, within the size the host accepts.",
          "Leave on time, and take your litter with you.",
        ],
      },
    ],
    related: ["reporting-a-problem"],
  },
  {
    slug: "reporting-a-problem",
    title: "Something went wrong at a space",
    audience: "drivers",
    summary: "What to do if the space is blocked or unusable.",
    body: [
      {
        paragraphs: [
          "Do not force the situation. Message your host first — most problems are a misunderstanding about which space to use.",
          "If it cannot be resolved, contact support with your reservation reference and a photo if it is safe to take one. Reservations that could not be used because of a problem with the space are refunded in full once reviewed.",
        ],
      },
    ],
    related: ["cancellations-driver"],
  },
  {
    slug: "free-parking-reports",
    title: "Using community free-parking reports",
    audience: "drivers",
    summary: "What a report means, and what it does not.",
    body: [
      {
        paragraphs: [
          "A community report means someone saw open public parking at that spot recently. It is an observation, not a reservation. The space may already be taken by the time you arrive.",
          "Reports always show when they were observed and when they expire. Higher-confidence reports stay visible longer, and other drivers can confirm one is still accurate.",
        ],
        bullets: [
          "Always read the signs on the block before you leave your car.",
          "A report does not override a posted restriction.",
          "ParkPlug cannot help with a parking citation.",
        ],
      },
    ],
    related: ["reporting-free-parking"],
  },
  {
    slug: "reporting-free-parking",
    title: "Reporting free parking you have spotted",
    audience: "drivers",
    summary: "How to file a report that actually helps.",
    body: [
      {
        paragraphs: [
          "Pull over and stop before you open ParkPlug — never report while driving. Then set the location, say how many spaces you saw and when, and record what the signs say.",
          "Restrictions are the most useful part of a report. If you are unsure what a sign means, choose “Restrictions unknown” rather than guessing.",
        ],
      },
    ],
    related: ["free-parking-reports"],
  },

  /* -------------------------------- Hosts -------------------------------- */
  {
    slug: "creating-a-listing",
    title: "Creating your first listing",
    audience: "hosts",
    summary: "What you need before you start, and how long it takes.",
    body: [
      {
        paragraphs: [
          "Listing takes about ten minutes. You will need your address, a few photos, the hours the space is free, and a price.",
          "Before you start, check that you are allowed to list the space — your lease, HOA rules, or local ordinances may restrict it. ParkPlug does not check this for you.",
        ],
      },
      {
        heading: "After you submit",
        paragraphs: [
          "ParkPlug confirms that the listing meets marketplace requirements. You will be notified when it is published.",
        ],
      },
    ],
    related: ["photos", "pricing-host", "availability"],
  },
  {
    slug: "pricing-host",
    title: "Setting your price",
    audience: "hosts",
    summary: "How to choose a rate, and what you take home.",
    body: [
      {
        paragraphs: [
          "You set your own hourly rate, and can add a daily maximum so a long stay does not become unreasonable. You can change your price at any time — existing reservations keep the price they were booked at.",
          "What you receive is your parking price minus ParkPlug's host fee. The service fee a driver pays is separate and does not come out of your earnings.",
          "Actual earnings depend on demand, availability, pricing, and completed reservations.",
        ],
      },
    ],
    related: ["payouts", "creating-a-listing"],
  },
  {
    slug: "availability",
    title: "Managing availability",
    audience: "hosts",
    summary: "Weekly hours, blocked dates, and buffers.",
    body: [
      {
        paragraphs: [
          "Set the hours your space is free for each day of the week. Use your calendar to block one-off dates when you need the space yourself.",
          "A buffer between reservations gives one driver time to leave before the next arrives. Advance notice stops someone booking two minutes before they arrive.",
          "Blocking a date stops new bookings. It does not cancel reservations that are already confirmed.",
        ],
      },
    ],
    related: ["cancellations-host"],
  },
  {
    slug: "photos",
    title: "Taking good listing photos",
    audience: "hosts",
    summary: "What to show, and what to keep out of frame.",
    body: [
      {
        paragraphs: ["Photos are the main reason a driver picks one space over another. Show:"],
        bullets: [
          "The parking space itself, in daylight.",
          "The entrance the driver will use.",
          "The approach from the street.",
          "Where the space starts and ends.",
          "Any signs or restrictions on the property.",
        ],
      },
      {
        heading: "Keep out of frame",
        paragraphs: [
          "Never include license plates, people's faces, house numbers, or documents. Listing photos are public.",
        ],
      },
    ],
    related: ["creating-a-listing"],
  },
  {
    slug: "host-reservations",
    title: "Managing reservations",
    audience: "hosts",
    summary: "What you see when someone books.",
    body: [
      {
        paragraphs: [
          "You receive the driver's vehicle make, model, colour, and plate so you can identify the car on arrival, along with their arrival and departure times.",
          "You do not receive their email or phone number. Message them through ParkPlug so there is a record if something goes wrong.",
        ],
      },
    ],
    related: ["cancellations-host", "safety-host"],
  },
  {
    slug: "cancellations-host",
    title: "Cancelling as a host",
    audience: "hosts",
    summary: "When to cancel, and what it affects.",
    body: [
      {
        paragraphs: [
          "Only cancel when you genuinely cannot host. Cancel as early as you can so the driver has time to find somewhere else — they are refunded in full, including the service fee.",
          "Repeated late cancellations affect your listing's standing and may lead to it being paused.",
        ],
      },
    ],
    related: ["availability"],
  },
  {
    slug: "payouts",
    title: "Getting paid",
    audience: "hosts",
    summary: "Payout setup, timing, and fees.",
    body: [
      {
        paragraphs: [
          "Before your first payout you need to complete setup with our payment provider. You enter your bank and identity details directly with them — ParkPlug never sees or stores them.",
          "Earnings from a reservation move from pending to available once the reservation completes.",
        ],
      },
    ],
    related: ["pricing-host", "taxes"],
  },
  {
    slug: "safety-host",
    title: "Hosting safely",
    audience: "hosts",
    summary: "Keeping your space and your household safe.",
    body: [
      {
        paragraphs: [
          "Describe your space honestly, keep it clear of hazards, and never let it block emergency access. Share access codes only through ParkPlug, and only for the reservation they apply to.",
          "ParkPlug does not run background checks on drivers, inspect spaces, or provide insurance. Check whether your own home or business insurance covers letting someone park on your property.",
        ],
      },
    ],
    related: ["host-reservations"],
  },
  {
    slug: "taxes",
    title: "Taxes on hosting income",
    audience: "hosts",
    summary: "What ParkPlug does and does not do about tax.",
    body: [
      {
        paragraphs: [
          "Money you earn from hosting may be taxable. ParkPlug provides a record of your earnings and fees, which you can export from your earnings page.",
          "ParkPlug does not give tax advice and cannot tell you what you owe. Speak to a qualified tax professional about your situation.",
        ],
      },
    ],
    related: ["payouts"],
  },

  /* ------------------------------- Account ------------------------------- */
  {
    slug: "signing-in",
    title: "Signing in",
    audience: "account",
    summary: "Trouble getting into your account.",
    body: [
      {
        paragraphs: [
          "Sign in with the email address and password you used to register. If your password is not accepted, use “Forgot password?” to get a reset link — it is valid for 60 minutes.",
          "If a reset email does not arrive, check your spam folder and confirm you are using the address on the account.",
        ],
      },
    ],
    related: ["resetting-password"],
  },
  {
    slug: "resetting-password",
    title: "Resetting your password",
    audience: "account",
    summary: "How reset links work.",
    body: [
      {
        paragraphs: [
          "Request a link from the sign-in page. Links expire after 60 minutes and can only be used once — request a fresh one if yours has expired.",
          "Changing your password signs you out on other devices.",
        ],
      },
    ],
    related: ["signing-in"],
  },
  {
    slug: "updating-profile",
    title: "Updating your profile",
    audience: "account",
    summary: "Name, email, and vehicles.",
    body: [
      {
        paragraphs: [
          "Change your name, email address, and password in account settings. Changing your email requires verifying the new address before you can book again.",
          "Vehicles are managed separately, so you can keep more than one and pick the right car at checkout.",
        ],
      },
    ],
    related: ["notifications-account"],
  },
  {
    slug: "notifications-account",
    title: "Notification preferences",
    audience: "account",
    summary: "Choosing what we tell you about.",
    body: [
      {
        paragraphs: [
          "You control reminders, message alerts, and product news from account settings. Reservation confirmations and cancellations are always sent, because you need a record of them.",
        ],
      },
    ],
    related: ["updating-profile"],
  },
  {
    slug: "deleting-account",
    title: "Deleting your account",
    audience: "account",
    summary: "What is removed and what is kept.",
    body: [
      {
        paragraphs: [
          "Delete your account from account settings. Cancel upcoming reservations and pause active listings first.",
          "Your profile, vehicles, saved spaces, and listings are removed. Reservation and payment records are kept where tax and accounting rules require it, and reviews you left stay published but are detached from your name.",
        ],
      },
    ],
    related: ["updating-profile"],
  },
];

export const HELP_AUDIENCES = [
  { value: "drivers", label: "For drivers" },
  { value: "hosts", label: "For hosts" },
  { value: "account", label: "Account" },
] as const;
