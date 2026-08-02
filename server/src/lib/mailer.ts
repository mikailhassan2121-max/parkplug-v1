import { emailConfigured, env } from "../env.js";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Sends when Resend is configured; otherwise logs to the console clearly
 * labelled as unsent, rather than reporting success for an email nobody
 * received. Never throws — a delivery failure should not fail the request
 * that triggered it (e.g. sign-up still succeeds if the welcome email fails).
 *
 * Goes over Resend's HTTP API rather than SMTP: some hosts (Railway's trial
 * tier among them) block outbound SMTP ports 465/587 entirely at the network
 * level, while plain HTTPS on 443 is never blocked.
 */
export async function sendMail(input: { to: string; subject: string; text: string }): Promise<void> {
  if (!emailConfigured) {
    console.log(
      `[mailer] Resend not configured — not sent.\n  to: ${input.to}\n  subject: ${input.subject}\n  body:\n${input.text
        .split("\n")
        .map((l) => "    " + l)
        .join("\n")}`,
    );
    return;
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: input.to,
        subject: input.subject,
        text: input.text,
      }),
    });
    if (!response.ok) {
      console.error(`[mailer] Resend responded ${response.status}:`, await response.text());
    }
  } catch (error) {
    console.error("[mailer] send failed:", error);
  }
}

export function verificationEmail(token: string): { subject: string; text: string } {
  const link = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  return {
    subject: "Verify your ParkPlug email address",
    text: `Confirm your email address to finish setting up your ParkPlug account:\n\n${link}\n\nThis link expires in 24 hours. If you did not create a ParkPlug account, you can ignore this email.`,
  };
}

export function passwordResetEmail(token: string): { subject: string; text: string } {
  const link = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  return {
    subject: "Reset your ParkPlug password",
    text: `We received a request to reset your ParkPlug password:\n\n${link}\n\nThis link expires in 60 minutes. If you did not request this, you can ignore this email — your password has not been changed.`,
  };
}
