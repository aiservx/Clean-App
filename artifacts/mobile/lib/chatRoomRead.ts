import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

function seenKey(userId: string, roomId: string) {
  return `chat_room_seen_${userId}_${roomId}`;
}

export async function markRoomRead(userId: string, roomId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(seenKey(userId, roomId), new Date().toISOString());
  } catch {}
}

export async function getRoomUnreadCount(userId: string, roomId: string): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(seenKey(userId, roomId));
    const since = stored ?? new Date(0).toISOString();
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("room_id", roomId)
      .neq("sender_id", userId)
      .gt("created_at", since);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function getBatchRoomUnread(
  userId: string,
  roomIds: string[],
): Promise<Record<string, number>> {
  if (!roomIds.length) return {};
  try {
    const sinceMap: Record<string, string> = {};
    await Promise.all(
      roomIds.map(async (rid) => {
        const stored = await AsyncStorage.getItem(seenKey(userId, rid));
        sinceMap[rid] = stored ?? new Date(0).toISOString();
      }),
    );

    const oldestSince = Object.values(sinceMap).reduce(
      (oldest, ts) => (ts < oldest ? ts : oldest),
      sinceMap[roomIds[0]],
    );

    const { data } = await supabase
      .from("messages")
      .select("room_id, sender_id, created_at")
      .in("room_id", roomIds)
      .neq("sender_id", userId)
      .gt("created_at", oldestSince);

    const counts: Record<string, number> = {};
    for (const rid of roomIds) counts[rid] = 0;

    for (const msg of data ?? []) {
      const rid = msg.room_id;
      if (!rid || !(rid in counts)) continue;
      const since = sinceMap[rid];
      if (msg.created_at > since) counts[rid]++;
    }

    return counts;
  } catch {
    const fallback: Record<string, number> = {};
    for (const rid of roomIds) fallback[rid] = 0;
    return fallback;
  }
}
