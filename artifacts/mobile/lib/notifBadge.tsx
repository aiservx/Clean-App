import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";

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
      setUnreadCount(count ?? 0);
    } catch {
      setUnreadCount(0);
    }
  }, [userId]);

  const zeroOutBadge = useCallback(() => setUnreadCount(0), []);

  useEffect(() => {
    if (!userId) { setUnreadCount(0); return; }
    refresh();
    const topic = `notif-badge-${userId}-${Math.random().toString(36).slice(2, 8)}`;
    const ch = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => refresh()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
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
