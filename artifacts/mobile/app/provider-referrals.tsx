import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Platform } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";

export default function ProviderReferrals() {
  const colors = useColors();
  const code = "PRO-AHMED";

  const onShare = () => {
    if (Platform.OS === "web") return;
    Share.share({ message: `انضم لتطبيق نظافة كمزود خدمة باستخدام كودي ${code} واحصل على 100 ر.س بعد أول طلب!` });
  };

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="دعوة عمال" subtitle="اربح 100 ر.س لكل عامل ينضم" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["#16C47F", "#0EA968"]} style={styles.hero}>
          <MaterialCommunityIcons name="account-multiple-plus" size={56} color="#FFF" />
          <Text style={styles.heroT}>ادع عاملاً واربح 100 ر.س</Text>
          <Text style={styles.heroS}>لكل عامل ينضم ويُكمل 5 طلبات</Text>
        </LinearGradient>

        <View style={[styles.codeBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.codeL, { color: colors.mutedForeground }]}>كود الدعوة الخاص بك</Text>
          <View style={styles.codeRow}>
            <TouchableOpacity style={[styles.copy, { backgroundColor: colors.primaryLight }]}>
              <Feather name="copy" size={14} color={colors.primary} />
              <Text style={[styles.copyT, { color: colors.primary }]}>نسخ</Text>
            </TouchableOpacity>
            <Text style={[styles.code, { color: colors.foreground }]}>{code}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          {[
            { v: "5", l: "عمال دُعوا", c: "#16C47F" },
            { v: "3", l: "نشطين", c: "#2F80ED" },
            { v: "300", l: "ر.س مكتسبة", c: "#F59E0B" },
          ].map((s) => (
            <View key={s.l} style={[styles.statC, { backgroundColor: colors.card }]}>
              <Text style={[styles.statV, { color: s.c }]}>{s.v}</Text>
              <Text style={[styles.statL, { color: colors.mutedForeground }]}>{s.l}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.l, { color: colors.foreground }]}>مزايا برنامج الدعوة</Text>
        <View style={{ gap: 8 }}>
          {[
            { i: "gift", t: "100 ر.س لكل عامل بعد 5 طلبات", c: "#16C47F" },
            { i: "trending-up", t: "5% عمولة من أرباحه أول شهر", c: "#2F80ED" },
            { i: "star", t: "ترقية للمستوى الذهبي بعد 10 دعوات", c: "#F59E0B" },
            { i: "shield", t: "ضمان الجودة مع كل عامل تدعوه", c: "#8B5CF6" },
          ].map((b, i) => (
            <View key={i} style={[styles.benefit, { backgroundColor: colors.card }]}>
              <Text style={[styles.bT, { color: colors.foreground }]}>{b.t}</Text>
              <View style={[styles.bI, { backgroundColor: b.c + "22" }]}>
                <Feather name={b.i as any} size={16} color={b.c} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: "#16C47F" }]} onPress={onShare}>
          <Feather name="share-2" size={18} color="#FFF" />
          <Text style={styles.btnT}>شارك مع زملائك</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  hero: { borderRadius: 22, padding: 22, alignItems: "center", marginBottom: 14 },
  heroT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 18, marginTop: 12 },
  heroS: { color: "rgba(255,255,255,0.9)", fontFamily: "Tajawal_500Medium", fontSize: 12, marginTop: 4, textAlign: "center" },
  codeBox: { padding: 16, borderRadius: 18, marginBottom: 14, alignItems: "center" },
  codeL: { fontFamily: "Tajawal_500Medium", fontSize: 11, marginBottom: 8 },
  codeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  code: { fontFamily: "Tajawal_700Bold", fontSize: 22, letterSpacing: 1 },
  copy: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 },
  copyT: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  statC: { flex: 1, padding: 12, borderRadius: 14, alignItems: "center" },
  statV: { fontFamily: "Tajawal_700Bold", fontSize: 18 },
  statL: { fontFamily: "Tajawal_500Medium", fontSize: 10, marginTop: 2 },
  l: { fontFamily: "Tajawal_700Bold", fontSize: 14, marginBottom: 8 },
  benefit: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14 },
  bT: { fontFamily: "Tajawal_700Bold", fontSize: 12, flex: 1, marginHorizontal: 10 },
  bI: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  bottom: { position: "absolute", bottom: 0, start: 0, end: 0, padding: 14, paddingBottom: 24 },
  btn: { height: 50, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  btnT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 14 },
});
