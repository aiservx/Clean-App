import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Share, Platform } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";
import { REFERRAL_PROGRAM } from "@/lib/promotions";

const FRIENDS = [
  { n: "خالد العتيبي", st: "نشط", reward: "50 ر.س" },
  { n: "سعد الحربي", st: "نشط", reward: "50 ر.س" },
  { n: "محمد القحطاني", st: "بانتظار أول طلب", reward: "—" },
];

export default function Referrals() {
  const colors = useColors();
  const code = "AHMED2025";

  const onShare = () => {
    if (Platform.OS === "web") return;
    Share.share({ message: `انضم لتطبيق نظافة باستخدام كودي ${code} واحصل على خصم ${REFERRAL_PROGRAM.friendDiscount} ر.س على أول طلب!` });
  };

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="دعوة الأصدقاء" subtitle={`اكسب ${REFERRAL_PROGRAM.rewardPerFriend} ر.س لكل صديق`} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Banner hero — orange promo image with overlay */}
        <View style={styles.hero}>
          <Image source={REFERRAL_PROGRAM.hero.image} style={styles.heroImg} resizeMode="cover" />
          <LinearGradient
            colors={["rgba(0,0,0,0.32)", "rgba(0,0,0,0.05)", "rgba(0,0,0,0)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 0.7, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <MaterialCommunityIcons name="gift" size={12} color="#FFFFFF" />
              <Text style={styles.heroBadgeT}>{REFERRAL_PROGRAM.hero.badge}</Text>
            </View>
            <Text style={styles.heroT}>{REFERRAL_PROGRAM.hero.title}</Text>
            <Text style={styles.heroS}>{REFERRAL_PROGRAM.hero.subtitle}</Text>
            <TouchableOpacity style={styles.heroCta} activeOpacity={0.85} onPress={onShare}>
              <Feather name="share-2" size={13} color="#0F172A" />
              <Text style={styles.heroCtaT}>{REFERRAL_PROGRAM.hero.cta}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.codeBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>كود الدعوة الخاص بك</Text>
          <View style={styles.codeRow}>
            <Text style={[styles.code, { color: colors.foreground }]}>{code}</Text>
            <TouchableOpacity style={[styles.copyBtn, { backgroundColor: colors.primaryLight }]}>
              <Feather name="copy" size={16} color={colors.primary} />
              <Text style={[styles.copyT, { color: colors.primary }]}>نسخ</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          {[
            { v: "12", l: "أصدقاء دُعوا", c: "#16C47F" },
            { v: "8", l: "نشطين", c: "#2F80ED" },
            { v: "400", l: "ر.س مكتسبة", c: "#F59E0B" },
          ].map((s) => (
            <View key={s.l} style={[styles.statC, { backgroundColor: colors.card }]}>
              <Text style={[styles.statV, { color: s.c }]}>{s.v}</Text>
              <Text style={[styles.statL, { color: colors.mutedForeground }]}>{s.l}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>كيف تعمل؟</Text>
        <View style={[styles.steps, { backgroundColor: colors.card }]}>
          {[
            { i: "share-2", t: "شارك كود الدعوة", c: "#16C47F" },
            { i: "user-plus", t: "صديقك يسجل بالكود", c: "#2F80ED" },
            { i: "shopping-bag", t: "يطلب أول خدمة", c: "#F59E0B" },
            { i: "gift", t: "تستلم 50 ر.س فوراً", c: "#EC4899" },
          ].map((s, i) => (
            <View key={s.t} style={styles.step}>
              <View style={[styles.stepIcon, { backgroundColor: s.c + "22" }]}>
                <Feather name={s.i as any} size={18} color={s.c} />
              </View>
              <Text style={[styles.stepT, { color: colors.foreground }]}>{s.t}</Text>
              <Text style={[styles.stepN, { color: colors.mutedForeground }]}>{i + 1}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.foreground, marginTop: 16 }]}>أصدقاء دُعوا</Text>
        <View style={{ gap: 8 }}>
          {FRIENDS.map((f, i) => (
            <View key={i} style={[styles.friend, { backgroundColor: colors.card }]}>
              <View style={[styles.fAv, { backgroundColor: colors.primaryLight }]}>
                <Feather name="user" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text style={[styles.fN, { color: colors.foreground }]}>{f.n}</Text>
                <Text style={[styles.fS, { color: colors.mutedForeground }]}>{f.st}</Text>
              </View>
              <Text style={[styles.fReward, { color: colors.success, fontFamily: "Tajawal_700Bold" }]}>{f.reward}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={[styles.shareBtn, { backgroundColor: "#F59E0B" }]} onPress={onShare}>
          <Feather name="share-2" size={18} color="#FFF" />
          <Text style={styles.shareT}>شارك الكود الآن</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  hero: {
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 14,
    height: 180,
    position: "relative",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  heroImg: { width: "100%", height: "100%" },
  heroContent: {
    position: "absolute",
    top: 16,
    bottom: 16,
    start: 16,
    width: "60%",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  heroBadgeT: { color: "#FFFFFF", fontFamily: "Tajawal_700Bold", fontSize: 10 },
  heroT: {
    color: "#FFFFFF",
    fontFamily: "Tajawal_700Bold",
    fontSize: 17,
    lineHeight: 22,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroS: {
    color: "rgba(255,255,255,0.95)",
    fontFamily: "Tajawal_500Medium",
    fontSize: 11,
    lineHeight: 16,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  heroCtaT: { color: "#0F172A", fontFamily: "Tajawal_700Bold", fontSize: 12 },
  codeBox: { padding: 16, borderRadius: 18, marginBottom: 14, alignItems: "center" },
  codeLabel: { fontFamily: "Tajawal_500Medium", fontSize: 11, marginBottom: 8 },
  codeRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  code: { fontFamily: "Tajawal_700Bold", fontSize: 22, letterSpacing: 2 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  copyT: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  statC: { flex: 1, padding: 12, borderRadius: 14, alignItems: "center" },
  statV: { fontFamily: "Tajawal_700Bold", fontSize: 18 },
  statL: { fontFamily: "Tajawal_500Medium", fontSize: 10, marginTop: 2 },
  label: { fontFamily: "Tajawal_700Bold", fontSize: 14, marginBottom: 8 },
  steps: { padding: 12, borderRadius: 16, gap: 10 },
  step: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepN: { fontFamily: "Tajawal_700Bold", fontSize: 11, width: 14 },
  stepT: { flex: 1, fontFamily: "Tajawal_700Bold", fontSize: 12 },
  stepIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  friend: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 14 },
  fN: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  fS: { fontFamily: "Tajawal_500Medium", fontSize: 10, marginTop: 2 },
  fReward: { fontSize: 13 },
  fAv: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  bottom: { position: "absolute", bottom: 0, start: 0, end: 0, padding: 14, paddingBottom: 24 },
  shareBtn: { height: 50, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  shareT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 14 },
});
