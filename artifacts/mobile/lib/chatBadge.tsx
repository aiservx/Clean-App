import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { useAuth } from "./auth";

type ChatBadgeCtx = {
  unreadCount: number;
  markRead: () => Promise<void>;
};

const Ctx = createContext<ChatBadgeCtx>({ unreadCount: 0, markRead: async () => {} });

function lastSeenKey(userId: string) {
  return `chat_last_seen_${userId}`;
}

async function fetchUnreadCount(userId: string): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(lastSeenKey(userId));
    const since = stored ?? new Date(0).toISOString();

    const { data: rooms } = await supabase
      .from("chat_rooms")
      .select("id")
      .or(`user_id.eq.${userId},provider_id.eq.${userId}`);

    if (!rooms?.length) return 0;

    const roomIds = rooms.map((r: any) => r.id);

    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("room_id", roomIds)
      .neq("sender_id", userId)
      .gt("created_at", since);

    return count ?? 0;
  } catch {
    return 0;
  }
}

export function ChatBadgeProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const userId = session?.user?.id;

  const refresh = useCallback(async () => {
    if (!userId) { setUnreadCount(0); return; }
    const c = await fetchUnreadCount(userId);
    setUnreadCount(c);
  }, [userId]);

  const markRead = useCallback(async () => {
    if (!userId) return;
    await AsyncStorage.setItem(lastSeenKey(userId), new Date().toISOString());
    setUnreadCount(0);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    refresh();

    const topic = `chat-badge-${userId}-${Math.random().toString(36).slice(2, 8)}`;
    const ch = supabase.channel(topic);
    channelRef.current = ch;

    ch.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload: any) => {
        if (payload.new?.sender_id && payload.new.sender_id !== userId) {
          setUnreadCount((prev) => prev + 1);
        }
      }
    ).subscribe();

    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [userId, refresh]);

  return (
    <Ctx.Provider value={{ unreadCount, markRead }}>
      {children}
    </Ctx.Provider>
  );
}

export function useChatBadge() {
  return useContext(Ctx);
}
