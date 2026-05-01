import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Tx = {
  id: string;
  title: string;
  amount: number;
  date: string;
  inc: boolean;
  status: string;
  icon: string;
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const t = d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `اليوم ${t}`;
  if (d.toDateString() === yesterday.toDateString()) return `أمس ${t}`;
  return d.toLocaleDateString("ar-SA", { day: "numeric", month: "short" });
};

export default function ProviderWallet() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState({ avail: 0, monthly: 0, pending: 0, total: 0, today: 0 });
  const [tx, setTx] = useState<Tx[]>([]);
  const [stats, setStats] = useState({ todayJobs: 0, accept: 0 });

  const load = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    const uid = session.user.id;
    const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0, 0, 0, 0);
    const startDay = new Date(); startDay.setHours(0, 0, 0, 0);

    const [{ data: completed }, { data: payouts }, { data: pendingBookings }, { data: totalAccepted }] = await Promise.all([
      supabase.from("bookings").select("id, total, created_at, status, services(title_ar)").eq("provider_id", uid).eq("status", "completed").order("created_at", { ascending: false }),
      supabase.from("payouts").select("*").eq("provider_id", uid).order("created_at", { ascending: false }),
      supabase.from("bookings").select("total").eq("provider_id", uid).in("status", ["accepted", "on_the_way", "in_progress"]),
      supabase.from("bookings").select("status, created_at").eq("provider_id", uid),
    ]);

    const completedRows = completed ?? [];
    const payoutRows = payouts ?? [];

    const grossEarnings = completedRows.reduce((s, r: any) => s + Number(r.total || 0) * 0.85, 0);
    const totalPaidOut = payoutRows.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const totalPendingPayout = payoutRows.filter((p: any) => p.status === "pending").reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const avail = Math.max(0, grossEarnings - totalPaidOut - totalPendingPayout);

    const monthly = completedRows.filter((r: any) => new Date(r.created_at) >= startMonth).reduce((s: number, r: any) => s + Number(r.total || 0) * 0.85, 0);
    const today = completedRows.filter((r: any) => new Date(r.created_at) >= startDay).reduce((s: number, r: any) => s + Number(r.total || 0) * 0.85, 0);
    const pendingFromActive = (pendingBookings ?? []).reduce((s: number, r: any) => s + Number(r.total || 0) * 0.85, 0);

    setBalance({
      avail,
      monthly,
      pending: pendingFromActive + totalPendingPayout,
      total: grossEarnings,
      today,
    });

    const todayJobs = (totalAccepted ?? []).filter((r: any) => new Date(r.created_at) >= startDay).length;
    const allCount = (totalAccepted ?? []).length;
    const acceptedCount = (totalAccepted ?? []).filter((r: any) => !["pending", "rejected"].includes(r.status)).length;
    setStats({
      todayJobs,
      accept: allCount > 0 ? Math.round((acceptedCount / allCount) * 100) : 0,
    });

    const txList: Tx[] = [
      ...completedRows.slice(0, 20).map((r: any) => ({
        id: `b-${r.id}`,
        title: r.services?.title_ar || "خدمة",
        amount: Number(r.total) * 0.85,
        date: fmtDate(r.created_at),
        inc: true,
        status: "مكتمل",
        icon: "arrow-down",
      })),
      ...payoutRows.slice(0, 20).map((p: any) => ({
        id: `p-${p.id}`,
        title: p.status === "paid" ? "سحب — تم التحويل" : p.status === "failed" ? "سحب — فشل" : "طلب سحب — قيد المراجعة",
        amount: Number(p.amount),
        date: fmtDate(p.created_at),
        inc: false,
        status: p.status === "paid" ? "تم التحويل" : p.status === "failed" ? "فشل" : "قيد المراجعة",
        icon: "arrow-up",
      })),
    ].sort((a, b) => (a.date < b.date ? 1 : -1));

    setTx(txList);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-right" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.hT, { color: colors.foreground }]}>المحفظة</Text>
        <TouchableOpacity onPress={() => router.push("/statement")}>
          <Feather name="file-text" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.balCard}>
          <Text style={styles.balL}>الرصيد المتاح للسحب</Text>
          <Text style={styles.balV}>{balance.avail.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} <Text style={{ fontSize: 16 }}>ر.س</Text></Text>
          <View style={styles.balRow}>
            <View style={styles.balItem}>
              <Text style={styles.balIL}>هذا الشهر</Text>
              <Text style={styles.balIV}>{balance.monthly.toLocaleString("ar-SA", { maximumFractionDigits: 0 })} ر.س</Text>
            </View>
            <View style={styles.balItem}>
              <Text style={styles.balIL}>المعلق</Text>
              <Text style={styles.balIV}>{balance.pending.toLocaleString("ar-SA", { maximumFractionDigits: 0 })} ر.س</Text>
            </View>
            <View style={styles.balItem}>
              <Text style={styles.balIL}>الإجمالي</Text>
              <Text style={styles.balIV}>{balance.total.toLocaleString("ar-SA", { maximumFractionDigits: 0 })} ر.س</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.actions, { paddingHorizontal: 16 }]}>
          <TouchableOpacity
            style={[styles.actBtn, { backgroundColor: balance.avail > 0 ? colors.primary : colors.muted }]}
            onPress={() => balance.avail > 0 ? router.push("/withdraw") : null}
            disabled={balance.avail <= 0}
          >
            <Feather name="arrow-up" size={16} color={balance.avail > 0 ? "#FFF" : colors.mutedForeground} />
            <Text style={[styles.actT, { color: balance.avail > 0 ? "#FFF" : colors.mutedForeground }]}>سحب الأرباح</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actBtn, { backgroundColor: colors.card }]} onPress={() => router.push("/statement")}>
            <Feather name="file-text" size={16} color={colors.foreground} />
            <Text style={[styles.actT, { color: colors.foreground }]}>كشف حساب</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.miniRow}>
          {[
            { v: balance.today.toLocaleString("ar-SA", { maximumFractionDigits: 0 }), l: "أرباح اليوم", c: "#16C47F", i: "trending-up" },
            { v: String(stats.todayJobs), l: "طلبات اليوم", c: "#2F80ED", i: "shopping-bag" },
            { v: `${stats.accept}%`, l: "معدل القبول", c: "#F59E0B", i: "check-circle" },
          ].map((s) => (
            <View key={s.l} style={[styles.miniC, { backgroundColor: colors.card }]}>
              <Feather name={s.i as any} size={14} color={s.c} />
              <Text style={[styles.miniV, { color: colors.foreground }]}>{s.v}</Text>
              <Text style={[styles.miniL, { color: colors.mutedForeground }]}>{s.l}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionH}>
          <TouchableOpacity onPress={() => router.push("/statement")}><Text style={[styles.seeAll, { color: colors.primary }]}>عرض الكل</Text></TouchableOpacity>
          <Text style={[styles.sectionT, { color: colors.foreground }]}>الحركات الأخيرة</Text>
        </View>

        {loading ? (
          <View style={{ padding: 32, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : tx.length === 0 ? (
          <View style={{ padding: 32, alignItems: "center", gap: 8 }}>
            <MaterialCommunityIcons name="wallet-outline" size={48} color={colors.mutedForeground} />
            <Text style={{ fontFamily: "Tajawal_500Medium", color: colors.mutedForeground }}>لا توجد حركات بعد</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            {tx.slice(0, 10).map((t) => (
              <View key={t.id} style={[styles.txRow, { backgroundColor: colors.card }]}>
                <Text style={[styles.txP, { color: t.inc ? colors.success : colors.danger }]}>
                  {t.inc ? "+" : "-"}{t.amount.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ر.س
                </Text>
                <View style={{ flex: 1, alignItems: "flex-end", marginHorizontal: 10 }}>
                  <Text style={[styles.txT, { color: colors.foreground }]}>{t.title}</Text>
                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center", marginTop: 2 }}>
                    <View style={[styles.txStPill, { backgroundColor: t.inc ? colors.successLight : t.status === "تم التحويل" ? colors.successLight : t.status === "فشل" ? colors.dangerLight : colors.muted }]}>
                      <Text style={[styles.txStT, { color: t.inc ? colors.success : t.status === "تم التحويل" ? colors.success : t.status === "فشل" ? colors.danger : colors.mutedForeground }]}>{t.status}</Text>
                    </View>
                    <Text style={[styles.txDate, { color: colors.mutedForeground }]}>{t.date}</Text>
                  </View>
                </View>
                <View style={[styles.txIcon, { backgroundColor: t.inc ? colors.successLight : colors.dangerLight }]}>
                  <Feather name={t.icon as any} size={16} color={t.inc ? colors.success : colors.danger} />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 14 },
  hT: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  balCard: { marginHorizontal: 16, padding: 20, borderRadius: 22, marginBottom: 14 },
  balL: { color: "rgba(255,255,255,0.85)", fontFamily: "Tajawal_500Medium", fontSize: 12, textAlign: "right" },
  balV: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 32, textAlign: "right", marginTop: 4 },
  balRow: { flexDirection: "row", marginTop: 16, gap: 12, justifyContent: "space-between" },
  balItem: { flex: 1 },
  balIL: { color: "rgba(255,255,255,0.7)", fontFamily: "Tajawal_500Medium", fontSize: 10, textAlign: "right" },
  balIV: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 13, textAlign: "right", marginTop: 2 },
  actions: { flexDirection: "row", gap: 10, marginBottom: 14 },
  actBtn: { flex: 1, height: 46, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  actT: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  miniRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 14 },
  miniC: { flex: 1, padding: 12, borderRadius: 14, alignItems: "flex-end" },
  miniV: { fontFamily: "Tajawal_700Bold", fontSize: 16, marginTop: 4 },
  miniL: { fontFamily: "Tajawal_500Medium", fontSize: 9 },
  sectionH: { flexDirection: "row-reverse", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 10 },
  sectionT: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  seeAll: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  txRow: { flexDirection: "row-reverse", alignItems: "center", padding: 12, borderRadius: 14 },
  txT: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  txP: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  txStPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 100 },
  txStT: { fontFamily: "Tajawal_700Bold", fontSize: 9 },
  txDate: { fontFamily: "Tajawal_500Medium", fontSize: 10 },
  txIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
