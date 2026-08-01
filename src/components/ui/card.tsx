import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  children,
  className,
  as: Tag = "div",
  interactive,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
  interactive?: boolean;
}) {
  return (
    <Tag
      className={cn(
        "bg-white border border-ink-200 rounded-card",
        interactive &&
          "transition-[box-shadow,border-color,transform] duration-200 hover:shadow-e2 hover:border-ink-300 focus-within:shadow-e2",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("p-5 sm:p-6", className)}>{children}</div>;
}

export function CardHeader({
  title,
  description,
  action,
  as: Heading = "h2",
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  as?: "h1" | "h2" | "h3" | "h4";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 px-5 sm:px-6 pt-5 sm:pt-6",
        className,
      )}
    >
      <div className="min-w-0">
        <Heading className="text-lg font-bold tracking-tight">{title}</Heading>
        {description ? (
          <p className="mt-1 text-sm text-ink-600">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Page-level section wrapper with a consistent max width and gutter. */
export function Container({
  children,
  className,
  size = "default",
}: {
  children: ReactNode;
  className?: string;
  size?: "narrow" | "default" | "wide" | "full";
}) {
  const widths = {
    narrow: "max-w-3xl",
    default: "max-w-6xl",
    wide: "max-w-7xl",
    full: "max-w-none",
  } as const;
  return (
    <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", widths[size], className)}>
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  as: Heading = "h2",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className="text-sm font-bold uppercase tracking-[0.08em] text-brand-700">
          {eyebrow}
        </p>
      ) : null}
      <Heading
        className={cn(
          "font-extrabold tracking-tight text-ink-950",
          Heading === "h1"
            ? "text-3xl sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]"
            : "text-2xl sm:text-3xl",
          eyebrow && "mt-2",
        )}
      >
        {title}
      </Heading>
      {description ? (
        <p className="mt-3 text-base sm:text-lg leading-relaxed text-ink-600">
          {description}
        </p>
      ) : null}
    </div>
  );
}
