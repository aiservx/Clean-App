import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";

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
    const topic = `prov-order-badge-${userId}-${Math.random().toString(36).slice(2, 8)}`;
    const ch = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => refresh()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, isProvider, refresh]);

  return <Ctx.Provider value={{ pendingCount, clearBadge }}>{children}</Ctx.Provider>;
}

export function useProviderOrderBadge() {
  return useContext(Ctx);
}
