import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Image, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import GuestEmpty from "@/components/GuestEmpty";
import FloatingTabBar from "@/components/FloatingTabBar";

type FilterKey = "all" | "active" | "completed" | "cancelled";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",       label: "الكل" },
  { key: "active",    label: "قيد التنفيذ" },
  { key: "completed", label: "مكتملة" },
  { key: "cancelled", label: "ملغاة" },
];

const STATUS_AR: Record<string, string> = {
  pending:     "قيد الانتظار",
  accepted:    "مقبول",
  on_the_way:  "في الطريق",
  in_progress: "جاري التنفيذ",
  completed:   "مكتمل",
  cancelled:   "ملغي",
};

const STATUS_COLOR: Record<string, string> = {
  pending:     "#F59E0B",
  accepted:    "#3B82F6",
  on_the_way:  "#8B5CF6",
  in_progress: "#2F80ED",
  completed:   "#16C47F",
  cancelled:   "#EF4444",
};

type BookingRow = {
  id: string;
  status: string;
  total: number;
  scheduled_at: string | null;
  created_at: string;
  service_title: string;
  provider_name: string | null;
  provider_avatar: string | null;
  addr_text: string;
};

const fmtDate = (iso: string | null) => {
  if (!iso) return "موعد مرن";
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const t = d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today.toDateString())     return `اليوم ${t}`;
  if (d.toDateString() === yesterday.toDateString()) return `أمس ${t}`;
  return `${d.toLocaleDateString("ar-SA", { day: "numeric", month: "short" })} ${t}`;
};

export default function BookingsScreen() {
  const { session } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<BookingRow[]>([]);

  const load = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, status, total, scheduled_at, created_at,
          services:service_id(title_ar),
          provider:provider_id(full_name, avatar_url),
          addresses:address_id(street, district, city)
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.log("[v0] bookings load error:", error.message);
        setRows([]);
      } else {
        const mapped: BookingRow[] = (data ?? []).map((b: any) => ({
          id: b.id,
          status: b.status || "pending",
          total: Number(b.total || 0),
          scheduled_at: b.scheduled_at,
          created_at: b.created_at,
          service_title: b.services?.title_ar || "خدمة تنظيف",
          provider_name: b.provider?.full_name || null,
          provider_avatar: b.provider?.avatar_url || null,
          addr_text: [b.addresses?.district, b.addresses?.city].filter(Boolean).join("، ") || b.addresses?.street || "—",
        }));
        setRows(mapped);
      }
    } catch (e) {
      console.log("[v0] bookings exception:", (e as Error).message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    load();
    if (!session?.user) return;
    const ch = supabase
      .channel(`user-bookings-${session.user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `user_id=eq.${session.user.id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, session]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await load(); setRefreshing(false);
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "active")    return rows.filter(r => ["pending", "accepted", "on_the_way", "in_progress"].includes(r.status));
    if (filter === "completed") return rows.filter(r => r.status === "completed");
    if (filter === "cancelled") return rows.filter(r => r.status === "cancelled");
    return rows;
  }, [rows, filter]);

  const reorder = async (b: BookingRow) => {
    Alert.alert("إعادة الطلب", `هل تريد إعادة طلب "${b.service_title}"؟`, [
      { text: "إلغاء", style: "cancel" },
      { text: "نعم", onPress: () => router.push("/services") },
    ]);
  };

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <GuestEmpty title="حجوزاتك" subtitle="سجّل دخولك لمتابعة حجوزاتك ومواعيدك" icon="calendar-clock" />
        <FloatingTabBar active="bookings" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>حجوزاتي</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>تابع جميع طلباتك</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.filterPill, { backgroundColor: active ? colors.primary : colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.filterText, { color: active ? "#FFFFFF" : colors.foreground }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={{ padding: 60, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 40 }}>
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={56} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد حجوزات</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                {filter === "all" ? "لم تقم بأي حجز بعد. ابدأ الآن من قائمة الخدمات." : "لا يوجد حجوزات بهذه الحالة."}
              </Text>
              {filter === "all" && (
                <TouchableOpacity onPress={() => router.push("/services")} style={[styles.emptyBtn, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 13 }}>تصفح الخدمات</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filtered.map((item) => {
              const sColor = STATUS_COLOR[item.status] || "#64748B";
              const sLabel = STATUS_AR[item.status] || item.status;
              const isActive = ["pending", "accepted", "on_the_way", "in_progress"].includes(item.status);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.bookingCard, { backgroundColor: colors.card }]}
                  activeOpacity={0.92}
                  onPress={() => router.push({ pathname: "/booking-details", params: { id: item.id } } as any)}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: sColor + "20" }]}>
                      <Text style={[styles.statusText, { color: sColor }]}>{sLabel}</Text>
                    </View>
                    <Text style={[styles.serviceName, { color: colors.foreground }]} numberOfLines={1}>{item.service_title}</Text>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  <View style={styles.cardContent}>
                    <View style={styles.cleanerInfo}>
                      <View style={styles.textWrap}>
                        <Text style={[styles.cleanerName, { color: colors.foreground }]}>
                          {item.provider_name || "بانتظار التخصيص"}
                        </Text>
                        <Text style={[styles.bookingDate, { color: colors.mutedForeground }]}>{fmtDate(item.scheduled_at)}</Text>
                        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 4, marginTop: 2 }}>
                          <Feather name="map-pin" size={10} color={colors.mutedForeground} />
                          <Text style={[styles.bookingDate, { color: colors.mutedForeground }]} numberOfLines={1}>{item.addr_text}</Text>
                        </View>
                      </View>
                      {item.provider_avatar ? (
                        <Image source={{ uri: item.provider_avatar }} style={styles.cleanerAvatar} />
                      ) : (
                        <View style={[styles.cleanerAvatar, { backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }]}>
                          <Feather name="user" size={20} color={colors.primary} />
                        </View>
                      )}
                    </View>

                    <View style={styles.priceWrap}>
                      <Text style={[styles.priceValue, { color: colors.primary }]}>{item.total} ر.س</Text>
                      <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>الإجمالي</Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    {isActive ? (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                        onPress={() => router.push({ pathname: "/tracking", params: { id: item.id } } as any)}
                      >
                        <Feather name="navigation" size={13} color="#FFF" />
                        <Text style={[styles.actionBtnText, { color: "#FFF" }]}>تتبع الطلب</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
                        onPress={() => router.push({ pathname: "/booking-details", params: { id: item.id } } as any)}
                      >
                        <Text style={[styles.actionBtnText, { color: colors.foreground }]}>عرض التفاصيل</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.reorderBtn, { backgroundColor: colors.primaryLight }]}
                      onPress={() => reorder(item)}
                    >
                      <Text style={[styles.reorderBtnText, { color: colors.primary }]}>إعادة طلب</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <FloatingTabBar active="bookings" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, marginBottom: 12, alignItems: "flex-end" },
  headerTitleContainer: { alignItems: "flex-end" },
  headerTitle: { fontFamily: "Tajawal_700Bold", fontSize: 22 },
  headerSubtitle: { fontFamily: "Tajawal_400Regular", fontSize: 14 },
  filtersScroll: { paddingHorizontal: 16, gap: 12, marginBottom: 14, paddingVertical: 4, flexDirection: "row-reverse" },
  filterPill: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100, borderWidth: 1,
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  filterText: { fontFamily: "Tajawal_600SemiBold", fontSize: 14 },
  listContainer: { paddingHorizontal: 16, gap: 16 },
  bookingCard: {
    borderRadius: 24, padding: 18,
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  cardHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10 },
  serviceName: { fontFamily: "Tajawal_700Bold", fontSize: 15, flex: 1, textAlign: "right" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100 },
  statusText: { fontFamily: "Tajawal_600SemiBold", fontSize: 11 },
  divider: { height: 1, marginBottom: 14 },
  cardContent: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cleanerInfo: { flexDirection: "row-reverse", alignItems: "center", gap: 12, flex: 1 },
  cleanerAvatar: { width: 48, height: 48, borderRadius: 24 },
  textWrap: { alignItems: "flex-end", flex: 1 },
  cleanerName: { fontFamily: "Tajawal_700Bold", fontSize: 13, marginBottom: 2 },
  bookingDate: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  priceWrap: { alignItems: "center", marginRight: 8 },
  priceValue: { fontFamily: "Tajawal_700Bold", fontSize: 17 },
  priceLabel: { fontFamily: "Tajawal_500Medium", fontSize: 10 },
  cardFooter: { flexDirection: "row", gap: 10, marginTop: 4 },
  actionBtn: { flex: 1.4, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row-reverse", gap: 6 },
  actionBtnText: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  reorderBtn: { flex: 1, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  reorderBtnText: { fontFamily: "Tajawal_600SemiBold", fontSize: 12 },
  emptyCard: { padding: 32, borderRadius: 20, alignItems: "center", gap: 8 },
  emptyTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16, marginTop: 8 },
  emptySub: { fontFamily: "Tajawal_500Medium", fontSize: 12, textAlign: "center", marginBottom: 8 },
  emptyBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 100, marginTop: 4 },
});
