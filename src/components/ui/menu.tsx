"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { IconChevronDown } from "./icons";

/* -------------------------------------------------------------------------
   Dropdown menu — keyboard operable, Escape to close, click-outside to close,
   focus restored to the trigger.
   ------------------------------------------------------------------------- */

export type MenuItem =
  | { kind: "link"; label: string; href: string; icon?: ReactNode; description?: string }
  | { kind: "button"; label: string; onSelect: () => void; icon?: ReactNode; destructive?: boolean }
  | { kind: "separator" }
  | { kind: "label"; label: string };

export function DropdownMenu({
  trigger,
  triggerLabel,
  items,
  align = "end",
  className,
  menuClassName,
}: {
  trigger: ReactNode;
  /** Accessible name for the trigger when `trigger` is icon-only. */
  triggerLabel?: string;
  items: MenuItem[];
  align?: "start" | "end";
  className?: string;
  menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const menuId = `menu-${uid}`;

  const close = useCallback(
    (restoreFocus = true) => {
      setOpen(false);
      if (restoreFocus) triggerRef.current?.focus();
    },
    [],
  );

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (!menuRef.current) return;
      const focusables = Array.from(
        menuRef.current.querySelectorAll<HTMLElement>("[data-menuitem]"),
      );
      if (focusables.length === 0) return;
      const index = focusables.indexOf(document.activeElement as HTMLElement);

      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusables[(index + 1) % focusables.length].focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        focusables[(index - 1 + focusables.length) % focusables.length].focus();
      } else if (event.key === "Home") {
        event.preventDefault();
        focusables[0].focus();
      } else if (event.key === "End") {
        event.preventDefault();
        focusables[focusables.length - 1].focus();
      } else if (event.key === "Tab") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={triggerLabel}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
            requestAnimationFrame(() =>
              menuRef.current?.querySelector<HTMLElement>("[data-menuitem]")?.focus(),
            );
          }
        }}
        className="flex items-center rounded-xl transition-opacity hover:opacity-90"
      >
        {trigger}
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={triggerLabel}
          className={cn(
            "absolute top-[calc(100%+0.5rem)] z-50 min-w-56 origin-top overflow-hidden rounded-xl",
            "border border-ink-200 bg-ink-50 py-1.5 shadow-e3 animate-scale-in",
            align === "end" ? "right-0" : "left-0",
            menuClassName,
          )}
        >
          {items.map((item, i) => {
            if (item.kind === "separator") {
              return <div key={i} role="separator" className="my-1.5 h-px bg-ink-200" />;
            }
            if (item.kind === "label") {
              return (
                <p
                  key={i}
                  className="px-3.5 pb-1 pt-2 text-2xs font-bold uppercase tracking-wider text-ink-500"
                >
                  {item.label}
                </p>
              );
            }
            const inner = (
              <>
                {item.icon ? (
                  <span className="shrink-0 text-[1.05rem] text-ink-500">{item.icon}</span>
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{item.label}</span>
                  {item.kind === "link" && item.description ? (
                    <span className="block truncate text-xs font-normal text-ink-500">
                      {item.description}
                    </span>
                  ) : null}
                </span>
              </>
            );
            const itemClass = cn(
              "flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm font-medium transition-colors",
              item.kind === "button" && item.destructive
                ? "text-danger-700 hover:bg-danger-50"
                : "text-ink-800 hover:bg-ink-100",
            );

            return item.kind === "link" ? (
              <Link
                key={i}
                href={item.href}
                role="menuitem"
                data-menuitem
                className={itemClass}
                onClick={() => setOpen(false)}
              >
                {inner}
              </Link>
            ) : (
              <button
                key={i}
                type="button"
                role="menuitem"
                data-menuitem
                className={itemClass}
                onClick={() => {
                  item.onSelect();
                  close(false);
                }}
              >
                {inner}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Tabs — roving tabindex, arrow-key navigation.
   ------------------------------------------------------------------------- */

export type TabItem = { id: string; label: string; count?: number };

export function Tabs({
  tabs,
  active,
  onChange,
  className,
  fullWidth,
  label,
}: {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  fullWidth?: boolean;
  label: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  function onKeyDown(event: React.KeyboardEvent) {
    const index = tabs.findIndex((t) => t.id === active);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;

    event.preventDefault();
    onChange(tabs[next].id);
    listRef.current
      ?.querySelectorAll<HTMLButtonElement>("[role='tab']")
      [next]?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "flex gap-1 overflow-x-auto scrollbar-none border-b border-ink-200",
        className,
      )}
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative shrink-0 whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors",
              fullWidth && "flex-1",
              selected ? "text-brand-800" : "text-ink-600 hover:text-ink-900",
            )}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-2xs font-bold tabular-nums",
                  selected ? "bg-brand-100 text-brand-800" : "bg-ink-100 text-ink-600",
                )}
              >
                {tab.count}
              </span>
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-colors",
                selected ? "bg-brand-600" : "bg-transparent",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  id,
  active,
  children,
}: {
  id: string;
  active: string;
  children: ReactNode;
}) {
  if (id !== active) return null;
  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      className="focus-visible:outline-none animate-fade-in"
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Accordion — used for FAQs and long policy sections.
   ------------------------------------------------------------------------- */

export function Accordion({
  items,
  className,
}: {
  items: Array<{ id: string; question: ReactNode; answer: ReactNode }>;
  className?: string;
}) {
  return (
    <div className={cn("divide-y divide-ink-200 rounded-card border border-ink-200 bg-ink-50", className)}>
      {items.map((item) => (
        <details key={item.id} name="faq" className="group">
          <summary
            className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4
                       text-left text-[0.9375rem] font-semibold text-ink-900 transition-colors
                       hover:bg-ink-50 [&::-webkit-details-marker]:hidden"
          >
            <span className="min-w-0">{item.question}</span>
            <IconChevronDown className="shrink-0 text-ink-500 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="px-5 pb-5 text-sm leading-relaxed text-ink-700">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Stepper — progress indicator for the booking, listing and report flows.
   ------------------------------------------------------------------------- */

export function Stepper({
  steps,
  current,
  onStepClick,
  className,
}: {
  steps: string[];
  /** Zero-based index of the active step. */
  current: number;
  /** Provided only for steps the user has already completed. */
  onStepClick?: (index: number) => void;
  className?: string;
}) {
  const pct = Math.round(((current + 1) / steps.length) * 100);
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-bold text-ink-900">
          {steps[current]}
        </p>
        <p className="shrink-0 text-xs font-medium tabular-nums text-ink-500">
          Step {current + 1} of {steps.length}
        </p>
      </div>

      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-200"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={current + 1}
        aria-valuetext={`Step ${current + 1} of ${steps.length}: ${steps[current]}`}
      >
        <div
          className="h-full rounded-full bg-brand-600 transition-[width] duration-400 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Desktop gets the full labelled trail; mobile keeps the compact bar. */}
      <ol className="mt-3 hidden flex-wrap gap-x-1 gap-y-1 lg:flex">
        {steps.map((step, i) => {
          const done = i < current;
          const isCurrent = i === current;
          const clickable = done && onStepClick;
          return (
            <li key={step} className="flex items-center gap-1">
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick(i)}
                  className="rounded-md px-1.5 py-0.5 text-xs font-semibold text-brand-700 underline-offset-2 hover:underline"
                >
                  {step}
                </button>
              ) : (
                <span
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "px-1.5 py-0.5 text-xs font-semibold",
                    isCurrent ? "text-ink-900" : done ? "text-ink-600" : "text-ink-400",
                  )}
                >
                  {step}
                </span>
              )}
              {i < steps.length - 1 ? (
                <span aria-hidden="true" className="text-ink-300">
                  ·
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
