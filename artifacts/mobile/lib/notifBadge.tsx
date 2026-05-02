/**
 * NotifBadge — now integrated with global realtimeEvents dispatcher.
 * Instead of maintaining its own Supabase channel, it listens to
 * badge_updated events emitted by RealtimeProvider (the single source of truth).
 * This eliminates duplicate subscriptions and race conditions.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { realtimeEvents } from "./realtimeStore";
import { syncBadge } from "./notifications";

type NotifBadgeCtx = {
  unreadCount: number;
  refreshBadge: () => void;
  zeroOutBadge: () => void;
};

const Ctx = createContext<NotifBadgeCtx>({
  unreadCount: 0,
  refreshBadge: () => {},
  zeroOutBadge: () => {},
});

export function NotifBadgeProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const userId = session?.user?.id;

  const refresh = useCallback(async () => {
    if (!userId) { setUnreadCount(0); return; }
    try {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false);
      const c = count ?? 0;
      setUnreadCount(c);
      syncBadge(c).catch(() => {});
    } catch {
      setUnreadCount(0);
    }
  }, [userId]);

  const zeroOutBadge = useCallback(() => {
    setUnreadCount(0);
    syncBadge(0).catch(() => {});
  }, []);

  useEffect(() => {
    if (!userId) { setUnreadCount(0); return; }
    refresh();

    // Listen to global badge_updated events from RealtimeProvider
    const unsub = realtimeEvents.subscribe((event) => {
      if (event.type === "badge_updated") {
        setUnreadCount(event.unreadCount);
        syncBadge(event.unreadCount).catch(() => {});
      }
    });

    return unsub;
  }, [userId, refresh]);

  return (
    <Ctx.Provider value={{ unreadCount, refreshBadge: refresh, zeroOutBadge }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNotifBadge() {
  return useContext(Ctx);
}
