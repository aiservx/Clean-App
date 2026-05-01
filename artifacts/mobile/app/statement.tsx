import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Row = {
  id: string;
  type: "earning" | "payout";
  title: string;
  amount: number;
  date: Date;
  status: string;
  statusColor: "success" | "danger" | "warning" | "muted";
};

const fmt = (d: Date) =>
  d.toLocaleDateString("ar-SA", { day: "numeric", month: "short", year: "numeric" }) +
  " " +
  d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

export default function Statement() {
  const colors = useColors();
  const { session } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({ totalIn: 0, totalOut: 0, net: 0 });

  const load = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    const uid = session.user.id;
    const [{ data: comp }, { data: payouts }] = await Promise.all([
      supabase.from("bookings").select("id, total, created_at, services(title_ar)").eq("provider_id", uid).eq("status", "completed").order("created_at", { ascending: false }),
      supabase.from("payouts").select("*").eq("provider_id", uid).order("created_at", { ascending: false }),
    ]);

    const earnings: Row[] = (comp ?? []).map((r: any) => ({
      id: `e-${r.id}`,
      type: "earning",
      title: r.services?.title_ar || "خدمة",
      amount: Number(r.total) * 0.85,
      date: new Date(r.created_at),
      status: "صافي الأرباح",
      statusColor: "success",
    }));

    const outs: Row[] = (payouts ?? []).map((p: any) => ({
      id: `p-${p.id}`,
      type: "payout",
      title: p.iban ? `سحب → ${p.iban.slice(-4).padStart(p.iban.length, "*")}` : "طلب سحب",
      amount: Number(p.amount),
      date: new Date(p.created_at),
      status: p.status === "paid" ? "تم التحويل" : p.status === "failed" ? "فشل" : "قيد المراجعة",
      statusColor: p.status === "paid" ? "success" : p.status === "failed" ? "danger" : "warning",
    }));

    const all = [...earnings, ...outs].sort((a, b) => b.date.getTime() - a.date.getTime());
    setRows(all);

    const tIn = earnings.reduce((s, r) => s + r.amount, 0);
    const tOut = outs.filter((o) => o.status !== "فشل").reduce((s, r) => s + r.amount, 0);
    setSummary({ totalIn: tIn, totalOut: tOut, net: tIn - tOut });
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
      <ScreenHeader title="كشف حساب" subtitle="جميع الإيرادات والمسحوبات" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.summary}>
          <Text style={styles.sLabel}>صافي الرصيد</Text>
          <Text style={styles.sValue}>
            {summary.net.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} <Text style={{ fontSize: 14 }}>ر.س</Text>
          </Text>
          <View style={styles.sRow}>
            <View style={styles.sCol}>
              <Text style={styles.sCL}>إجمالي الإيرادات</Text>
              <Text style={styles.sCV}>+{summary.totalIn.toLocaleString("ar-SA", { maximumFractionDigits: 0 })} ر.س</Text>
            </View>
            <View style={styles.sCol}>
              <Text style={styles.sCL}>إجمالي السحوبات</Text>
              <Text style={styles.sCV}>-{summary.totalOut.toLocaleString("ar-SA", { maximumFractionDigits: 0 })} ر.س</Text>
            </View>
          </View>
        </LinearGradient>

        {loading ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : rows.length === 0 ? (
          <View style={{ padding: 40, alignItems: "center", gap: 8 }}>
            <MaterialCommunityIcons name="file-document-outline" size={56} color={colors.mutedForeground} />
            <Text style={{ fontFamily: "Tajawal_500Medium", color: colors.mutedForeground }}>لا توجد حركات بعد</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {rows.map((r) => {
              const isIn = r.type === "earning";
              const stColor = r.statusColor === "success" ? colors.success : r.statusColor === "danger" ? colors.danger : r.statusColor === "warning" ? colors.warning : colors.mutedForeground;
              const stBg = r.statusColor === "success" ? colors.successLight : r.statusColor === "danger" ? colors.dangerLight : r.statusColor === "warning" ? "#FEF3C7" : colors.muted;
              return (
                <View key={r.id} style={[styles.row, { backgroundColor: colors.card }]}>
                  <Text style={[styles.amt, { color: isIn ? colors.success : colors.danger }]}>
                    {isIn ? "+" : "-"}{r.amount.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ر.س
                  </Text>
                  <View style={{ flex: 1, alignItems: "flex-end", marginHorizontal: 10 }}>
                    <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{r.title}</Text>
                    <View style={{ flexDirection: "row", gap: 6, alignItems: "center", marginTop: 3 }}>
                      <View style={[styles.statusPill, { backgroundColor: stBg }]}>
                        <Text style={[styles.statusT, { color: stColor }]}>{r.status}</Text>
                      </View>
                      <Text style={[styles.date, { color: colors.mutedForeground }]}>{fmt(r.date)}</Text>
                    </View>
                  </View>
                  <View style={[styles.icon, { backgroundColor: isIn ? colors.successLight : colors.dangerLight }]}>
                    <Feather name={isIn ? "arrow-down" : "arrow-up"} size={16} color={isIn ? colors.success : colors.danger} />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  summary: { padding: 18, borderRadius: 18, marginBottom: 14 },
  sLabel: { color: "rgba(255,255,255,0.85)", fontFamily: "Tajawal_500Medium", fontSize: 12, textAlign: "right" },
  sValue: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 30, textAlign: "right", marginTop: 4 },
  sRow: { flexDirection: "row", marginTop: 12, gap: 12 },
  sCol: { flex: 1 },
  sCL: { color: "rgba(255,255,255,0.7)", fontFamily: "Tajawal_500Medium", fontSize: 10, textAlign: "right" },
  sCV: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 13, textAlign: "right", marginTop: 2 },
  row: { flexDirection: "row-reverse", alignItems: "center", padding: 12, borderRadius: 14 },
  title: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  amt: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  statusPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 100 },
  statusT: { fontFamily: "Tajawal_700Bold", fontSize: 9 },
  date: { fontFamily: "Tajawal_500Medium", fontSize: 10 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
