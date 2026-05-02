import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useNotifBadge } from "@/lib/notifBadge";

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

// Map a notification type to an icon + color theme
function meta(type: string | null): { icon: string; color: string; pack: "feather" | "mdi" } {
  switch (type) {
    case "booking_created":
      return { icon: "shopping-bag", color: "#16C47F", pack: "feather" };
    case "booking_accepted":
      return { icon: "user-check", color: "#2F80ED", pack: "feather" };
    case "booking_on_way":
      return { icon: "navigation-2", color: "#16C47F", pack: "feather" };
    case "booking_started":
      return { icon: "play-circle", color: "#8B5CF6", pack: "feather" };
    case "booking_completed":
      return { icon: "check-circle", color: "#22C55E", pack: "feather" };
    case "booking_cancelled":
      return { icon: "x-circle", color: "#EF4444", pack: "feather" };
    case "payment":
      return { icon: "credit-card", color: "#8B5CF6", pack: "feather" };
    case "offer":
    case "promo":
      return { icon: "gift", color: "#F59E0B", pack: "feather" };
    case "review_request":
      return { icon: "star", color: "#EC4899", pack: "feather" };
    case "referral":
      return { icon: "users", color: "#16C47F", pack: "feather" };
    default:
      return { icon: "bell", color: "#64748B", pack: "feather" };
  }
}

function timeAgoAr(iso: string): string {
  const d = new Date(iso).getTime();
  const diffMin = Math.max(0, Math.floor((Date.now() - d) / 60000));
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
    if (t === "booking_completed" || t === "booking_cancelled") {
      return { pathname: "/(tabs)/bookings" };
    }
    return { pathname: "/tracking", params: { id: bookingId } };
  }
  if (t === "payment" && bookingId) {
    return { pathname: "/tracking", params: { id: bookingId } };
  }
  if (t === "offer" || t === "promo") {
    return { pathname: "/(tabs)/home" };
  }
  if (t === "review_request" && bookingId) {
    return { pathname: "/(tabs)/bookings" };
  }
  return null;
}

export default function NotificationsScreen() {
  const colors = useColors();
  const { session } = useAuth();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from("notifications")
        .select("id, user_id, type, title, body, data, read, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setItems((data ?? []) as Notif[]);
    } catch (e) {
      console.log("[v0] notifications load failed:", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    load();
    if (!session?.user) return;
    const topic = `notif-cust-${session.user.id}-${Math.random().toString(36).slice(2, 8)}`;
    const ch = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${session.user.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const list = useMemo(
    () => (filter === "unread" ? items.filter((n) => !n.read) : items),
    [items, filter],
  );

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const { zeroOutBadge, refreshBadge } = useNotifBadge();

  const markAllRead = async () => {
    if (!session?.user || unreadCount === 0) return;
    const unreadIds = items.filter((n) => !n.read).map((n) => n.id);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    zeroOutBadge();
    if (unreadIds.length > 0) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .in("id", unreadIds);
      refreshBadge();
    }
  };

  const onPressItem = async (n: Notif) => {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
      refreshBadge();
    }
    const target = targetForNotif(n);
    if (target) router.push(target as any);
  };

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="الإشعارات" subtitle="آخر التحديثات والتنبيهات" />

      <View style={styles.tabs}>
        {[
          { id: "all" as const, label: "الكل" },
          { id: "unread" as const, label: `غير مقروءة${unreadCount ? ` (${unreadCount})` : ""}` },
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setFilter(t.id)}
            style={[styles.tab, filter === t.id && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.tabT, { color: filter === t.id ? "#FFF" : colors.foreground }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.markAll} onPress={markAllRead} disabled={unreadCount === 0}>
          <Text style={[styles.markAllT, { color: unreadCount === 0 ? colors.mutedForeground : colors.primary }]}>تعليم الكل كمقروء</Text>
        </TouchableOpacity>
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
            <Text style={[styles.emptyS, { color: colors.mutedForeground }]}>ستظهر هنا أي تحديثات على طلباتك أو عروض جديدة.</Text>
          </View>
        ) : (
          list.map((n) => {
            const m = meta(n.type);
            const unread = !n.read;
            return (
              <TouchableOpacity
                key={n.id}
                activeOpacity={0.85}
                onPress={() => onPressItem(n)}
                style={[styles.row, { backgroundColor: colors.card, borderColor: unread ? colors.primary + "33" : "transparent", borderWidth: 1 }]}
              >
                {unread && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, { color: colors.foreground }]}>{n.title}</Text>
                  {n.body ? (
                    <Text style={[styles.rowBody, { color: colors.mutedForeground }]} numberOfLines={2}>{n.body}</Text>
                  ) : null}
                  <Text style={[styles.rowTime, { color: colors.mutedForeground }]}>{timeAgoAr(n.created_at)}</Text>
                </View>
                <View style={[styles.iconBox, { backgroundColor: m.color + "22" }]}>
                  <Feather name={m.icon as any} size={18} color={m.color} />
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
  tabs: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 12, alignItems: "center" },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, backgroundColor: "#FFFFFF" },
  tabT: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  markAll: { marginRight: "auto" },
  markAllT: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  row: { flexDirection: "row-reverse", alignItems: "center", padding: 12, borderRadius: 16, gap: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, position: "absolute", top: 12, left: 12 },
  rowText: { flex: 1, alignItems: "flex-end" },
  rowTitle: { fontFamily: "Tajawal_700Bold", fontSize: 13, marginBottom: 2 },
  rowBody: { fontFamily: "Tajawal_400Regular", fontSize: 11, textAlign: "right", lineHeight: 16 },
  rowTime: { fontFamily: "Tajawal_500Medium", fontSize: 10, marginTop: 4 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  empty: { padding: 40, borderRadius: 18, alignItems: "center", gap: 8, marginTop: 20 },
  emptyT: { fontFamily: "Tajawal_700Bold", fontSize: 14, marginTop: 8 },
  emptyS: { fontFamily: "Tajawal_500Medium", fontSize: 12, textAlign: "center" },
});
