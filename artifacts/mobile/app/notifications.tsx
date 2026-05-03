import React, { useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useNotifBadge } from "@/lib/notifBadge";
import { useRealtimeNotifs } from "@/lib/realtimeStore";

type Notif = {
  id: string;
  user_id: string;
  type: string | null;
  title: string;
  body: string | null;
  data: any;
  read: boolean | null;
  created_at: string;
};

function notifMeta(type: string | null): { icon: string; color: string } {
  switch (type) {
    case "booking_created":   return { icon: "shopping-bag",  color: "#16C47F" };
    case "booking_accepted":  return { icon: "user-check",    color: "#2F80ED" };
    case "booking_on_way":    return { icon: "navigation-2",  color: "#16C47F" };
    case "booking_started":   return { icon: "play-circle",   color: "#8B5CF6" };
    case "booking_completed": return { icon: "check-circle",  color: "#22C55E" };
    case "booking_cancelled": return { icon: "x-circle",      color: "#EF4444" };
    case "payment":           return { icon: "credit-card",   color: "#8B5CF6" };
    case "offer":
    case "promo":             return { icon: "gift",          color: "#F59E0B" };
    case "review_request":    return { icon: "star",          color: "#EC4899" };
    case "review_received":   return { icon: "star",          color: "#F59E0B" };
    case "referral":          return { icon: "users",         color: "#16C47F" };
    default:                  return { icon: "bell",          color: "#64748B" };
  }
}

function timeAgoAr(iso: string): string {
  const diffMin = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin < 1) return "الآن";
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const hr = Math.floor(diffMin / 60);
  if (hr < 24) return `منذ ${hr} ساعة`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "أمس";
  if (day < 7) return `منذ ${day} أيام`;
  return new Date(iso).toLocaleDateString("ar-SA", { day: "numeric", month: "short" });
}

function targetForNotif(n: Notif): { pathname: string; params?: any } | null {
  const t = n.type ?? "";
  const bookingId = n.data?.booking_id || n.data?.bookingId;
  if (t.startsWith("booking_") && bookingId) {
    if (t === "booking_completed" || t === "booking_cancelled") return { pathname: "/(tabs)/bookings" };
    return { pathname: "/tracking", params: { id: bookingId } };
  }
  if (t === "payment" && bookingId) return { pathname: "/tracking", params: { id: bookingId } };
  if (t === "offer" || t === "promo") return { pathname: "/(tabs)/home" };
  if (t === "review_request" && bookingId) return { pathname: "/(tabs)/bookings" };
  return null;
}

export default function NotificationsScreen() {
  const colors = useColors();
  const { session } = useAuth();
  const [filterMode, setFilterMode] = useState<"all" | "unread">("all");
  const [refreshing, setRefreshing] = useState(false);

  // ── Use centralized realtime store ─────────────────────────────────────────
  const { notifs: rawNotifs, loading, unreadCount, refresh, markAllRead: storeMarkAll } = useRealtimeNotifs();

  // Local optimistic state layered on top of store data
  const [localRead, setLocalRead] = useState<Set<string>>(new Set());

  const notifs: Notif[] = useMemo(
    () => rawNotifs.map((n: any) => ({ ...n, read: n.read || localRead.has(n.id) })),
    [rawNotifs, localRead],
  );

  const list = useMemo(
    () => (filterMode === "unread" ? notifs.filter((n) => !n.read) : notifs),
    [notifs, filterMode],
  );

  const { zeroOutBadge, refreshBadge } = useNotifBadge();

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const markAllRead = async () => {
    if (!session?.user || unreadCount === 0) return;
    // Optimistic
    setLocalRead(new Set(notifs.filter((n) => !n.read).map((n) => n.id)));
    zeroOutBadge();
    await storeMarkAll();
    refreshBadge();
  };

  const onPressItem = async (n: Notif) => {
    if (!n.read) {
      setLocalRead((prev) => new Set([...prev, n.id]));
      supabase.from("notifications").update({ read: true }).eq("id", n.id).then(() => refreshBadge());
    }
    const target = targetForNotif(n);
    if (target) router.push(target as any);
  };

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="الإشعارات" subtitle="آخر التحديثات والتنبيهات" />

      {/* Filter tabs — RTL */}
      <View style={styles.tabs}>
        <TouchableOpacity style={styles.markAll} onPress={markAllRead} disabled={unreadCount === 0}>
          <Text style={[styles.markAllT, { color: unreadCount === 0 ? colors.mutedForeground : colors.primary }]}>
            تعليم الكل كمقروء
          </Text>
        </TouchableOpacity>
        {[
          { id: "unread" as const, label: `غير مقروءة${unreadCount ? ` (${unreadCount})` : ""}` },
          { id: "all" as const, label: "الكل" },
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setFilterMode(t.id)}
            style={[styles.tab, filterMode === t.id && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.tabT, { color: filterMode === t.id ? "#FFF" : colors.foreground }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16, gap: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : list.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons name="bell-sleep-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyT, { color: colors.foreground }]}>لا توجد إشعارات</Text>
            <Text style={[styles.emptyS, { color: colors.mutedForeground }]}>
              {filterMode === "unread"
                ? "جميع إشعاراتك مقروءة ✓"
                : "ستظهر هنا أي تحديثات على طلباتك أو عروض جديدة."}
            </Text>
          </View>
        ) : (
          list.map((n) => {
            const m = notifMeta(n.type);
            const unread = !n.read;
            return (
              <TouchableOpacity
                key={n.id}
                activeOpacity={0.85}
                onPress={() => onPressItem(n)}
                style={[
                  styles.row,
                  { backgroundColor: colors.card },
                  unread && { borderColor: colors.primary + "44", borderWidth: 1 },
                ]}
              >
                {unread && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
                {/* RTL: icon on left, text on right */}
                <View style={[styles.iconBox, { backgroundColor: m.color + "22" }]}>
                  <Feather name={m.icon as any} size={18} color={m.color} />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, { color: colors.foreground }]}>{n.title}</Text>
                  {n.body ? (
                    <Text
                      style={[styles.rowBody, { color: colors.mutedForeground }]}
                      numberOfLines={2}
                    >
                      {n.body}
                    </Text>
                  ) : null}
                  <Text style={[styles.rowTime, { color: colors.mutedForeground }]}>
                    {timeAgoAr(n.created_at)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },

  // RTL tabs row: mark-all on left, filter pills on right
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: "#FFFFFF",
  },
  tabT: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  markAll: { marginEnd: "auto" },
  markAllT: { fontFamily: "Tajawal_500Medium", fontSize: 11 },

  // RTL row: icon on left end, text block on right
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    position: "absolute",
    top: 12,
    start: 12,
  },
  rowText: { flex: 1, alignItems: "flex-end" },
  rowTitle: { fontFamily: "Tajawal_700Bold", fontSize: 13, marginBottom: 3 },
  rowBody: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 4,
  },
  rowTime: { fontFamily: "Tajawal_500Medium", fontSize: 10 },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  empty: { padding: 40, borderRadius: 18, alignItems: "center", gap: 8, marginTop: 20 },
  emptyT: { fontFamily: "Tajawal_700Bold", fontSize: 14, marginTop: 8, textAlign: "center" },
  emptyS: { fontFamily: "Tajawal_500Medium", fontSize: 12, textAlign: "center" },
});
