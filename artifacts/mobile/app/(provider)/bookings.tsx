import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator , I18nManager} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const TABS = [
  { key: "new", label: "جديدة", statuses: ["pending"] },
  { key: "active", label: "نشطة", statuses: ["accepted", "on_the_way", "in_progress"] },
  { key: "done", label: "مكتملة", statuses: ["completed"] },
];

const statusColor = (s: string, c: any) => {
  if (s === "pending") return "#2F80ED";
  if (s === "accepted") return c.primary;
  if (s === "on_the_way") return "#F59E0B";
  if (s === "in_progress") return "#8B5CF6";
  if (s === "completed") return c.success;
  return c.mutedForeground;
};

const statusLabel = (s: string) => {
  return ({
    pending: "جديدة",
    accepted: "مقبولة",
    on_the_way: "في الطريق",
    in_progress: "جاري التنفيذ",
    completed: "مكتملة",
    cancelled: "ملغاة",
    rejected: "مرفوضة",
  } as Record<string, string>)[s] || s;
};

const fmtTime = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const t = d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  const same = d.toDateString() === new Date().toDateString();
  return same ? `اليوم ${t}` : d.toLocaleDateString("ar-SA", { day: "numeric", month: "short" }) + ` ${t}`;
};

export default function ProviderBookings() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { session } = useAuth();
  const [tab, setTab] = useState(0);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("bookings")
      .select("id, status, total, scheduled_at, services(title_ar), profiles!bookings_user_id_fkey(full_name), addresses(district, city, street)")
      .eq("provider_id", session.user.id)
      .order("created_at", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filtered = useMemo(() => {
    const t = TABS[tab];
    return rows.filter((r) => t.statuses.includes(r.status));
  }, [rows, tab]);

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()}><Feather name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} size={22} color={colors.foreground} /></TouchableOpacity>
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text style={[styles.hT, { color: colors.foreground }]}>طلباتي</Text>
          <Text style={[styles.hS, { color: colors.mutedForeground }]}>إدارة جميع الطلبات</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.tabs}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={t.key} onPress={() => setTab(i)} style={[styles.tab, tab === i && { backgroundColor: colors.primary }]}>
            <Text style={[styles.tabT, { color: tab === i ? "#FFF" : colors.foreground }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 130, paddingHorizontal: 16, gap: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ padding: 40, alignItems: "center", gap: 10 }}>
            <MaterialCommunityIcons name="clipboard-list-outline" size={56} color={colors.mutedForeground} />
            <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 14, color: colors.foreground }}>لا توجد طلبات في هذه الفئة</Text>
          </View>
        ) : (
          filtered.map((o) => {
            const stColor = statusColor(o.status, colors);
            const addr = [o.addresses?.district, o.addresses?.city].filter(Boolean).join("، ") || o.addresses?.street || "—";
            return (
              <TouchableOpacity key={o.id} style={[styles.card, { backgroundColor: colors.card }]} onPress={() => router.push(`/(provider)/booking-details?id=${o.id}` as any)} activeOpacity={0.92}>
                <View style={styles.cardTop}>
                  <Text style={[styles.cardT, { color: colors.foreground }]}>{o.services?.title_ar || "خدمة"}</Text>
                  <View style={[styles.stBadge, { backgroundColor: stColor + "22" }]}>
                    <Text style={[styles.stT, { color: stColor }]}>{statusLabel(o.status)}</Text>
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={{ gap: 6 }}>
                  <View style={styles.infoRow}>
                    <Feather name="user" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.infoV, { color: colors.foreground }]}>{o.profiles?.full_name || "عميل"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Feather name="clock" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.infoV, { color: colors.foreground }]}>{fmtTime(o.scheduled_at)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.infoV, { color: colors.foreground }]} numberOfLines={1}>{addr}</Text>
                  </View>
                </View>
                <View style={styles.cardFoot}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.priceV, { color: colors.primary }]}>{o.total} ر.س</Text>
                  </View>
                  <TouchableOpacity style={[styles.primBtn, { backgroundColor: colors.primary }]} onPress={() => router.push(`/(provider)/booking-details?id=${o.id}` as any)}>
                    <Text style={styles.primT}>عرض التفاصيل</Text>
                  </TouchableOpacity>
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
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 12, gap: 10 },
  hT: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  hS: { fontFamily: "Tajawal_400Regular", fontSize: 11 },
  tabs: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 100, alignItems: "center", backgroundColor: "#FFFFFF" },
  tabT: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  card: { padding: 14, borderRadius: 18 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  cardT: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  stBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100 },
  stT: { fontFamily: "Tajawal_700Bold", fontSize: 10 },
  divider: { height: 1, marginBottom: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoV: { fontFamily: "Tajawal_500Medium", fontSize: 11, flex: 1 },
  cardFoot: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  primBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 100 },
  primT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 11 },
  priceV: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
});
