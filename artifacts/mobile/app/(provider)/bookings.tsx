import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, I18nManager,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useRealtimeEvents } from "@/lib/realtimeStore";

// ── Constants ────────────────────────────────────────────────────────────────
const TABS = [
  { key: "new",       label: "جديدة",     statuses: ["pending"],                                          icon: "bell-ring",        color: "#2F80ED" },
  { key: "scheduled", label: "مجدولة",    statuses: [] as string[],                                       icon: "calendar-clock",   color: "#F59E0B" },
  { key: "active",    label: "نشطة",      statuses: ["accepted", "on_the_way", "arrived", "started", "in_progress"], icon: "progress-clock", color: "#7C3AED" },
  { key: "done",      label: "مكتملة",    statuses: ["completed"],                                        icon: "check-circle",     color: "#16C47F" },
];

const STATUS_COLOR: Record<string, string> = {
  pending:     "#2F80ED",
  accepted:    "#7C3AED",
  on_the_way:  "#F59E0B",
  arrived:     "#F59E0B",
  started:     "#8B5CF6",
  in_progress: "#8B5CF6",
  completed:   "#16C47F",
  cancelled:   "#EF4444",
  rejected:    "#EF4444",
};

const STATUS_AR: Record<string, string> = {
  pending:     "جديدة",
  accepted:    "مقبولة",
  on_the_way:  "في الطريق",
  arrived:     "وصل للموقع",
  started:     "بدأ العمل",
  in_progress: "جاري التنفيذ",
  completed:   "مكتملة",
  cancelled:   "ملغاة",
  rejected:    "مرفوضة",
};

const fmtTime = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const t = d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  const same = d.toDateString() === new Date().toDateString();
  if (same) return `اليوم ${t}`;
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `أمس ${t}`;
  return d.toLocaleDateString("ar-SA", { day: "numeric", month: "short" }) + ` ${t}`;
};

// ── RTL helpers ──────────────────────────────────────────────────────────────
const rowDir  = I18nManager.isRTL ? ("row" as const) : ("row-reverse" as const);
const colAlign = I18nManager.isRTL ? ("flex-start" as const) : ("flex-end" as const);

// ── Component ────────────────────────────────────────────────────────────────
export default function ProviderBookings() {
  const insets  = useSafeAreaInsets();
  const colors  = useColors();
  const { session } = useAuth();
  const [tab, setTab]           = useState(0);
  const [rows, setRows]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    const { data } = await supabase
      .from("bookings")
      .select("id, status, total, scheduled_at, services(title_ar), profiles!bookings_user_id_fkey(full_name), addresses(district, city, street)")
      .eq("provider_id", session.user.id)
      .order("created_at", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  useRealtimeEvents((event) => {
    if (["new_booking", "provider_booking_changed", "provider_order_updated"].includes(event.type)) {
      load();
    }
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filtered = useMemo(() => {
    const t = TABS[tab];
    if (t.key === "scheduled") {
      const now = new Date().toISOString();
      return rows.filter(
        (r) =>
          ["pending", "accepted"].includes(r.status) &&
          r.scheduled_at != null &&
          r.scheduled_at > now,
      );
    }
    return rows.filter((r) => t.statuses.includes(r.status));
  }, [rows, tab]);

  // Counts per tab for badges
  const counts = useMemo(() => {
    const now = new Date().toISOString();
    return TABS.map((t) => {
      if (t.key === "scheduled") {
        return rows.filter(
          (r) =>
            ["pending", "accepted"].includes(r.status) &&
            r.scheduled_at != null &&
            r.scheduled_at > now,
        ).length;
      }
      return rows.filter((r) => t.statuses.includes(r.status)).length;
    });
  }, [rows]);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>

      {/* ── Gradient Header ───────────────────────────────────────────── */}
      <LinearGradient
        colors={["#0D9488", "#0EA5E9"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 10 }]}
      >
        {/* Top row: back | title | spacer */}
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Feather name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>طلباتي</Text>
            <Text style={s.headerSub}>إدارة جميع الطلبات</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Quick stats row */}
        <View style={s.statsRow}>
          {TABS.map((t, i) => (
            <React.Fragment key={t.key}>
              <View style={s.statItem}>
                <Text style={s.statNum}>{counts[i]}</Text>
                <Text style={s.statLabel}>{t.label}</Text>
              </View>
              {i < TABS.length - 1 && <View style={s.statDivider} />}
            </React.Fragment>
          ))}
        </View>
      </LinearGradient>

      {/* ── Tab Pills ─────────────────────────────────────────────────── */}
      <View style={[s.tabsWrap, { backgroundColor: colors.background }]}>
        <View style={[s.tabs, { backgroundColor: colors.card }]}>
          {TABS.map((t, i) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(i)}
              style={[s.tabPill, tab === i && { backgroundColor: t.color }]}
              activeOpacity={0.85}
            >
              <Text style={[s.tabT, { color: tab === i ? "#FFF" : colors.mutedForeground }]}>{t.label}</Text>
              {counts[i] > 0 && (
                <View style={[s.tabBadge, { backgroundColor: tab === i ? "rgba(255,255,255,0.3)" : t.color + "25" }]}>
                  <Text style={[s.tabBadgeT, { color: tab === i ? "#FFF" : t.color }]}>{counts[i]}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── List ──────────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 80, paddingHorizontal: 16, paddingTop: 8, gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D9488" />}
      >
        {loading ? (
          <View style={{ padding: 60, alignItems: "center" }}>
            <ActivityIndicator color="#0D9488" size="large" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.emptyWrap}>
            <View style={[s.emptyIcon, { backgroundColor: TABS[tab].color + "15" }]}>
              <MaterialCommunityIcons name={TABS[tab].icon as any} size={40} color={TABS[tab].color} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.foreground }]}>لا توجد طلبات {TABS[tab].label}</Text>
            <Text style={[s.emptySub, { color: colors.mutedForeground }]}>ستظهر هنا طلبات العملاء عند وصولها</Text>
          </View>
        ) : (
          filtered.map((o) => {
            const stColor = STATUS_COLOR[o.status] || "#64748B";
            const addr = [o.addresses?.street, o.addresses?.district, o.addresses?.city].filter(Boolean).join("، ") || "—";
            const initials = (o.profiles?.full_name || "عميل").slice(0, 1);

            return (
              <TouchableOpacity
                key={o.id}
                style={[s.card, { backgroundColor: colors.card }]}
                onPress={() => router.push(`/(provider)/booking-details?id=${o.id}` as any)}
                activeOpacity={0.92}
              >
                {/* Colored accent bar on start edge */}
                <View style={[s.cardAccent, { backgroundColor: stColor }]} />

                <View style={s.cardInner}>
                  {/* Top: service title + status badge */}
                  <View style={s.cardTop}>
                    <View style={[s.statusBadge, { backgroundColor: stColor + "18" }]}>
                      <View style={[s.statusDot, { backgroundColor: stColor }]} />
                      <Text style={[s.statusT, { color: stColor }]}>{STATUS_AR[o.status] || o.status}</Text>
                    </View>
                    <Text style={[s.serviceT, { color: colors.foreground }]} numberOfLines={1}>
                      {o.services?.title_ar || "خدمة"}
                    </Text>
                  </View>

                  <View style={[s.divider, { backgroundColor: colors.border }]} />

                  {/* Client + time + address */}
                  <View style={s.infoBlock}>
                    <View style={s.infoRow}>
                      <View style={[s.avatarCircle, { backgroundColor: stColor + "20" }]}>
                        <Text style={[s.avatarT, { color: stColor }]}>{initials}</Text>
                      </View>
                      <View style={s.infoTexts}>
                        <Text style={[s.clientName, { color: colors.foreground }]}>
                          {o.profiles?.full_name || "عميل"}
                        </Text>
                        <View style={s.metaRow}>
                          <Feather name="clock" size={10} color={colors.mutedForeground} />
                          <Text style={[s.metaT, { color: colors.mutedForeground }]}>{fmtTime(o.scheduled_at)}</Text>
                        </View>
                        <View style={s.metaRow}>
                          <Feather name="map-pin" size={10} color={colors.mutedForeground} />
                          <Text style={[s.metaT, { color: colors.mutedForeground }]} numberOfLines={1}>{addr}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Footer: price + action */}
                  <View style={s.cardFoot}>
                    <View style={[s.priceBox, { backgroundColor: colors.background }]}>
                      <Text style={[s.priceV, { color: "#0D9488" }]}>{o.total}</Text>
                      <Text style={[s.priceUnit, { color: colors.mutedForeground }]}>ر.س</Text>
                    </View>
                    <TouchableOpacity
                      style={s.detailsBtn}
                      onPress={() => router.push(`/(provider)/booking-details?id=${o.id}` as any)}
                    >
                      <LinearGradient colors={["#0D9488", "#0EA5E9"]} style={s.detailsBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <Text style={s.detailsBtnT}>عرض التفاصيل</Text>
                        <Feather name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} size={13} color="#FFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { paddingHorizontal: 16, paddingBottom: 18 },
  headerRow: { flexDirection: rowDir, alignItems: "center", marginBottom: 18 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontFamily: "Tajawal_700Bold", fontSize: 20, color: "#FFF" },
  headerSub:   { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },

  // Stats
  statsRow: {
    flexDirection: rowDir,
    backgroundColor: "rgba(255,255,255,0.13)",
    borderRadius: 18, paddingVertical: 14,
  },
  statItem:   { flex: 1, alignItems: "center", gap: 3 },
  statNum:    { fontFamily: "Tajawal_700Bold", fontSize: 22, color: "#FFF" },
  statLabel:  { fontFamily: "Tajawal_400Regular", fontSize: 10, color: "rgba(255,255,255,0.82)", textAlign: "center" },
  statDivider:{ width: 1, backgroundColor: "rgba(255,255,255,0.22)", marginVertical: 4 },

  // Tabs
  tabsWrap: { paddingHorizontal: 16, paddingVertical: 12 },
  tabs: { flexDirection: rowDir, borderRadius: 16, padding: 4, gap: 4 },
  tabPill: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 10, borderRadius: 12, gap: 6,
  },
  tabT:      { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  tabBadge:  { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  tabBadgeT: { fontFamily: "Tajawal_700Bold", fontSize: 10 },

  // Empty
  emptyWrap:  { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyIcon:  { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontFamily: "Tajawal_700Bold", fontSize: 15 },
  emptySub:   { fontFamily: "Tajawal_400Regular", fontSize: 12, textAlign: "center" },

  // Card
  card: {
    borderRadius: 20, flexDirection: rowDir, overflow: "hidden",
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  cardAccent: { width: 5 },
  cardInner:  { flex: 1, padding: 14 },

  cardTop: { flexDirection: rowDir, alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  serviceT: { fontFamily: "Tajawal_700Bold", fontSize: 14, flex: 1, textAlign: I18nManager.isRTL ? "right" : "left" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  statusDot:   { width: 6, height: 6, borderRadius: 3 },
  statusT:     { fontFamily: "Tajawal_700Bold", fontSize: 10 },

  divider: { height: 1, marginBottom: 10 },

  infoBlock: { marginBottom: 12 },
  infoRow:   { flexDirection: rowDir, alignItems: "flex-start", gap: 10 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarT:      { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  infoTexts: { flex: 1, gap: 4 },
  clientName: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  metaRow:    { flexDirection: rowDir, alignItems: "center", gap: 4 },
  metaT:      { fontFamily: "Tajawal_400Regular", fontSize: 11, flex: 1 },

  cardFoot: { flexDirection: rowDir, alignItems: "center", gap: 10 },
  priceBox: { flexDirection: "row", alignItems: "baseline", gap: 3, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  priceV:   { fontFamily: "Tajawal_700Bold", fontSize: 18 },
  priceUnit:{ fontFamily: "Tajawal_500Medium", fontSize: 11 },
  detailsBtn: { flex: 1, borderRadius: 12, overflow: "hidden" },
  detailsBtnGrad: { flexDirection: rowDir, alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10 },
  detailsBtnT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 12 },
});
