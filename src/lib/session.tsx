"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { auth, notifications, type SessionUser } from "@/lib/api";
import { COLLECTIONS, subscribe } from "@/lib/api/store";

type SessionState =
  | { status: "loading"; user: null }
  | { status: "authenticated"; user: SessionUser }
  | { status: "anonymous"; user: null };

type SessionContextValue = SessionState & {
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  unreadNotifications: number;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within <SessionProvider>");
  return ctx;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading", user: null });
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    const result = await auth.getSession();
    if (result.ok && result.data) {
      setState({ status: "authenticated", user: result.data });
      const list = await notifications.list();
      setUnread(list.ok ? list.data.filter((n) => !n.readAt).length : 0);
    } else {
      setState({ status: "anonymous", user: null });
      setUnread(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
    // Keeps the header in sync when another tab signs in or out.
    const unsubSession = subscribe(COLLECTIONS.session, () => void refresh());
    const unsubNotifications = subscribe(COLLECTIONS.notifications, () => void refresh());
    return () => {
      unsubSession();
      unsubNotifications();
    };
  }, [refresh]);

  const signOut = useCallback(async () => {
    await auth.signOut();
    setState({ status: "anonymous", user: null });
    setUnread(0);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ ...state, refresh, signOut, unreadNotifications: unread }),
    [state, refresh, signOut, unread],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
