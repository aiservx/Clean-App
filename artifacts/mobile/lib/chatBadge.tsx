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

  // Track user's room IDs for filtering realtime messages
  const roomIdsRef = useRef<Set<string>>(new Set());

  const loadRoomIds = useCallback(async () => {
    if (!userId) return;
    const { data: rooms } = await supabase
      .from("chat_rooms")
      .select("id")
      .or(`user_id.eq.${userId},provider_id.eq.${userId}`);
    roomIdsRef.current = new Set((rooms ?? []).map((r: any) => r.id));
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      roomIdsRef.current = new Set();
      return;
    }

    loadRoomIds().then(() => refresh());

    const topic = `chat-badge-${userId}-${Math.random().toString(36).slice(2, 8)}`;
    const ch = supabase.channel(topic);
    channelRef.current = ch;

    ch.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload: any) => {
        const msg = payload.new;
        if (!msg?.sender_id || msg.sender_id === userId) return;
        if (msg.room_id && !roomIdsRef.current.has(msg.room_id)) return;
        setUnreadCount((prev) => prev + 1);
      }
    ).subscribe();

    // Also listen for new chat_rooms to update room list
    const roomCh = supabase.channel(`chat-rooms-${userId}-${Math.random().toString(36).slice(2, 8)}`);
    roomCh.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_rooms" },
      (payload: any) => {
        const room = payload.new;
        if (room?.id) roomIdsRef.current.add(room.id);
      }
    ).subscribe();

    return () => {
      supabase.removeChannel(ch);
      supabase.removeChannel(roomCh);
      channelRef.current = null;
    };
  }, [userId, refresh, loadRoomIds]);

  return (
    <Ctx.Provider value={{ unreadCount, markRead }}>
      {children}
    </Ctx.Provider>
  );
}

export function useChatBadge() {
  return useContext(Ctx);
}
