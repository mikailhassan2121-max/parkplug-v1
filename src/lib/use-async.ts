"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiError, ApiResult } from "./api/result";

export type AsyncState<T> =
  | { status: "loading"; data?: T }
  | { status: "ready"; data: T }
  | { status: "error"; error: ApiError };

/**
 * Runs an API call and exposes the three states every data surface needs.
 * `reload` re-runs it, keeping the previous data visible so refreshes do not
 * blank the screen.
 */
export function useAsync<T>(
  run: () => Promise<ApiResult<T>>,
  deps: unknown[] = [],
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const alive = useRef(true);
  const runRef = useRef(run);
  runRef.current = run;

  const execute = useCallback(() => {
    setState((prev) => ({ status: "loading", data: prev.status === "ready" ? prev.data : undefined }));
    runRef.current().then((result) => {
      if (!alive.current) return;
      setState(result.ok ? { status: "ready", data: result.data } : { status: "error", error: result.error });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    alive.current = true;
    execute();
    return () => {
      alive.current = false;
    };
  }, [execute]);

  return { ...state, reload: execute };
}

/**
 * Wraps a one-shot action (submit, cancel, delete) with the idle → pending →
 * done lifecycle, and guards against duplicate submissions.
 */
export function useAction<TArgs extends unknown[], TData>(
  action: (...args: TArgs) => Promise<ApiResult<TData>>,
) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const inFlight = useRef(false);

  const run = useCallback(
    async (...args: TArgs): Promise<ApiResult<TData> | null> => {
      if (inFlight.current) return null;
      inFlight.current = true;
      setPending(true);
      setError(null);
      try {
        const result = await action(...args);
        if (!result.ok) setError(result.error);
        return result;
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    },
    [action],
  );

  return { run, pending, error, clearError: () => setError(null) };
}

/** Debounces a rapidly changing value — used for map panning and search input. */
export function useDebounced<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Tracks a CSS media query, SSR-safe. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const list = window.matchMedia(query);
    setMatches(list.matches);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/** Reports the browser's online/offline state. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);
  return online;
}

/**
 * Warns before the user navigates away from a form with unsaved input.
 * Covers browser navigation; in-app navigation is guarded by the flows
 * themselves via a confirmation dialog.
 */
export function useUnsavedChangesWarning(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [enabled]);
}
