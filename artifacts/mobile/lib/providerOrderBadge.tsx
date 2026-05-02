/**
 * ProviderOrderBadge — integrated with global realtimeEvents.
 * Listens to provider_order_updated events from RealtimeProvider
 * instead of maintaining a separate Supabase channel.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { realtimeEvents } from "./realtimeStore";

type ProviderOrderBadgeCtx = {
  pendingCount: number;
  clearBadge: () => void;
};

const Ctx = createContext<ProviderOrderBadgeCtx>({ pendingCount: 0, clearBadge: () => {} });

export function ProviderOrderBadgeProvider({ children }: { children: React.ReactNode }) {
  const { session, profile } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const userId = session?.user?.id;
  const isProvider = (profile as any)?.role === "provider";

  const refresh = useCallback(async () => {
    if (!userId || !isProvider) { setPendingCount(0); return; }
    try {
      const { count } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .or(`provider_id.is.null,provider_id.eq.${userId}`);
      setPendingCount(count ?? 0);
    } catch {
      setPendingCount(0);
    }
  }, [userId, isProvider]);

  const clearBadge = useCallback(() => setPendingCount(0), []);

  useEffect(() => {
    if (!userId || !isProvider) { setPendingCount(0); return; }
    refresh();

    // Listen to global provider_order_updated events from RealtimeProvider
    const unsub = realtimeEvents.subscribe((event) => {
      if (event.type === "provider_order_updated") {
        // Refresh count whenever any booking changes
        refresh();
      }
    });

    return unsub;
  }, [userId, isProvider, refresh]);

  return <Ctx.Provider value={{ pendingCount, clearBadge }}>{children}</Ctx.Provider>;
}

export function useProviderOrderBadge() {
  return useContext(Ctx);
}
