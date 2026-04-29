import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import FloatingTabBar from "@/components/FloatingTabBar";

type Stat = { id: string; icon: string; label: string; value: string; color: string; isReferral?: boolean };

const STATS: Stat[] = [
  { id: "coupons", icon: "tag", label: "كوبونات", value: "12", color: "#16C47F" },
  { id: "seasonal", icon: "calendar", label: "موسم", value: "5", color: "#16C47F" },
  { id: "exclusive", icon: "gift", label: "حصرية", value: "8", color: "#16C47F" },
  { id: "referral", icon: "users", label: "دعوة الأصدقاء", value: "اربح 50 ر.س", color: "#16C47F", isReferral: true },
];

const SEASONAL = [
  {
    id: "ramadan",
    title: "عرض رمضان المبارك",
    subtitle: "خصم على جميع خدمات التنظيف",
    discount: "15% خصم",
    countdown: { days: "05", hours: "14", minutes: "32" },
    bg: "#1E3A5F",
    accentBg: "#16C47F",
    isLight: false,
    decoration: "moon",
  },
  {
    id: "summer",
    title: "عرض الصيف",
    subtitle: "نظافة أكثر... وإنعاش أكبر",
    discount: "20% خصم",
    countdown: { days: "10", hours: "08", minutes: "45" },
    bg: "#DBEAFE",
    accentBg: "#2F80ED",
    isLight: true,
    decoration: "palm",
  },
];

const COUPONS = [
  {
    id: "clean20",
    code: "CLEAN20",
    discountLabel: "خصم 20%",
    title: "خصم 20% على جميع الخدمات",
    minOrder: "الحد الأدنى للطلب 150 ر.س",
    expiry: "ينتهي في 20 مايو 2025",
  },
  {
    id: "save30",
    code: "SAVE30",
    discountLabel: "خصم\n30 ر.س",
    title: "خصم 30 ر.س على الطلبات",
    minOrder: "الحد الأدنى للطلب 200 ر.س",
    expiry: "ينتهي في 15 مايو 2025",
  },
  {
    id: "carpet10",
    code: "CARPET10",
    discountLabel: "خصم 10%",
    title: "خصم 10% على تنظيف السجاد والكنب",
    minOrder: "بدون حد أدنى",
    expiry: "ينتهي في 10 مايو 2025",
  },
];

export default function OffersScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeDot, setActiveDot] = useState(1);

  const copyCode = (code: string, id: string) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={{ width: 44 }} />
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>العروض والخصومات</Text>
        <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
          <Feather name="chevron-right" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Hero Card: WELCOME20 */}
        <View style={styles.heroWrap}>
          <View style={[styles.heroCard, { backgroundColor: "#E8F5EE" }]}>
            <View style={styles.heroLeft}>
              <Image
                source={require("@/assets/images/offers-hero-basket.jpg")}
                style={styles.heroImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.heroRight}>
              <View style={styles.heroDiscountRow}>
                <Text style={styles.heroPercent}>%</Text>
                <Text style={[styles.heroDiscount, { color: "#0F172A" }]}>20</Text>
                <Text style={[styles.heroKhasm, { color: "#0F172A" }]}>خصم</Text>
              </View>
              <Text style={[styles.heroSubtitle, { color: "#475569" }]}>على أول طلب لك</Text>
              <Text style={[styles.heroCodeLine, { color: "#475569" }]}>
                استخدم الكود: <Text style={{ fontFamily: "Tajawal_700Bold", color: colors.primary }}>WELCOME20</Text>
              </Text>
            </View>
          </View>

          <View style={styles.dotsRow}>
            {[0, 1, 2, 3, 4].map((i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setActiveDot(i)}
                style={[
                  styles.pageDot,
                  {
                    backgroundColor: activeDot === i ? colors.primary : "#CBD5E1",
                    width: activeDot === i ? 18 : 6,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* 4 stat cards */}
        <View style={styles.statsRow}>
          {STATS.map((stat) => (
            <View key={stat.id} style={[styles.statCard, { backgroundColor: colors.card }]}>
              <View style={[styles.statIconBox, { backgroundColor: "#E8F5EE" }]}>
                <Feather name={stat.icon as any} size={18} color={stat.color} />
              </View>
              <Text style={[styles.statValue, { color: colors.foreground, fontSize: stat.isReferral ? 11 : 18 }]}>
                {stat.value}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Seasonal Offers */}
        <View style={styles.sectionHeader}>
          <TouchableOpacity>
            <Text style={[styles.seeAll, { color: colors.primary }]}>عرض الكل</Text>
          </TouchableOpacity>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>عروض الموسم</Text>
        </View>

        <View style={styles.seasonalRow}>
          {SEASONAL.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.seasonalCard, { backgroundColor: s.bg }]}
              activeOpacity={0.85}
            >
              {s.decoration === "moon" && (
                <View style={styles.seasonalDecorationMoon}>
                  <MaterialCommunityIcons name="moon-waning-crescent" size={36} color="#FCD34D" />
                  <MaterialCommunityIcons name="lamp" size={28} color="#F59E0B" style={{ marginTop: 4 }} />
                </View>
              )}
              {s.decoration === "palm" && (
                <View style={styles.seasonalDecorationSummer}>
                  <MaterialCommunityIcons name="palm-tree" size={32} color="#10B981" />
                  <MaterialCommunityIcons name="umbrella-beach" size={28} color="#F59E0B" style={{ marginTop: 4 }} />
                </View>
              )}

              <Text
                style={[
                  styles.seasonalTitle,
                  { color: s.isLight ? "#0F172A" : "#FFFFFF" },
                ]}
              >
                {s.title}
              </Text>
              <Text
                style={[
                  styles.seasonalSubtitle,
                  { color: s.isLight ? "#475569" : "rgba(255,255,255,0.85)" },
                ]}
                numberOfLines={2}
              >
                {s.subtitle}
              </Text>

              <View style={[styles.seasonalDiscountPill, { backgroundColor: s.accentBg }]}>
                <Text style={styles.seasonalDiscountText}>{s.discount}</Text>
              </View>

              <Text
                style={[
                  styles.countdownLabel,
                  { color: s.isLight ? "#475569" : "rgba(255,255,255,0.7)" },
                ]}
              >
                ينتهي خلال
              </Text>
              <View style={styles.countdownRow}>
                <View style={styles.countdownBox}>
                  <Text style={[styles.countdownNum, { color: s.isLight ? "#0F172A" : "#FFFFFF" }]}>
                    {s.countdown.minutes}
                  </Text>
                  <Text style={[styles.countdownUnit, { color: s.isLight ? "#475569" : "rgba(255,255,255,0.7)" }]}>د</Text>
                </View>
                <Text style={[styles.countdownSep, { color: s.isLight ? "#475569" : "rgba(255,255,255,0.5)" }]}>:</Text>
                <View style={styles.countdownBox}>
                  <Text style={[styles.countdownNum, { color: s.isLight ? "#0F172A" : "#FFFFFF" }]}>
                    {s.countdown.hours}
                  </Text>
                  <Text style={[styles.countdownUnit, { color: s.isLight ? "#475569" : "rgba(255,255,255,0.7)" }]}>س</Text>
                </View>
                <Text style={[styles.countdownSep, { color: s.isLight ? "#475569" : "rgba(255,255,255,0.5)" }]}>:</Text>
                <View style={styles.countdownBox}>
                  <Text style={[styles.countdownNum, { color: s.isLight ? "#0F172A" : "#FFFFFF" }]}>
                    {s.countdown.days}
                  </Text>
                  <Text style={[styles.countdownUnit, { color: s.isLight ? "#475569" : "rgba(255,255,255,0.7)" }]}>أيام</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Premium Coupons */}
        <View style={styles.sectionHeader}>
          <TouchableOpacity>
            <Text style={[styles.seeAll, { color: colors.primary }]}>عرض الكل</Text>
          </TouchableOpacity>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>كوبونات مميزة</Text>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {COUPONS.map((c) => (
            <View key={c.id} style={[styles.couponCard, { backgroundColor: colors.card }]}>
              {/* Right: title and meta */}
              <View style={styles.couponContent}>
                <Text style={[styles.couponTitle, { color: colors.foreground }]}>{c.title}</Text>
                <View style={styles.couponMetaRow}>
                  <Feather name="package" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.couponMeta, { color: colors.mutedForeground }]}>{c.minOrder}</Text>
                </View>
                <View style={styles.couponMetaRow}>
                  <Feather name="clock" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.couponMeta, { color: colors.mutedForeground }]}>{c.expiry}</Text>
                </View>
              </View>

              {/* Center: code box */}
              <View style={styles.couponCodeColumn}>
                <View style={[styles.couponCodeBox, { borderColor: colors.primary }]}>
                  <Text style={[styles.couponCodeText, { color: colors.foreground }]}>{c.code}</Text>
                </View>
                <TouchableOpacity onPress={() => copyCode(c.code, c.id)} activeOpacity={0.7}>
                  <Text style={[styles.copyCodeText, { color: colors.primary }]}>
                    {copiedId === c.id ? "تم النسخ ✓" : "نسخ الكود"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Left: discount tag (ticket shape) */}
              <View style={[styles.couponTag, { backgroundColor: colors.primary }]}>
                <Text style={styles.couponTagText}>{c.discountLabel}</Text>
              </View>
              {/* Notch */}
              <View style={[styles.couponNotchTop, { backgroundColor: colors.background }]} />
              <View style={[styles.couponNotchBottom, { backgroundColor: colors.background }]} />
            </View>
          ))}
        </View>

        {/* Friend Invitation */}
        <View style={[styles.inviteCard, { backgroundColor: "#FFF7ED" }]}>
          <View style={styles.inviteContent}>
            <Text style={[styles.inviteTitle, { color: "#0F172A" }]}>دع أصدقائك ووفر أكثر</Text>
            <Text style={[styles.inviteBody, { color: "#475569" }]}>
              ادع أصدقائك واحصل على 50 ر.س لكل صديق{"\n"}عند أول طلب لهم
            </Text>
            <View style={styles.inviteActionRow}>
              <TouchableOpacity activeOpacity={0.85} style={styles.inviteBtn}>
                <Text style={styles.inviteBtnText}>دعوة الأصدقاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.inviteShareBtn}>
                <Feather name="share-2" size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>
          </View>
          <Image
            source={require("@/assets/images/saudi-friends-illust.jpg")}
            style={styles.inviteImage}
            resizeMode="cover"
          />
        </View>
      </ScrollView>

      <FloatingTabBar active="offers" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  headerTitle: { fontFamily: "Tajawal_700Bold", fontSize: 17 },

  // Hero
  heroWrap: { paddingHorizontal: 16, marginBottom: 18 },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    padding: 16,
    minHeight: 130,
  },
  heroLeft: { width: 130, height: 110, alignItems: "center", justifyContent: "center" },
  heroImage: { width: "100%", height: "100%" },
  heroRight: { flex: 1, alignItems: "flex-end", paddingRight: 6 },
  heroDiscountRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-end",
    gap: 4,
  },
  heroKhasm: { fontFamily: "Tajawal_700Bold", fontSize: 28, lineHeight: 32 },
  heroDiscount: { fontFamily: "Tajawal_700Bold", fontSize: 36, lineHeight: 40 },
  heroPercent: { fontFamily: "Tajawal_700Bold", fontSize: 22, color: "#0F172A", marginBottom: 6 },
  heroSubtitle: { fontFamily: "Tajawal_500Medium", fontSize: 13, marginTop: 4 },
  heroCodeLine: { fontFamily: "Tajawal_500Medium", fontSize: 12, marginTop: 8 },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 12 },
  pageDot: { height: 6, borderRadius: 3 },

  // Stats row
  statsRow: {
    flexDirection: "row-reverse",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 22,
  },
  statCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 18,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: { fontFamily: "Tajawal_700Bold", marginBottom: 2 },
  statLabel: { fontFamily: "Tajawal_500Medium", fontSize: 11, textAlign: "center" },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  seeAll: { fontFamily: "Tajawal_600SemiBold", fontSize: 13 },

  // Seasonal cards
  seasonalRow: {
    flexDirection: "row-reverse",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 22,
  },
  seasonalCard: {
    flex: 1,
    borderRadius: 22,
    padding: 16,
    minHeight: 180,
    overflow: "hidden",
    position: "relative",
  },
  seasonalDecorationMoon: { position: "absolute", left: 12, top: 12 },
  seasonalDecorationSummer: { position: "absolute", left: 12, top: 12 },
  seasonalTitle: { fontFamily: "Tajawal_700Bold", fontSize: 14, textAlign: "right", marginBottom: 4 },
  seasonalSubtitle: { fontFamily: "Tajawal_400Regular", fontSize: 11, textAlign: "right", marginBottom: 10, lineHeight: 16 },
  seasonalDiscountPill: {
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    marginBottom: 12,
  },
  seasonalDiscountText: { color: "#FFFFFF", fontFamily: "Tajawal_700Bold", fontSize: 11 },
  countdownLabel: { fontFamily: "Tajawal_500Medium", fontSize: 10, textAlign: "right", marginBottom: 4 },
  countdownRow: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  countdownBox: { alignItems: "center", minWidth: 22 },
  countdownNum: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  countdownUnit: { fontFamily: "Tajawal_400Regular", fontSize: 9 },
  countdownSep: { fontFamily: "Tajawal_700Bold", fontSize: 14 },

  // Coupons
  couponCard: {
    flexDirection: "row-reverse",
    alignItems: "stretch",
    borderRadius: 20,
    padding: 16,
    paddingLeft: 96,
    overflow: "visible",
    position: "relative",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 96,
  },
  couponContent: { flex: 1, alignItems: "flex-end", justifyContent: "center", gap: 6 },
  couponTitle: { fontFamily: "Tajawal_700Bold", fontSize: 13, textAlign: "right" },
  couponMetaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 5 },
  couponMeta: { fontFamily: "Tajawal_400Regular", fontSize: 11 },
  couponCodeColumn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginRight: 12,
    minWidth: 90,
  },
  couponCodeBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  couponCodeText: { fontFamily: "Tajawal_700Bold", fontSize: 13, letterSpacing: 0.5 },
  copyCodeText: { fontFamily: "Tajawal_600SemiBold", fontSize: 11 },
  couponTag: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 80,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  couponTagText: {
    color: "#FFFFFF",
    fontFamily: "Tajawal_700Bold",
    fontSize: 13,
    textAlign: "center",
  },
  couponNotchTop: {
    position: "absolute",
    left: 72,
    top: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  couponNotchBottom: {
    position: "absolute",
    left: 72,
    bottom: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
  },

  // Invite
  inviteCard: {
    marginHorizontal: 16,
    marginTop: 22,
    borderRadius: 24,
    padding: 16,
    flexDirection: "row-reverse",
    alignItems: "center",
    overflow: "hidden",
    minHeight: 130,
  },
  inviteContent: { flex: 1, alignItems: "flex-end" },
  inviteTitle: { fontFamily: "Tajawal_700Bold", fontSize: 15, textAlign: "right", marginBottom: 6 },
  inviteBody: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 11,
    textAlign: "right",
    lineHeight: 16,
    marginBottom: 12,
  },
  inviteActionRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  inviteBtn: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 100,
  },
  inviteBtnText: { color: "#FFFFFF", fontFamily: "Tajawal_700Bold", fontSize: 12 },
  inviteShareBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  inviteImage: {
    width: 110,
    height: 110,
    borderRadius: 16,
    marginLeft: 8,
  },
});
