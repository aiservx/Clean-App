import React, { useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Image, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { useRealtimeBookings } from "@/lib/realtimeStore";
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

  // ── Use centralized realtime store (no more individual subscription) ──────
  const { bookings, loading, refresh } = useRealtimeBookings();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    if (filter === "all")       return bookings;
    if (filter === "active")    return bookings.filter(r => ["pending", "accepted", "on_the_way", "in_progress"].includes(r.status));
    if (filter === "completed") return bookings.filter(r => r.status === "completed");
    if (filter === "cancelled") return bookings.filter(r => r.status === "cancelled");
    return bookings;
  }, [bookings, filter]);

  const reorder = (serviceTitle: string) => {
    Alert.alert("إعادة الطلب", `هل تريد إعادة طلب "${serviceTitle}"؟`, [
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
      {/* Header */}
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
        {/* Filter pills – RTL scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
          directionalLockEnabled
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[
                  styles.filterPill,
                  { backgroundColor: active ? colors.primary : colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.filterText, { color: active ? "#FFFFFF" : colors.foreground }]}>
                  {f.label}
                </Text>
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
                <TouchableOpacity
                  onPress={() => router.push("/services")}
                  style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                >
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
              const isCompleted = item.status === "completed";

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.bookingCard, { backgroundColor: colors.card }]}
                  activeOpacity={0.92}
                  onPress={() => router.push({ pathname: "/booking-details", params: { id: item.id } } as any)}
                >
                  {/* Card header – RTL: status badge on left, title on right */}
                  <View style={styles.cardHeader}>
                    <Text
                      style={[styles.serviceName, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {item.service_title}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: sColor + "20" }]}>
                      <Text style={[styles.statusText, { color: sColor }]}>{sLabel}</Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  {/* Provider + price row */}
                  <View style={styles.cardContent}>
                    <View style={styles.cleanerInfo}>
                      <Image
                        source={
                          item.provider_avatar
                            ? { uri: item.provider_avatar }
                            : require("@/assets/images/default-avatar.png")
                        }
                        style={styles.cleanerAvatar}
                      />
                      <View style={styles.textWrap}>
                        <Text style={[styles.cleanerName, { color: colors.foreground }]}>
                          {item.provider_name || "بانتظار التخصيص"}
                        </Text>
                        <Text style={[styles.bookingDate, { color: colors.mutedForeground }]}>
                          {fmtDate(item.scheduled_at)}
                        </Text>
                        <View style={styles.addrRow}>
                          <Feather name="map-pin" size={10} color={colors.mutedForeground} />
                          <Text style={[styles.bookingDate, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {item.addr_text}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.priceWrap}>
                      <Text style={[styles.priceValue, { color: colors.primary }]}>{item.total} ر.س</Text>
                      <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>الإجمالي</Text>
                    </View>
                  </View>

                  {/* Footer actions – RTL */}
                  <View style={styles.cardFooter}>
                    {isActive ? (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                        onPress={() => router.push({ pathname: "/tracking", params: { id: item.id } } as any)}
                      >
                        <Feather name="navigation" size={13} color="#FFF" />
                        <Text style={[styles.actionBtnText, { color: "#FFF" }]}>تتبع الطلب</Text>
                      </TouchableOpacity>
                    ) : isCompleted ? (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: "#F59E0B" }]}
                        onPress={() => router.push({ pathname: "/rating", params: { bookingId: item.id } } as any)}
                      >
                        <Feather name="star" size={13} color="#FFF" />
                        <Text style={[styles.actionBtnText, { color: "#FFF" }]}>تقييم الخدمة</Text>
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
                      onPress={() => reorder(item.service_title)}
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

  // RTL filter pills – row-reverse so first pill is on the right
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 14,
    paddingVertical: 4,
    flexDirection: "row",
  },
  filterPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterText: { fontFamily: "Tajawal_600SemiBold", fontSize: 14 },

  listContainer: { paddingHorizontal: 16, gap: 16 },

  bookingCard: {
    borderRadius: 24,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  // RTL card header: title on right, badge on left
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  serviceName: { fontFamily: "Tajawal_700Bold", fontSize: 15, flex: 1 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100 },
  statusText: { fontFamily: "Tajawal_600SemiBold", fontSize: 11 },

  divider: { height: 1, marginBottom: 14 },

  // RTL content: avatar on right, price on left
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cleanerInfo: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  cleanerAvatar: { width: 48, height: 48, borderRadius: 24 },
  textWrap: { flex: 1 },
  cleanerName: { fontFamily: "Tajawal_700Bold", fontSize: 13, marginBottom: 2 },
  bookingDate: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  addrRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },

  priceWrap: { alignItems: "center", marginStart: 8 },
  priceValue: { fontFamily: "Tajawal_700Bold", fontSize: 17 },
  priceLabel: { fontFamily: "Tajawal_500Medium", fontSize: 10 },

  // RTL footer: secondary action on left, primary on right
  cardFooter: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1.4,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  actionBtnText: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  reorderBtn: { flex: 1, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  reorderBtnText: { fontFamily: "Tajawal_600SemiBold", fontSize: 12 },

  emptyCard: { padding: 32, borderRadius: 20, alignItems: "center", gap: 8 },
  emptyTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16, marginTop: 8, textAlign: "center" },
  emptySub: { fontFamily: "Tajawal_500Medium", fontSize: 12, textAlign: "center", marginBottom: 8 },
  emptyBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 100, marginTop: 4 },
});
