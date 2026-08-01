import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

/** Shared frame for every account page, keeping the forms narrow and centred. */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:py-16">
      <div className="w-full max-w-md">
        <Link href="/" aria-label="ParkPlug home" className="mx-auto flex w-fit rounded-lg">
          <Logo />
        </Link>

        <div className="mt-7 rounded-card border border-ink-200 bg-white p-6 shadow-e1 sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-950">{title}</h1>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-ink-600">{description}</p>
          ) : null}
          <div className="mt-6">{children}</div>
        </div>

        {footer ? <div className="mt-5 text-center text-sm text-ink-600">{footer}</div> : null}
      </div>
    </div>
  );
}

/** Live password-requirement checklist shown under the password field. */
export function PasswordRequirements({ value }: { value: string }) {
  const rules = [
    { label: "At least 10 characters", met: value.length >= 10 },
    { label: "One uppercase letter", met: /[A-Z]/.test(value) },
    { label: "One lowercase letter", met: /[a-z]/.test(value) },
    { label: "One number", met: /\d/.test(value) },
  ];

  return (
    <ul className="mt-2 space-y-1" aria-live="polite">
      {rules.map((rule) => (
        <li
          key={rule.label}
          className={`flex items-center gap-1.5 text-xs ${rule.met ? "text-success-700" : "text-ink-500"}`}
        >
          <span aria-hidden="true" className="w-3.5 text-center font-bold">
            {rule.met ? "✓" : "•"}
          </span>
          {rule.label}
          <span className="sr-only">{rule.met ? " — met" : " — not yet met"}</span>
        </li>
      ))}
    </ul>
  );
}

export function passwordMeetsRequirements(value: string): boolean {
  return (
    value.length >= 10 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value)
  );
}

/** Shared, deliberately loose email check — the server is the real authority. */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
