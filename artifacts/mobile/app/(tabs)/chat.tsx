import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  RefreshControl, ActivityIndicator, I18nManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { useChatBadge } from "@/lib/chatBadge";
import { getBatchRoomUnread } from "@/lib/chatRoomRead";
import GuestEmpty from "@/components/GuestEmpty";
import FloatingTabBar from "@/components/FloatingTabBar";

const AI_AVATAR = require("@/assets/images/ai-avatar-light.png");

type Conversation = {
  room_id: string;
  booking_id: string;
  other_id: string;
  other_name: string;
  other_avatar: string | null;
  last_message: string;
  last_at: string;
  unread: number;
  service_title: string;
  status: string;
};

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "أمس";
  return d.toLocaleDateString("ar-SA", { day: "numeric", month: "short" });
};

const STATUS_AR: Record<string, string> = {
  pending: "قيد الانتظار",
  accepted: "مقبول",
  on_the_way: "في الطريق",
  in_progress: "جاري التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
};

export default function ChatInboxScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useI18n();
  const { session, profile } = useAuth();
  const { markRead } = useChatBadge();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    try {
      const userId = session.user.id;
      const isProvider = profile?.role === "provider";

      const { data: rooms } = await supabase
        .from("chat_rooms")
        .select("id, booking_id, user_id, provider_id, created_at")
        .or(isProvider ? `provider_id.eq.${userId}` : `user_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!rooms || rooms.length === 0) {
        const { data: bookings } = await supabase
          .from("bookings")
          .select("id, provider_id, status, created_at, services(title_ar), provider:profiles!bookings_provider_id_fkey(full_name, avatar_url), client:profiles!bookings_user_id_fkey(full_name, avatar_url)")
          .eq(isProvider ? "provider_id" : "user_id", userId)
          .in("status", ["pending", "accepted", "on_the_way", "in_progress", "completed"])
          .order("created_at", { ascending: false })
          .limit(20);

        const convs: Conversation[] = (bookings ?? []).map((b: any) => {
          const other = isProvider ? b.client : b.provider;
          return {
            room_id: "",
            booking_id: b.id,
            other_id: isProvider ? b.user_id : (b.provider_id || ""),
            other_name: other?.full_name || "فني",
            other_avatar: other?.avatar_url || null,
            last_message: `حجز ${b.services?.title_ar || "خدمة"}`,
            last_at: b.created_at,
            unread: 0,
            service_title: b.services?.title_ar || "خدمة",
            status: b.status,
          };
        });
        setConversations(convs);
        setLoading(false);
        return;
      }

      const roomIds = rooms.map((r) => r.id);
      const [unreadMap, ...roomDetails] = await Promise.all([
        getBatchRoomUnread(userId, roomIds),
        ...rooms.map((room) => {
          const otherId = isProvider ? room.user_id : room.provider_id;
          return Promise.all([
            supabase.from("profiles").select("full_name, avatar_url").eq("id", otherId).maybeSingle(),
            supabase.from("messages").select("body, created_at").eq("room_id", room.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
            supabase.from("bookings").select("status, services(title_ar)").eq("id", room.booking_id).maybeSingle(),
          ]);
        }),
      ]);

      const convs: Conversation[] = rooms.map((room, i) => {
        const otherId = isProvider ? room.user_id : room.provider_id;
        const [profileRes, lastMsgRes, bookingRes] = roomDetails[i];
        return {
          room_id: room.id,
          booking_id: room.booking_id,
          other_id: otherId,
          other_name: profileRes.data?.full_name || "فني",
          other_avatar: profileRes.data?.avatar_url || null,
          last_message: lastMsgRes.data?.body || "ابدأ المحادثة",
          last_at: lastMsgRes.data?.created_at || room.created_at,
          unread: (unreadMap as Record<string, number>)[room.id] ?? 0,
          service_title: (bookingRes.data as any)?.services?.title_ar || "خدمة",
          status: (bookingRes.data as any)?.status || "pending",
        };
      });
      convs.sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime());
      setConversations(convs);
    } catch (e) {
      console.log("[v0] inbox load error:", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [session, profile]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Reload + clear badge every time the screen comes into focus (e.g. returning from a chat)
  useFocusEffect(
    useCallback(() => {
      loadConversations();
      markRead();
    }, [loadConversations, markRead])
  );

  // Realtime: new message anywhere → reload conversation list instantly
  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;
    const topic = `chat-inbox-live-${userId}-${Math.random().toString(36).slice(2, 8)}`;
    const ch = supabase.channel(topic);
    ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
      loadConversations();
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session, loadConversations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <GuestEmpty title={t("messages")} subtitle={t("messages_sub")} icon="message-text-outline" />
        <FloatingTabBar active="chat" />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ width: 44 }} />
        <View style={s.hCenter}>
          <Text style={[s.hTitle, { color: colors.foreground }]}>{t("messages")}</Text>
          <Text style={[s.hSub, { color: colors.mutedForeground }]}>{t("messages_sub")}</Text>
        </View>
        <TouchableOpacity style={[s.hIcon, { backgroundColor: colors.card }]} onPress={() => router.push("/notifications")}>
          <Feather name="bell" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <TouchableOpacity
          style={[s.aiCard, { backgroundColor: "#7C3AED" }]}
          activeOpacity={0.9}
          onPress={() => router.push("/ai-assistant")}
        >
          <LinearGradient colors={["#7C3AED", "#4F46E5"]} style={s.aiCardBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={s.aiCardRow}>
              <Feather name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} size={20} color="rgba(255,255,255,0.8)" />
              <View style={s.aiInfo}>
                <Text style={s.aiTitle}>{t("ai_chat")} ✨</Text>
                <Text style={s.aiSub}>{t("ai_chat_sub")}</Text>
              </View>
              <Image source={AI_AVATAR} style={s.aiAvatar} />
            </View>
            <View style={s.aiChips}>
              {["الخدمات والأسعار", "تتبع طلبي", "العروض"].map((label) => (
                <View key={label} style={s.aiChip}>
                  <Text style={s.aiChipT}>{label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[s.sectionTitle, { color: colors.foreground }]}>المحادثات</Text>

        {loading ? (
          <View style={s.emptyWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : conversations.length === 0 ? (
          <View style={s.emptyWrap}>
            <MaterialCommunityIcons name="message-text-outline" size={48} color={colors.mutedForeground} />
            <Text style={[s.emptyTitle, { color: colors.foreground }]}>{t("no_conversations")}</Text>
            <Text style={[s.emptySub, { color: colors.mutedForeground }]}>{t("no_conversations_sub")}</Text>
          </View>
        ) : (
          conversations.map((conv) => (
            <TouchableOpacity
              key={conv.booking_id}
              style={[s.convCard, { backgroundColor: conv.unread > 0 ? colors.primaryLight : colors.card }]}
              activeOpacity={0.85}
              onPress={() => router.push({
                pathname: "/chat-detail",
                params: {
                  name: conv.other_name,
                  bookingId: conv.booking_id,
                  ...(conv.room_id ? { roomId: conv.room_id } : {}),
                },
              } as any)}
            >
              <View style={s.convRow}>
                <View style={s.convInfo}>
                  <View style={s.convNameRow}>
                    <Text style={[s.convName, { color: colors.foreground, fontFamily: conv.unread > 0 ? "Tajawal_700Bold" : "Tajawal_500Medium" }]} numberOfLines={1}>
                      {conv.other_name}
                    </Text>
                    <Text style={[s.convTime, { color: conv.unread > 0 ? colors.primary : colors.mutedForeground }]}>
                      {fmtTime(conv.last_at)}
                    </Text>
                  </View>
                  <View style={s.convMsgRow}>
                    <Text
                      style={[s.convMsg, { flex: 1, color: conv.unread > 0 ? colors.foreground : colors.mutedForeground, fontFamily: conv.unread > 0 ? "Tajawal_700Bold" : "Tajawal_400Regular" }]}
                      numberOfLines={1}
                    >
                      {conv.last_message}
                    </Text>
                    {conv.unread > 0 && (
                      <View style={[s.unreadBadge, { backgroundColor: colors.primary }]}>
                        <Text style={s.unreadBadgeT}>{conv.unread > 99 ? "99+" : String(conv.unread)}</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.convMeta}>
                    <View style={[s.convStatus, { backgroundColor: statusColor(conv.status) + "22" }]}>
                      <Text style={[s.convStatusT, { color: statusColor(conv.status) }]}>{STATUS_AR[conv.status] || conv.status}</Text>
                    </View>
                    <Text style={[s.convService, { color: colors.mutedForeground }]}>{conv.service_title}</Text>
                  </View>
                </View>
                <View style={{ position: "relative" }}>
                  <Image
                    source={conv.other_avatar ? { uri: conv.other_avatar } : require("@/assets/images/default-avatar.png")}
                    style={s.convAvatar}
                  />
                  {conv.unread > 0 && (
                    <View style={[s.avatarBadge, { backgroundColor: colors.primary }]}>
                      <Text style={s.avatarBadgeT}>{conv.unread > 99 ? "99+" : conv.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <FloatingTabBar active="chat" />
    </View>
  );
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    pending: "#F59E0B", accepted: "#3B82F6", on_the_way: "#8B5CF6",
    in_progress: "#2F80ED", completed: "#16C47F", cancelled: "#EF4444",
  };
  return map[status] || "#6B7280";
}

const rowDir = I18nManager.isRTL ? ("row" as const) : ("row-reverse" as const);
const colAlign = I18nManager.isRTL ? ("flex-start" as const) : ("flex-end" as const);

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: rowDir, alignItems: "center", justifyContent: "space-between" },
  hIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  hCenter: { alignItems: "center" },
  hTitle: { fontFamily: "Tajawal_700Bold", fontSize: 20 },
  hSub: { fontFamily: "Tajawal_500Medium", fontSize: 11, marginTop: 2 },

  aiCard: { borderRadius: 20, overflow: "hidden", marginBottom: 20, marginTop: 8 },
  aiCardBg: { padding: 18 },
  aiCardRow: { flexDirection: rowDir, alignItems: "center", gap: 12 },
  aiAvatar: { width: 50, height: 50, borderRadius: 25 },
  aiInfo: { flex: 1, alignItems: colAlign },
  aiTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#FFF" },
  aiSub: { fontFamily: "Tajawal_500Medium", fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  aiChips: { flexDirection: rowDir, flexWrap: "wrap", gap: 8, marginTop: 14 },
  aiChip: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  aiChipT: { fontFamily: "Tajawal_700Bold", fontSize: 11, color: "#FFF" },

  sectionTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16, marginBottom: 12 },

  emptyWrap: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16, marginTop: 8 },
  emptySub: { fontFamily: "Tajawal_500Medium", fontSize: 12, textAlign: "center" },

  convCard: { borderRadius: 16, padding: 14, marginBottom: 10 },
  convRow: { flexDirection: rowDir, gap: 12 },
  convAvatar: { width: 50, height: 50, borderRadius: 25 },
  avatarBadge: {
    position: "absolute", top: -4, end: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 4, borderWidth: 2, borderColor: "#FFF",
  },
  avatarBadgeT: { color: "#FFF", fontSize: 9, fontFamily: "Tajawal_700Bold" },
  convInfo: { flex: 1, alignItems: colAlign },
  convNameRow: { flexDirection: rowDir, justifyContent: "space-between", alignItems: "center", width: "100%" },
  convName: { fontSize: 14, flex: 1 },
  convTime: { fontFamily: "Tajawal_500Medium", fontSize: 10 },
  convMsgRow: { flexDirection: rowDir, alignItems: "center", width: "100%", marginTop: 4, gap: 6 },
  convMsg: { fontSize: 12 },
  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 5,
  },
  unreadBadgeT: { color: "#FFF", fontSize: 10, fontFamily: "Tajawal_700Bold" },
  convMeta: { flexDirection: rowDir, gap: 8, marginTop: 6, alignItems: "center", justifyContent: "flex-start" },
  convStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  convStatusT: { fontFamily: "Tajawal_700Bold", fontSize: 9 },
  convService: { fontFamily: "Tajawal_500Medium", fontSize: 10 },
});
