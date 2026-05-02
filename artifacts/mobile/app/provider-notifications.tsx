import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { Feather } from "@expo/vector-icons";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Notif = {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  created_at: string;
};

function metaForType(type: string): { icon: string; color: string } {
  const map: Record<string, { icon: string; color: string }> = {
    booking_created:   { icon: "shopping-bag", color: "#16C47F" },
    booking_accepted:  { icon: "check-circle",  color: "#3B82F6" },
    booking_completed: { icon: "award",          color: "#16C47F" },
    payment:           { icon: "dollar-sign",    color: "#2F80ED" },
    review_received:   { icon: "star",           color: "#F59E0B" },
    review_request:    { icon: "star",           color: "#F59E0B" },
    promo:             { icon: "gift",           color: "#EC4899" },
    referral:          { icon: "users",          color: "#8B5CF6" },
    alert:             { icon: "alert-circle",   color: "#EF4444" },
  };
  return map[type] ?? { icon: "bell", color: "#64748B" };
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "الآن";
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  const d = Math.floor(h / 24);
  if (d === 1) return "أمس";
  return `منذ ${d} أيام`;
}

export default function ProviderNotifications() {
  const colors = useColors();
  const { session } = useAuth();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    const { data } = await supabase
      .from("notifications")
      .select("id, title, body, type, read, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setNotifs(data as Notif[]);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    load();
    if (!session?.user) return;
    const topic = `prov-notifs-${session.user.id}-${Math.random().toString(36).slice(2, 8)}`;
    const ch = supabase
      .channel(topic)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${session.user.id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, session]);

  const onRefresh = async () => {
    setRefreshing(true); await load(); setRefreshing(false);
  };

  const markAllRead = async () => {
    if (!session?.user) return;
    const unreadIds = notifs.filter((n) => !n.read).map((n) => n.id);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    if (unreadIds.length > 0) {
      await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    }
  };

  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const list = filter === "unread" ? notifs.filter((n) => !n.read) : notifs;

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="الإشعارات" subtitle="آخر التحديثات والطلبات" />
      <View style={styles.tabs}>
        {(["all", "unread"] as const).map((k) => (
          <TouchableOpacity key={k} onPress={() => setFilter(k)} style={[styles.tab, filter === k && { backgroundColor: colors.primary }]}>
            <Text style={[styles.tabT, { color: filter === k ? "#FFF" : colors.foreground }]}>
              {k === "all" ? "الكل" : "غير مقروءة"}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={{ marginRight: "auto" }} onPress={markAllRead}>
          <Text style={[styles.markAll, { color: colors.primary }]}>تعليم الكل كمقروء</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10, flexGrow: list.length === 0 ? 1 : undefined }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {list.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 }}>
              <Feather name="bell-off" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyT, { color: colors.foreground }]}>لا توجد إشعارات</Text>
              <Text style={[styles.emptyS, { color: colors.mutedForeground }]}>ستظهر هنا أحداث طلباتك وأرباحك وتقييماتك</Text>
            </View>
          ) : list.map((n) => {
            const { icon, color } = metaForType(n.type);
            return (
              <TouchableOpacity key={n.id} onPress={() => markOne(n.id)} activeOpacity={0.8} style={[styles.row, { backgroundColor: colors.card }]}>
                {!n.read && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
                <View style={styles.text}>
                  <Text style={[styles.t, { color: colors.foreground }]}>{n.title}</Text>
                  <Text style={[styles.b, { color: colors.mutedForeground }]} numberOfLines={2}>{n.body}</Text>
                  <Text style={[styles.tm, { color: colors.mutedForeground }]}>{relativeTime(n.created_at)}</Text>
                </View>
                <View style={[styles.iconBox, { backgroundColor: color + "22" }]}>
                  <Feather name={icon as any} size={18} color={color} />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  tabs: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 12, alignItems: "center" },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, backgroundColor: "#FFF" },
  tabT: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  markAll: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  row: { flexDirection: "row-reverse", alignItems: "center", borderRadius: 16, padding: 14, gap: 10, position: "relative" },
  dot: { position: "absolute", top: 14, left: 14, width: 8, height: 8, borderRadius: 4 },
  text: { flex: 1, alignItems: "flex-end", gap: 2 },
  t: { fontFamily: "Tajawal_700Bold", fontSize: 13, textAlign: "right" },
  b: { fontFamily: "Tajawal_400Regular", fontSize: 11, textAlign: "right" },
  tm: { fontFamily: "Tajawal_400Regular", fontSize: 10, marginTop: 2 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  emptyT: { fontFamily: "Tajawal_700Bold", fontSize: 16, marginTop: 16, textAlign: "center" },
  emptyS: { fontFamily: "Tajawal_400Regular", fontSize: 12, marginTop: 6, textAlign: "center" },
});
