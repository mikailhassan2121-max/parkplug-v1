"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { Button, IconButton } from "./button";
import { IconX } from "./icons";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export type OverlayVariant =
  | "modal" // centred dialog on all sizes
  | "sheet" // centred on desktop, bottom sheet on mobile
  | "fullscreen"; // centred on desktop, full-screen flow on mobile

export type OverlayProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: OverlayVariant;
  size?: "sm" | "md" | "lg" | "xl";
  /**
   * When true, clicking the backdrop will not close the overlay. Set this for
   * any overlay containing unsaved user input.
   */
  disableBackdropClose?: boolean;
  /** Asked before closing when there is unsaved input. Return true to close. */
  confirmClose?: () => boolean;
  hideHeader?: boolean;
  className?: string;
};

const sizeMap = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
} as const;

export function Overlay({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = "modal",
  size = "md",
  disableBackdropClose,
  confirmClose,
  hideHeader,
  className,
}: OverlayProps) {
  const mounted = useMounted();
  const uid = useId();
  const titleId = `ov-${uid}-title`;
  const descId = description ? `ov-${uid}-desc` : undefined;

  const requestClose = useCallback(() => {
    if (confirmClose && !confirmClose()) return;
    onClose();
  }, [confirmClose, onClose]);

  const trapRef = useFocusTrap<HTMLDivElement>(open, requestClose);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex"
      // The wrapper only positions; the dialog element carries the role.
    >
      <div
        className="absolute inset-0 bg-ink-950/45 backdrop-blur-[2px] animate-fade-in"
        onClick={disableBackdropClose ? undefined : requestClose}
        aria-hidden="true"
      />

      <div
        className={cn(
          "relative z-10 m-auto flex w-full flex-col bg-ink-50 shadow-e3",
          "max-h-[100dvh] sm:max-h-[min(90dvh,52rem)]",
          sizeMap[size],
          variant === "modal" &&
            "mx-4 my-auto max-h-[88dvh] rounded-2xl animate-scale-in",
          variant === "sheet" &&
            "mt-auto rounded-t-sheet animate-sheet-up sm:m-auto sm:rounded-2xl sm:animate-scale-in",
          variant === "fullscreen" &&
            "h-[100dvh] rounded-none animate-fade-in sm:m-auto sm:h-auto sm:rounded-2xl sm:animate-scale-in",
          className,
        )}
      >
        <div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          tabIndex={-1}
          className="flex min-h-0 flex-1 flex-col focus:outline-none"
        >
          {/* Drag affordance for the mobile sheet. Decorative only. */}
          {variant === "sheet" ? (
            <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-ink-200 sm:hidden" aria-hidden="true" />
          ) : null}

          <div className={cn("flex items-start gap-4 px-5 sm:px-6", hideHeader ? "sr-only" : "pt-5 sm:pt-6")}>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-lg font-bold tracking-tight">
                {title}
              </h2>
              {description ? (
                <p id={descId} className="mt-1 text-sm leading-relaxed text-ink-600">
                  {description}
                </p>
              ) : null}
            </div>
            {!hideHeader ? (
              <IconButton
                label="Close"
                icon={<IconX />}
                size="sm"
                onClick={requestClose}
                className="-mr-1.5 -mt-1 shrink-0"
              />
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
            {children}
          </div>

          {footer ? (
            <div className="shrink-0 border-t border-ink-200 bg-ink-50/60 px-5 py-4 sm:px-6 safe-bottom">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Side drawer. Used for filter panels and secondary navigation where a
 * centred dialog would fight the underlying content.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  side = "right",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: "left" | "right";
  className?: string;
}) {
  const mounted = useMounted();
  const uid = useId();
  const trapRef = useFocusTrap<HTMLDivElement>(open, onClose);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-100">
      <div
        className="absolute inset-0 bg-ink-950/45 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`dw-${uid}-title`}
        tabIndex={-1}
        className={cn(
          "absolute inset-y-0 flex w-full max-w-sm flex-col bg-ink-50 shadow-e3 focus:outline-none",
          side === "right" ? "right-0" : "left-0",
          "animate-fade-in",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-ink-200 px-5 py-4">
          <h2 id={`dw-${uid}-title`} className="text-base font-bold">
            {title}
          </h2>
          <IconButton label="Close" icon={<IconX />} size="sm" onClick={onClose} className="-mr-1.5" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-ink-200 bg-ink-50/60 px-5 py-4 safe-bottom">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/** Focused yes/no confirmation. Never used to collect input. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}) {
  return (
    <Overlay
      open={open}
      onClose={onClose}
      title={title}
      variant="modal"
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "primary"}
            onClick={onConfirm}
            loading={loading}
            loadingText="Working…"
            data-autofocus
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="text-sm leading-relaxed text-ink-700">{description}</div>
    </Overlay>
  );
}
