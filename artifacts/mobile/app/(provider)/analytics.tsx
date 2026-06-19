import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, I18nManager, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Review = { rating: number; created_at: string };
type Booking = { status: string; total: number | null; created_at: string; scheduled_at: string | null };

const AR_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const AR_DAYS   = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

export default function ProviderAnalytics() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const load = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    const uid = session.user.id;
    setLoading(true);
    const [{ data: rv }, { data: bk }] = await Promise.all([
      supabase.from("reviews").select("rating, created_at").eq("provider_id", uid).order("created_at"),
      supabase.from("bookings").select("status, total, created_at, scheduled_at").eq("provider_id", uid).order("created_at"),
    ]);
    setReviews((rv || []) as Review[]);
    setBookings((bk || []) as Booking[]);
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => { load(); }, [load]);

  // ── Rating distribution ─────────────────────────────────────────────────
  const ratingDist = useMemo(() => {
    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => { const s = Math.round(r.rating); if (s >= 1 && s <= 5) dist[s]++; });
    const total = reviews.length || 1;
    return [5, 4, 3, 2, 1].map((star) => ({ star, count: dist[star], pct: Math.round((dist[star] / total) * 100) }));
  }, [reviews]);

  const avgRating = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  }, [reviews]);

  // ── Monthly earnings ────────────────────────────────────────────────────
  const monthlyEarnings = useMemo(() => {
    const map: Record<string, { label: string; earn: number }> = {};
    bookings.filter((b) => b.status === "completed" && b.total).forEach((b) => {
      const d = new Date(b.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { label: `${AR_MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, earn: 0 };
      map[key].earn += b.total ?? 0;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([, v]) => v);
  }, [bookings]);

  const maxEarning = useMemo(() => Math.max(...monthlyEarnings.map((m) => m.earn), 1), [monthlyEarnings]);

  // ── Completion rate ─────────────────────────────────────────────────────
  const completionRate = useMemo(() => {
    const done = bookings.filter((b) => b.status === "completed").length;
    const total = bookings.filter((b) => !["pending"].includes(b.status)).length;
    return total ? Math.round((done / total) * 100) : 0;
  }, [bookings]);

  // ── Best day of week ────────────────────────────────────────────────────
  const dayStats = useMemo(() => {
    const counts = new Array(7).fill(0);
    bookings.filter((b) => b.status === "completed").forEach((b) => {
      const d = new Date(b.scheduled_at || b.created_at).getDay();
      counts[d]++;
    });
    const maxDay = counts.indexOf(Math.max(...counts));
    return { dayName: AR_DAYS[maxDay], count: counts[maxDay] };
  }, [bookings]);

  // ── Best hour ──────────────────────────────────────────────────────────
  const bestHour = useMemo(() => {
    const counts = new Array(24).fill(0);
    bookings.filter((b) => b.status === "completed").forEach((b) => {
      const h = new Date(b.scheduled_at || b.created_at).getHours();
      counts[h]++;
    });
    const maxH = counts.indexOf(Math.max(...counts));
    return `${maxH}:00 – ${maxH + 1}:00`;
  }, [bookings]);

  const totalEarnings = useMemo(() => bookings.filter((b) => b.status === "completed").reduce((s, b) => s + (b.total ?? 0), 0), [bookings]);
  const completedCount = useMemo(() => bookings.filter((b) => b.status === "completed").length, [bookings]);

  const starColor = (star: number) => star >= 4 ? colors.success : star === 3 ? "#F59E0B" : "#EF4444";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>تحليلات أدائي</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadTxt, { color: colors.mutedForeground }]}>جاري تحليل بياناتك…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24, padding: 16 }} showsVerticalScrollIndicator={false}>

          {/* ── Summary KPIs ── */}
          <View style={styles.kpiRow}>
            {[
              { icon: "💰", label: "إجمالي الأرباح", value: `${totalEarnings.toLocaleString("ar-SA")} ر.س`, color: colors.success },
              { icon: "📋", label: "طلبات مكتملة", value: completedCount.toString(), color: colors.primary },
              { icon: "⭐", label: "متوسط التقييم", value: avgRating.toFixed(1), color: "#F59E0B" },
              { icon: "✅", label: "معدل الإتمام", value: `${completionRate}%`, color: colors.accent },
            ].map((k) => (
              <View key={k.label} style={[styles.kpiCard, { backgroundColor: colors.card }]}>
                <Text style={styles.kpiIcon}>{k.icon}</Text>
                <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
                <Text style={[styles.kpiLabel, { color: colors.mutedForeground }]}>{k.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Rating distribution ── */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>⭐ توزيع التقييمات ({reviews.length} تقييم)</Text>
            {reviews.length === 0 ? (
              <Text style={[styles.empty, { color: colors.mutedForeground }]}>لا توجد تقييمات بعد</Text>
            ) : (
              <>
                {/* Big avg */}
                <View style={styles.avgRow}>
                  <Text style={[styles.avgNum, { color: "#F59E0B" }]}>{avgRating.toFixed(1)}</Text>
                  <View>
                    <Text style={{ fontSize: 20 }}>{"⭐".repeat(Math.round(avgRating))}</Text>
                    <Text style={[styles.avgSub, { color: colors.mutedForeground }]}>من {reviews.length} تقييم</Text>
                  </View>
                </View>
                {ratingDist.map((d) => (
                  <View key={d.star} style={styles.ratingRow}>
                    <Text style={[styles.starLabel, { color: starColor(d.star) }]}>{d.star}★</Text>
                    <View style={[styles.barBg, { backgroundColor: colors.muted }]}>
                      <View style={[styles.barFill, { width: `${d.pct}%`, backgroundColor: starColor(d.star) }]} />
                    </View>
                    <Text style={[styles.pctLabel, { color: colors.mutedForeground }]}>{d.count}</Text>
                  </View>
                ))}
              </>
            )}
          </View>

          {/* ── Monthly earnings chart ── */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>💰 الأرباح الشهرية</Text>
            {monthlyEarnings.length === 0 ? (
              <Text style={[styles.empty, { color: colors.mutedForeground }]}>لا توجد أرباح بعد</Text>
            ) : (
              <View style={styles.chartWrap}>
                {monthlyEarnings.map((m) => {
                  const barH = Math.max(8, (m.earn / maxEarning) * 120);
                  return (
                    <View key={m.label} style={styles.chartBar}>
                      <Text style={[styles.barEarn, { color: colors.success }]}>
                        {m.earn > 999 ? `${Math.round(m.earn / 1000)}k` : m.earn}
                      </Text>
                      <View style={[styles.barCol, { height: barH, backgroundColor: colors.primary }]} />
                      <Text style={[styles.barMonth, { color: colors.mutedForeground }]}>{m.label}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* ── Best times ── */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>📅 أفضل أوقاتك</Text>
            <View style={styles.timesRow}>
              <View style={[styles.timeCard, { backgroundColor: colors.primaryLight }]}>
                <Text style={styles.timeIcon}>📆</Text>
                <Text style={[styles.timeValue, { color: colors.primary }]}>{dayStats.dayName}</Text>
                <Text style={[styles.timeSub, { color: colors.mutedForeground }]}>أكثر يوم طلبات ({dayStats.count})</Text>
              </View>
              <View style={[styles.timeCard, { backgroundColor: colors.accentLight }]}>
                <Text style={styles.timeIcon}>⏰</Text>
                <Text style={[styles.timeValue, { color: colors.accent }]}>{bestHour}</Text>
                <Text style={[styles.timeSub, { color: colors.mutedForeground }]}>ذروة الطلبات</Text>
              </View>
            </View>
          </View>

          {/* ── Completion rate visual ── */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>✅ معدل إتمام الطلبات</Text>
            <View style={styles.rateWrap}>
              <View style={[styles.rateBg, { backgroundColor: colors.muted }]}>
                <View style={[styles.rateFill, {
                  width: `${completionRate}%`,
                  backgroundColor: completionRate >= 80 ? colors.success : completionRate >= 60 ? "#F59E0B" : "#EF4444",
                }]} />
              </View>
              <Text style={[styles.ratePct, { color: completionRate >= 80 ? colors.success : "#F59E0B" }]}>
                {completionRate}%
              </Text>
            </View>
            <Text style={[styles.rateNote, { color: colors.mutedForeground }]}>
              {completionRate >= 80 ? "✨ أداء ممتاز! استمر هكذا" :
               completionRate >= 60 ? "💪 جيد — حاول تحسين الاستجابة" :
               "⚠️ يُنصح بتحسين معدل الإتمام"}
            </Text>
          </View>

        </ScrollView>
      )}
    </View>
  );
}

const rowDir = I18nManager.isRTL ? ("row" as const) : ("row-reverse" as const);

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadTxt: { fontFamily: "Tajawal_400Regular", fontSize: 14 },
  header: {
    flexDirection: rowDir, alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Tajawal_700Bold", fontSize: 18 },
  kpiRow: { flexDirection: rowDir, flexWrap: "wrap", gap: 10, marginBottom: 14 },
  kpiCard: {
    flex: 1, minWidth: "45%", borderRadius: 16, padding: 14, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  kpiIcon: { fontSize: 22, marginBottom: 4 },
  kpiValue: { fontFamily: "Tajawal_700Bold", fontSize: 20 },
  kpiLabel: { fontFamily: "Tajawal_400Regular", fontSize: 11, marginTop: 2 },
  section: {
    borderRadius: 20, padding: 16, marginBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  sectionTitle: { fontFamily: "Tajawal_700Bold", fontSize: 15, marginBottom: 14 },
  empty: { fontFamily: "Tajawal_400Regular", fontSize: 13, textAlign: "center", paddingVertical: 16 },
  avgRow: { flexDirection: rowDir, alignItems: "center", gap: 16, marginBottom: 16 },
  avgNum: { fontFamily: "Tajawal_700Bold", fontSize: 52 },
  avgSub: { fontFamily: "Tajawal_400Regular", fontSize: 12, marginTop: 2 },
  ratingRow: { flexDirection: rowDir, alignItems: "center", gap: 8, marginBottom: 8 },
  starLabel: { fontFamily: "Tajawal_700Bold", fontSize: 13, width: 28, textAlign: "center" },
  barBg: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
  pctLabel: { fontFamily: "Tajawal_400Regular", fontSize: 12, width: 24, textAlign: "center" },
  chartWrap: { flexDirection: rowDir, alignItems: "flex-end", gap: 8, paddingTop: 8 },
  chartBar: { flex: 1, alignItems: "center", gap: 4 },
  barEarn: { fontFamily: "Tajawal_700Bold", fontSize: 9 },
  barCol: { width: "100%", borderRadius: 6 },
  barMonth: { fontFamily: "Tajawal_400Regular", fontSize: 9, textAlign: "center" },
  timesRow: { flexDirection: rowDir, gap: 12 },
  timeCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: "center" },
  timeIcon: { fontSize: 24, marginBottom: 6 },
  timeValue: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  timeSub: { fontFamily: "Tajawal_400Regular", fontSize: 11, marginTop: 4, textAlign: "center" },
  rateWrap: { flexDirection: rowDir, alignItems: "center", gap: 12, marginBottom: 8 },
  rateBg: { flex: 1, height: 12, borderRadius: 6, overflow: "hidden" },
  rateFill: { height: 12, borderRadius: 6 },
  ratePct: { fontFamily: "Tajawal_700Bold", fontSize: 18, width: 48, textAlign: "center" },
  rateNote: { fontFamily: "Tajawal_400Regular", fontSize: 12 },
});
