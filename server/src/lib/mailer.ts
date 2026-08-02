import nodemailer from "nodemailer";
import { emailConfigured, env } from "../env.js";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

/**
 * Sends when SMTP is configured; otherwise logs to the console clearly
 * labelled as unsent, rather than reporting success for an email nobody
 * received. Never throws — a delivery failure should not fail the request
 * that triggered it (e.g. sign-up still succeeds if the welcome email fails).
 */
export async function sendMail(input: { to: string; subject: string; text: string }): Promise<void> {
  if (!emailConfigured) {
    console.log(
      `[mailer] SMTP not configured — not sent.\n  to: ${input.to}\n  subject: ${input.subject}\n  body:\n${input.text
        .split("\n")
        .map((l) => "    " + l)
        .join("\n")}`,
    );
    return;
  }

  try {
    await getTransporter().sendMail({
      from: env.SMTP_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
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
