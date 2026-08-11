import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconSpinner } from "./icons";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "destructive"
  | "ghost";

export type ButtonSize = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap " +
  "rounded-xl transition-[background-color,border-color,color,box-shadow,transform] duration-150 " +
  "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-55 " +
  "disabled:active:scale-100 select-none";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white shadow-e1 hover:bg-brand-700 " +
    "focus-visible:outline-brand-700",
  secondary:
    "bg-ink-100 text-ink-900 border border-ink-300 shadow-e1 hover:bg-ink-200 hover:border-ink-400",
  tertiary:
    "bg-brand-50 text-brand-800 hover:bg-brand-100",
  destructive:
    "bg-danger-600 text-white shadow-e1 hover:bg-danger-700 focus-visible:outline-danger-700",
  ghost:
    "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
};

const sizes: Record<ButtonSize, string> = {
  // Every size clears the 44px touch target on coarse pointers.
  sm: "h-9 px-3.5 text-sm min-w-9",
  md: "h-11 px-5 text-[0.9375rem] min-w-11",
  lg: "h-13 px-6.5 text-base min-w-13",
};

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Announced to screen readers while `loading` is true. */
  loadingText?: string;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">;

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  fullWidth,
  leadingIcon,
  trailingIcon,
  children,
  className,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      // A loading button stays focusable but rejects input, so a screen reader
      // user is not silently dropped out of the tab order mid-submit.
      aria-busy={loading || undefined}
      aria-disabled={loading || disabled || undefined}
      disabled={disabled}
      className={cn(
        base,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        loading && "cursor-progress",
        className,
      )}
      onClick={(event) => {
        // Prevents the duplicate-submit failure mode on slow connections.
        if (loading) {
          event.preventDefault();
          return;
        }
        props.onClick?.(event);
      }}
      {...props}
    >
      {loading ? (
        <>
          <IconSpinner className="animate-spin-slow text-[1.15em]" />
          <span>{loadingText ?? children}</span>
        </>
      ) : (
        <>
          {leadingIcon ? <span className="text-[1.15em] shrink-0">{leadingIcon}</span> : null}
          {children}
          {trailingIcon ? <span className="text-[1.15em] shrink-0">{trailingIcon}</span> : null}
        </>
      )}
    </button>
  );
}

export type ButtonLinkProps = CommonProps & {
  href: string;
  prefetch?: boolean;
  target?: string;
  rel?: string;
  "aria-label"?: string;
  onClick?: () => void;
};

/** Anchor styled as a button. Use for navigation; use `Button` for actions. */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  fullWidth,
  leadingIcon,
  trailingIcon,
  children,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      {...props}
    >
      {leadingIcon ? <span className="text-[1.15em] shrink-0">{leadingIcon}</span> : null}
      {children}
      {trailingIcon ? <span className="text-[1.15em] shrink-0">{trailingIcon}</span> : null}
    </Link>
  );
}

export type IconButtonProps = Omit<ButtonProps, "children" | "leadingIcon" | "trailingIcon"> & {
  /** Required — an icon-only control has no visible text to name it. */
  label: string;
  icon: ReactNode;
};

export function IconButton({
  label,
  icon,
  variant = "ghost",
  size = "md",
  className,
  loading,
  ...props
}: IconButtonProps) {
  const square = size === "sm" ? "h-9 w-9" : size === "lg" ? "h-13 w-13" : "h-11 w-11";
  return (
    <button
      type="button"
      aria-label={label}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], square, "px-0 text-[1.1rem]", className)}
      {...props}
    >
      {loading ? <IconSpinner className="animate-spin-slow" /> : icon}
    </button>
  );
}
