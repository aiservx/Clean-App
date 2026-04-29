import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";

const TX = [
  { id: "1", t: "خدمة تنظيف عميق", p: "+92", date: "اليوم 11:30 ص", st: "مكتمل", inc: true, i: "arrow-down" },
  { id: "2", t: "خدمة تنظيف منزل", p: "+85", date: "اليوم 9:15 ص", st: "مكتمل", inc: true, i: "arrow-down" },
  { id: "3", t: "سحب إلى الحساب البنكي", p: "-500", date: "أمس", st: "تم التحويل", inc: false, i: "arrow-up" },
  { id: "4", t: "خدمة تنظيف فلل", p: "+250", date: "أمس 4:00 م", st: "مكتمل", inc: true, i: "arrow-down" },
  { id: "5", t: "بونص أداء ممتاز", p: "+50", date: "23 مايو", st: "مكافأة", inc: true, i: "gift" },
];

export default function ProviderWallet() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="chevron-right" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.hT, { color: colors.foreground }]}>المحفظة</Text>
        <TouchableOpacity><MaterialCommunityIcons name="dots-horizontal" size={22} color={colors.foreground} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.balCard}>
          <Text style={styles.balL}>الرصيد المتاح</Text>
          <Text style={styles.balV}>1,245.50 <Text style={{ fontSize: 16 }}>ر.س</Text></Text>
          <View style={styles.balRow}>
            <View style={styles.balItem}>
              <Text style={styles.balIL}>هذا الشهر</Text>
              <Text style={styles.balIV}>3,840 ر.س</Text>
            </View>
            <View style={styles.balItem}>
              <Text style={styles.balIL}>المعلق</Text>
              <Text style={styles.balIV}>320 ر.س</Text>
            </View>
            <View style={styles.balItem}>
              <Text style={styles.balIL}>الإجمالي</Text>
              <Text style={styles.balIV}>15,200 ر.س</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.actions, { paddingHorizontal: 16 }]}>
          <TouchableOpacity style={[styles.actBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/withdraw")}>
            <Feather name="arrow-up" size={16} color="#FFF" />
            <Text style={styles.actT}>سحب الأرباح</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actBtn, { backgroundColor: colors.card }]}>
            <Feather name="file-text" size={16} color={colors.foreground} />
            <Text style={[styles.actT, { color: colors.foreground }]}>كشف حساب</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.miniRow}>
          {[
            { v: "640", l: "أرباح اليوم", c: "#16C47F", i: "trending-up" },
            { v: "8", l: "طلبات اليوم", c: "#2F80ED", i: "shopping-bag" },
            { v: "92%", l: "معدل القبول", c: "#F59E0B", i: "check-circle" },
          ].map((s) => (
            <View key={s.l} style={[styles.miniC, { backgroundColor: colors.card }]}>
              <Feather name={s.i as any} size={14} color={s.c} />
              <Text style={[styles.miniV, { color: colors.foreground }]}>{s.v}</Text>
              <Text style={[styles.miniL, { color: colors.mutedForeground }]}>{s.l}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionH}>
          <TouchableOpacity><Text style={[styles.seeAll, { color: colors.primary }]}>عرض الكل</Text></TouchableOpacity>
          <Text style={[styles.sectionT, { color: colors.foreground }]}>الحركات الأخيرة</Text>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {TX.map((t) => (
            <View key={t.id} style={[styles.txRow, { backgroundColor: colors.card }]}>
              <Text style={[styles.txP, { color: t.inc ? colors.success : colors.danger }]}>{t.p} ر.س</Text>
              <View style={{ flex: 1, alignItems: "flex-end", marginHorizontal: 10 }}>
                <Text style={[styles.txT, { color: colors.foreground }]}>{t.t}</Text>
                <View style={{ flexDirection: "row-reverse", gap: 6, alignItems: "center", marginTop: 2 }}>
                  <View style={[styles.txStPill, { backgroundColor: colors.successLight }]}>
                    <Text style={[styles.txStT, { color: colors.success }]}>{t.st}</Text>
                  </View>
                  <Text style={[styles.txDate, { color: colors.mutedForeground }]}>{t.date}</Text>
                </View>
              </View>
              <View style={[styles.txIcon, { backgroundColor: t.inc ? colors.successLight : colors.dangerLight }]}>
                <Feather name={t.i as any} size={16} color={t.inc ? colors.success : colors.danger} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 14 },
  hT: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  balCard: { marginHorizontal: 16, padding: 20, borderRadius: 22, marginBottom: 14 },
  balL: { color: "rgba(255,255,255,0.85)", fontFamily: "Tajawal_500Medium", fontSize: 12, textAlign: "right" },
  balV: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 32, textAlign: "right", marginTop: 4 },
  balRow: { flexDirection: "row-reverse", marginTop: 16, gap: 12, justifyContent: "space-between" },
  balItem: { flex: 1 },
  balIL: { color: "rgba(255,255,255,0.7)", fontFamily: "Tajawal_500Medium", fontSize: 10, textAlign: "right" },
  balIV: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 13, textAlign: "right", marginTop: 2 },
  actions: { flexDirection: "row-reverse", gap: 10, marginBottom: 14 },
  actBtn: { flex: 1, height: 46, borderRadius: 14, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8 },
  actT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 12 },
  miniRow: { flexDirection: "row-reverse", paddingHorizontal: 16, gap: 8, marginBottom: 14 },
  miniC: { flex: 1, padding: 12, borderRadius: 14, alignItems: "flex-end" },
  miniV: { fontFamily: "Tajawal_700Bold", fontSize: 16, marginTop: 4 },
  miniL: { fontFamily: "Tajawal_500Medium", fontSize: 9 },
  sectionH: { flexDirection: "row-reverse", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 10 },
  sectionT: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  seeAll: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  txRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 14 },
  txT: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  txP: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  txStPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 100 },
  txStT: { fontFamily: "Tajawal_700Bold", fontSize: 9 },
  txDate: { fontFamily: "Tajawal_500Medium", fontSize: 10 },
  txIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
