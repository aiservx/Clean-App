import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useChatBadge } from "@/lib/chatBadge";

type Room = {
  id: string;
  bookingId: string | null;
  customerName: string | null;
  serviceName: string | null;
  bookingStatus: string | null;
  lastMsgBody: string | null;
  lastMsgAt: string | null;
  createdAt: string;
};

const STATUS_AR: Record<string, string> = {
  pending: "قيد الانتظار", accepted: "مقبول", on_the_way: "في الطريق",
  in_progress: "جاري التنفيذ", completed: "مكتمل", cancelled: "ملغي",
};

function relTime(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return m <= 0 ? "الآن" : `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س`;
  const d = Math.floor(h / 24);
  return d === 1 ? "أمس" : `منذ ${d} أيام`;
}

export default function ProviderChat() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { session } = useAuth();
  const { markRead } = useChatBadge();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { markRead(); }, []);

  const load = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from("chat_rooms")
        .select(`
          id, booking_id, created_at,
          customer:profiles!chat_rooms_user_id_fkey(full_name),
          bookings:booking_id(status, services:service_id(title_ar))
        `)
        .eq("provider_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (data) {
        const roomIds = data.map((r: any) => r.id);
        let lastMsgs: Record<string, { body: string; created_at: string }> = {};
        if (roomIds.length > 0) {
          const { data: msgData } = await supabase
            .from("messages").select("room_id, body, created_at")
            .in("room_id", roomIds)
            .order("created_at", { ascending: false });
          if (msgData) {
            msgData.forEach((m: any) => {
              if (!lastMsgs[m.room_id]) lastMsgs[m.room_id] = { body: m.body, created_at: m.created_at };
            });
          }
        }
        setRooms(data.map((r: any) => ({
          id: r.id,
          bookingId: r.booking_id,
          customerName: r.customer?.full_name ?? null,
          serviceName: r.bookings?.services?.title_ar ?? null,
          bookingStatus: r.bookings?.status ?? null,
          lastMsgBody: lastMsgs[r.id]?.body ?? null,
          lastMsgAt: lastMsgs[r.id]?.created_at ?? r.created_at,
          createdAt: r.created_at,
        })));
      }
    } catch {}
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={{ alignItems: "flex-end", flex: 1 }}>
          <Text style={[styles.hT, { color: colors.foreground }]}>الرسائل</Text>
          <Text style={[styles.hS, { color: colors.mutedForeground }]}>تواصل مع عملائك</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 130, paddingHorizontal: 16, flexGrow: rooms.length === 0 ? 1 : undefined }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {rooms.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 }}>
              <Feather name="message-circle" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyT, { color: colors.foreground }]}>لا توجد محادثات بعد</Text>
              <Text style={[styles.emptyS, { color: colors.mutedForeground }]}>ستظهر هنا محادثاتك مع العملاء بعد انشاء غرف الدردشة</Text>
            </View>
          ) : rooms.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.row, { borderBottomColor: colors.border }]}
              onPress={() => router.push(
                `/chat-detail?name=${encodeURIComponent(r.customerName ?? "عميل")}&roomId=${r.id}${r.bookingId ? `&bookingId=${r.bookingId}` : ""}` as any
              )}
            >
              <View style={styles.left}>
                <Text style={[styles.time, { color: colors.mutedForeground }]}>{relTime(r.lastMsgAt)}</Text>
              </View>
              <View style={styles.center}>
                <Text style={[styles.name, { color: colors.foreground }]}>{r.customerName ?? "عميل"}</Text>
                <Text style={[styles.last, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {r.lastMsgBody
                    ? r.lastMsgBody
                    : r.serviceName
                      ? `${r.serviceName}${r.bookingStatus ? " · " + (STATUS_AR[r.bookingStatus] ?? r.bookingStatus) : ""}`
                      : "ابدأ المحادثة"}
                </Text>
              </View>
              <View style={[styles.av, { backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }]}>
                <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 18, color: colors.primary }}>
                  {(r.customerName ?? "ع").charAt(0)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  header: { paddingHorizontal: 16, marginBottom: 14 },
  hT: { fontFamily: "Tajawal_700Bold", fontSize: 18 },
  hS: { fontFamily: "Tajawal_400Regular", fontSize: 11 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1 },
  left: { alignItems: "center", justifyContent: "center", width: 50 },
  time: { fontFamily: "Tajawal_500Medium", fontSize: 10 },
  center: { flex: 1, alignItems: "flex-end", marginHorizontal: 12 },
  name: { fontFamily: "Tajawal_700Bold", fontSize: 14, marginBottom: 2 },
  last: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  av: { width: 50, height: 50, borderRadius: 25 },
  emptyT: { fontFamily: "Tajawal_700Bold", fontSize: 16, marginTop: 16, textAlign: "center" },
  emptyS: { fontFamily: "Tajawal_400Regular", fontSize: 12, marginTop: 6, textAlign: "center" },
});
