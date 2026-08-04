import { emailConfigured, env, mailProvider } from "../env.js";

type SendResult = { ok: true } | { ok: false; error: string };

type MailProviderClient = {
  name: string;
  send(input: { to: string; subject: string; text: string }): Promise<SendResult>;
};

/** Splits "Name <email@domain>" into parts; falls back to treating the whole string as the email. */
function parseFromAddress(raw: string): { name?: string; email: string } {
  const match = raw.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
  if (match) {
    const name = match[1]?.replace(/^"|"$/g, "").trim();
    return { name: name || undefined, email: (match[2] ?? "").trim() };
  }
  return { email: raw.trim() };
}

async function bodyOrStatus(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  return text ? `${response.status}: ${text}` : String(response.status);
}

function resendClient(apiKey: string): MailProviderClient {
  return {
    name: "resend",
    async send({ to, subject, text }) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env.MAIL_FROM, to, subject, text }),
      });
      if (!response.ok) {
        return {
          ok: false,
          error:
            `Resend responded ${await bodyOrStatus(response)}. ` +
            "Resend refuses to deliver to anyone but the account owner until a sending domain is verified — " +
            "verify one at resend.com/domains, or set MAIL_PROVIDER=brevo with BREVO_API_KEY instead.",
        };
      }
      return { ok: true };
    },
  };
}

function brevoClient(apiKey: string): MailProviderClient {
  return {
    name: "brevo",
    async send({ to, subject, text }) {
      const sender = parseFromAddress(env.MAIL_FROM);
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ sender, to: [{ email: to }], subject, textContent: text }),
      });
      if (!response.ok) {
        return {
          ok: false,
          error:
            `Brevo responded ${await bodyOrStatus(response)}. ` +
            "Check that the MAIL_FROM address is verified as a sender in Brevo (Senders & IPs).",
        };
      }
      return { ok: true };
    },
  };
}

function clientFor(provider: NonNullable<typeof mailProvider>): MailProviderClient {
  return provider.name === "resend" ? resendClient(provider.apiKey) : brevoClient(provider.apiKey);
}

/**
 * Sends via whichever provider is configured (MAIL_PROVIDER, or inferred from
 * whichever API key is set); otherwise logs to the console clearly labelled
 * as unsent, rather than reporting success for an email nobody received.
 * Never throws — a delivery failure should not fail the request that
 * triggered it (e.g. sign-up still succeeds if the welcome email fails).
 */
export async function sendMail(input: { to: string; subject: string; text: string }): Promise<void> {
  if (!emailConfigured || !mailProvider) {
    console.log(
      `[mailer] no provider configured — not sent.\n  to: ${input.to}\n  subject: ${input.subject}\n  body:\n${input.text
        .split("\n")
        .map((l) => "    " + l)
        .join("\n")}`,
    );
    return;
  }

  const client = clientFor(mailProvider);
  try {
    const result = await client.send(input);
    if (!result.ok) {
      console.error(`[mailer:${client.name}] send failed — ${result.error}`);
    }
  } catch (error) {
    console.error(`[mailer:${client.name}] send failed:`, error);
  }
}

export function verificationEmail(token: string): { subject: string; text: string } {
  const link = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  return {
    subject: "Verify your ParkPlugs email address",
    text: `Confirm your email address to finish setting up your ParkPlugs account:\n\n${link}\n\nThis link expires in 24 hours. If you did not create a ParkPlugs account, you can ignore this email.`,
  };
}

export function passwordResetEmail(token: string): { subject: string; text: string } {
  const link = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  return {
    subject: "Reset your ParkPlugs password",
    text: `We received a request to reset your ParkPlugs password:\n\n${link}\n\nThis link expires in 60 minutes. If you did not request this, you can ignore this email — your password has not been changed.`,
  };
}

/** Sent once Stripe confirms payment actually captured — see webhooks.routes.ts. */
export function reservationConfirmedEmail(input: {
  reference: string;
  listingTitle: string;
  startAt: Date;
  endAt: Date;
  totalCents: number;
  currency: string;
}): { subject: string; text: string } {
  const link = `${env.FRONTEND_URL}/reservations/${input.reference}`;
  const total = `${(input.totalCents / 100).toFixed(2)} ${input.currency.toUpperCase()}`;
  return {
    subject: `Reservation confirmed — ${input.reference}`,
    text: `Your payment went through and your reservation is confirmed.\n\nSpace: ${input.listingTitle}\nReference: ${input.reference}\nWhen: ${input.startAt.toLocaleString()} – ${input.endAt.toLocaleString()}\nTotal charged: ${total}\n\nFull details, the exact address, and host instructions: ${link}`,
  };
}
