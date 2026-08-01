"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { IconAlert, IconCheckCircle, IconInfo, IconX } from "./icons";

export type ToastTone = "success" | "error" | "info" | "warning";

export type Toast = {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  /** Optional retry / undo affordance. */
  action?: { label: string; onClick: () => void };
  duration?: number;
};

type ToastInput = Omit<Toast, "id">;

const ToastContext = createContext<{
  toast: (t: ToastInput) => string;
  dismiss: (id: string) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const toneStyles: Record<ToastTone, { bar: string; icon: ReactNode; iconColor: string }> = {
  success: { bar: "bg-success-500", icon: <IconCheckCircle />, iconColor: "text-success-600" },
  error: { bar: "bg-danger-500", icon: <IconAlert />, iconColor: "text-danger-600" },
  warning: { bar: "bg-warning-500", icon: <IconAlert />, iconColor: "text-warning-600" },
  info: { bar: "bg-info-500", icon: <IconInfo />, iconColor: "text-info-600" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = `t${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
      // Errors persist until dismissed; the user may need to act on them.
      const duration = input.duration ?? (input.tone === "error" ? 0 : 5000);
      setToasts((prev) => [...prev.slice(-2), { ...input, id }]);
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      }
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach(clearTimeout);
      map.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/*
        Region is always in the DOM so assistive tech observes it from the
        start; otherwise the first announcement can be missed.
      */}
      <div
        role="region"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-200 flex flex-col items-center gap-2
                   px-4 pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)]
                   sm:items-end sm:pb-6 sm:pr-6 lg:pb-8"
      >
        {toasts.map((t) => {
          const style = toneStyles[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              aria-live={t.tone === "error" ? "assertive" : "polite"}
              className="pointer-events-auto flex w-full max-w-sm animate-toast-in overflow-hidden
                         rounded-xl border border-ink-200 bg-white shadow-e3"
            >
              <span className={cn("w-1 shrink-0", style.bar)} aria-hidden="true" />
              <div className="flex flex-1 items-start gap-3 p-3.5">
                <span className={cn("mt-px shrink-0 text-[1.15rem]", style.iconColor)} aria-hidden="true">
                  {style.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink-900">{t.title}</p>
                  {t.description ? (
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-600">{t.description}</p>
                  ) : null}
                  {t.action ? (
                    <button
                      type="button"
                      onClick={() => {
                        t.action?.onClick();
                        dismiss(t.id);
                      }}
                      className="mt-2 text-xs font-bold text-brand-700 underline underline-offset-2 hover:text-brand-800"
                    >
                      {t.action.label}
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label={`Dismiss: ${t.title}`}
                  className="-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-400
                             transition-colors hover:bg-ink-100 hover:text-ink-700"
                >
                  <IconX className="text-[0.9rem]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
