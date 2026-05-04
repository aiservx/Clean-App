import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useChatBadge } from "@/lib/chatBadge";
import { getBatchRoomUnread } from "@/lib/chatRoomRead";

type Room = {
  id: string;
  bookingId: string | null;
  customerName: string | null;
  serviceName: string | null;
  bookingStatus: string | null;
  lastMsgBody: string | null;
  lastMsgAt: string | null;
  createdAt: string;
  unread: number;
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

  const load = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    try {
      const userId = session.user.id;
      const { data } = await supabase
        .from("chat_rooms")
        .select(`
          id, booking_id, created_at,
          customer:profiles!chat_rooms_user_id_fkey(full_name),
          bookings:booking_id(status, services:service_id(title_ar))
        `)
        .eq("provider_id", userId)
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

        const unreadMap = roomIds.length > 0 ? await getBatchRoomUnread(userId, roomIds) : {};

        setRooms(data.map((r: any) => ({
          id: r.id,
          bookingId: r.booking_id,
          customerName: r.customer?.full_name ?? null,
          serviceName: r.bookings?.services?.title_ar ?? null,
          bookingStatus: r.bookings?.status ?? null,
          lastMsgBody: lastMsgs[r.id]?.body ?? null,
          lastMsgAt: lastMsgs[r.id]?.created_at ?? r.created_at,
          createdAt: r.created_at,
          unread: (unreadMap as Record<string, number>)[r.id] ?? 0,
        })));
      }
    } catch {}
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
      markRead();
    }, [load, markRead])
  );

  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;
    const topic = `provider-chat-inbox-live-${userId}-${Math.random().toString(36).slice(2, 8)}`;
    const ch = supabase.channel(topic);
    ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
      load();
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session, load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      {/* Header with back button */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Feather name="chevron-right" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.hT, { color: colors.foreground }]}>الرسائل</Text>
          <Text style={[styles.hS, { color: colors.mutedForeground }]}>
            {rooms.length > 0 ? `${rooms.length} محادثة نشطة` : "تواصل مع عملائك"}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {rooms.filter(r => r.unread > 0).length > 0 && (
            <View style={[styles.totalBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.totalBadgeT}>
                {rooms.reduce((acc, r) => acc + r.unread, 0)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 130, paddingHorizontal: 16, paddingTop: 8, flexGrow: rooms.length === 0 ? 1 : undefined }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {rooms.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 }}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
                <Feather name="message-circle" size={40} color={colors.primary} />
              </View>
              <Text style={[styles.emptyT, { color: colors.foreground }]}>لا توجد محادثات بعد</Text>
              <Text style={[styles.emptyS, { color: colors.mutedForeground }]}>
                ستظهر هنا محادثاتك مع العملاء بعد إنشاء غرف الدردشة
              </Text>
            </View>
          ) : rooms.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.row, {
                backgroundColor: r.unread > 0 ? colors.primaryLight : colors.card,
                borderColor: r.unread > 0 ? colors.primary + "30" : colors.border,
              }]}
              onPress={() => router.push(
                `/chat-detail?name=${encodeURIComponent(r.customerName ?? "عميل")}&roomId=${r.id}${r.bookingId ? `&bookingId=${r.bookingId}` : ""}` as any
              )}
              activeOpacity={0.85}
            >
              {/* Avatar */}
              <View style={[styles.av, { backgroundColor: r.unread > 0 ? colors.primary : colors.primaryLight }]}>
                <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 18, color: r.unread > 0 ? "#FFF" : colors.primary }}>
                  {(r.customerName ?? "ع").charAt(0)}
                </Text>
              </View>

              {/* Content */}
              <View style={styles.center}>
                <Text style={[styles.name, { color: colors.foreground }]}>
                  {r.customerName ?? "عميل"}
                </Text>
                <Text
                  style={[styles.last, { color: r.unread > 0 ? colors.foreground : colors.mutedForeground, fontFamily: r.unread > 0 ? "Tajawal_700Bold" : "Tajawal_500Medium" }]}
                  numberOfLines={1}
                >
                  {r.lastMsgBody
                    ? r.lastMsgBody
                    : r.serviceName
                      ? `${r.serviceName}${r.bookingStatus ? " · " + (STATUS_AR[r.bookingStatus] ?? r.bookingStatus) : ""}`
                      : "ابدأ المحادثة"}
                </Text>
              </View>

              {/* Right side: time + badge */}
              <View style={styles.rightCol}>
                <Text style={[styles.time, { color: r.unread > 0 ? colors.primary : colors.mutedForeground }]}>
                  {relTime(r.lastMsgAt)}
                </Text>
                {r.unread > 0 ? (
                  <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.unreadBadgeT}>{r.unread > 99 ? "99+" : String(r.unread)}</Text>
                  </View>
                ) : (
                  <View style={{ height: 20 }} />
                )}
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
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
    paddingBottom: 14, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "flex-end" },
  headerRight: { width: 40, alignItems: "center" },
  hT: { fontFamily: "Tajawal_700Bold", fontSize: 18 },
  hS: { fontFamily: "Tajawal_400Regular", fontSize: 11, marginTop: 1 },
  totalBadge: { minWidth: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  totalBadgeT: { color: "#FFF", fontSize: 11, fontFamily: "Tajawal_700Bold" },

  row: {
    flexDirection: "row", alignItems: "center", padding: 12,
    borderRadius: 16, marginBottom: 10,
    borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  av: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  center: { flex: 1, alignItems: "flex-end", marginHorizontal: 12 },
  name: { fontFamily: "Tajawal_700Bold", fontSize: 14, marginBottom: 3 },
  last: { fontSize: 12 },
  rightCol: { alignItems: "center", gap: 6, flexShrink: 0 },
  time: { fontFamily: "Tajawal_500Medium", fontSize: 10 },
  unreadBadge: {
    minWidth: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 5,
  },
  unreadBadgeT: { color: "#FFF", fontSize: 11, fontFamily: "Tajawal_700Bold" },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyT: { fontFamily: "Tajawal_700Bold", fontSize: 16, marginTop: 4, textAlign: "center" },
  emptyS: { fontFamily: "Tajawal_400Regular", fontSize: 13, marginTop: 6, textAlign: "center", paddingHorizontal: 32, lineHeight: 20 },
});
