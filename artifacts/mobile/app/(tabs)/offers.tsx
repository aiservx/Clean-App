import React, { useRef, useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Platform, I18nManager, Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import FloatingTabBar from "@/components/FloatingTabBar";
import { SEASONAL_PROMOS, GRID_PROMO_ROWS } from "@/lib/promotions";

// ── Banners (File 3 — Offers hero slider) ────────────────────────────────────
const BANNERS: { src: any; ar: number }[] = [
  { src: require("@/assets/images/banners/offers_banner_0.png"), ar: 853 / 492 },
  { src: require("@/assets/images/banners/offers_banner_1.png"), ar: 853 / 425 },
  { src: require("@/assets/images/banners/offers_banner_2.png"), ar: 853 / 415 },
  { src: require("@/assets/images/banners/offers_banner_3.png"), ar: 853 / 443 },
];
const CAROUSEL_AR = 853 / 492;

// ── Coupons ───────────────────────────────────────────────────────────────────
const COUPONS = [
  {
    id: "clean20", code: "CLEAN20",
    discountLabel: "خصم 20%",
    title: "خصم 20% على جميع الخدمات",
    minOrder: "الحد الأدنى للطلب 150 ر.س",
    expiry: "ينتهي في 20 مايو 2025",
    accent: "#16C47F",
  },
  {
    id: "save30", code: "SAVE30",
    discountLabel: "خصم\n30 ر.س",
    title: "خصم 30 ر.س على الطلبات",
    minOrder: "الحد الأدنى للطلب 200 ر.س",
    expiry: "ينتهي في 15 مايو 2025",
    accent: "#3B82F6",
  },
  {
    id: "carpet10", code: "CARPET10",
    discountLabel: "خصم 10%",
    title: "خصم 10% على تنظيف السجاد والكنب",
    minOrder: "بدون حد أدنى",
    expiry: "ينتهي في 10 مايو 2025",
    accent: "#7C3AED",
  },
  {
    id: "ramadan30", code: "RAMADAN30",
    discountLabel: "خصم 30%",
    title: "عرض رمضان المبارك",
    minOrder: "الحد الأدنى للطلب 100 ر.س",
    expiry: "ساري حتى نهاية رمضان",
    accent: "#F59E0B",
  },
  {
    id: "summer25", code: "SUMMER25",
    discountLabel: "خصم 25%",
    title: "عروض الصيف .. بيت منعش",
    minOrder: "الحد الأدنى للطلب 120 ر.س",
    expiry: "حتى 31 أغسطس",
    accent: "#EC4899",
  },
];

const { width: SW } = Dimensions.get("window");
const rowDir = I18nManager.isRTL ? ("row" as const) : ("row-reverse" as const);
const colAlign = I18nManager.isRTL ? ("flex-start" as const) : ("flex-end" as const);

export default function OffersScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [slideIdx, setSlideIdx] = useState(0);
  const sliderRef = useRef<ScrollView>(null);

  // Auto-advance carousel
  useEffect(() => {
    const id = setInterval(() => {
      setSlideIdx((prev) => {
        const next = (prev + 1) % BANNERS.length;
        sliderRef.current?.scrollTo({ x: next * SW, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const copyCode = (code: string, id: string) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
          <Feather name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>العروض والخصومات</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>

        {/* ── BANNER CAROUSEL ─────────────────────────────────────────────── */}
        <View style={{ marginBottom: 20 }}>
          <ScrollView
            ref={sliderRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setSlideIdx(Math.round(e.nativeEvent.contentOffset.x / SW))
            }
          >
            {BANNERS.map((b, idx) => (
              <View key={idx} style={{ width: SW, paddingHorizontal: 16 }}>
                <View style={{ width: "100%", aspectRatio: CAROUSEL_AR, borderRadius: 18, overflow: "hidden" }}>
                  <Image source={b.src} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                </View>
              </View>
            ))}
          </ScrollView>
          {/* Dots */}
          <View style={styles.dotsRow}>
            {BANNERS.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  {
                    backgroundColor: idx === slideIdx ? colors.primary : colors.border,
                    width: idx === slideIdx ? 20 : 6,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* ── STATS ───────────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          {[
            { icon: "tag",      label: "كوبونات",   value: String(COUPONS.length) },
            { icon: "gift",     label: "عروض",      value: String(SEASONAL_PROMOS.length) },
            { icon: "calendar", label: "موسمية",    value: String(GRID_PROMO_ROWS.length) },
            { icon: "users",    label: "دعوة صديق", value: "50 ر.س", small: true },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card }]}>
              <View style={[styles.statIconBox, { backgroundColor: "#E8F5EE" }]}>
                <Feather name={s.icon as any} size={17} color="#16C47F" />
              </View>
              <Text style={[styles.statValue, { color: colors.foreground, fontSize: s.small ? 10 : 18 }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── COUPONS ─────────────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>كوبونات مميزة</Text>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 14 }}>
          {COUPONS.map((c) => (
            <View key={c.id} style={[styles.couponCard, { backgroundColor: colors.card }]}>
              {/* Content */}
              <View style={styles.couponContent}>
                <Text style={[styles.couponTitle, { color: colors.foreground }]}>{c.title}</Text>
                <View style={styles.couponMeta}>
                  <Feather name="package" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.couponMetaText, { color: colors.mutedForeground }]}>{c.minOrder}</Text>
                </View>
                <View style={styles.couponMeta}>
                  <Feather name="clock" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.couponMetaText, { color: colors.mutedForeground }]}>{c.expiry}</Text>
                </View>
              </View>
              {/* Code */}
              <View style={styles.couponCodeCol}>
                <View style={[styles.couponCodeBox, { borderColor: c.accent }]}>
                  <Text style={[styles.couponCodeText, { color: colors.foreground }]}>{c.code}</Text>
                </View>
                <TouchableOpacity onPress={() => copyCode(c.code, c.id)} activeOpacity={0.7}>
                  <Text style={[styles.copyText, { color: c.accent }]}>
                    {copiedId === c.id ? "تم النسخ ✓" : "نسخ الكود"}
                  </Text>
                </TouchableOpacity>
              </View>
              {/* Discount tag */}
              <View style={[styles.discountTag, { backgroundColor: c.accent }]}>
                <Text style={styles.discountTagText}>{c.discountLabel}</Text>
              </View>
              {/* Notches */}
              <View style={[styles.notchTop,    { backgroundColor: colors.background }]} />
              <View style={[styles.notchBottom, { backgroundColor: colors.background }]} />
            </View>
          ))}
        </View>

        {/* ── SEASONAL OFFERS (Files 4 — single cards) ──────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>عروض موسمية</Text>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {SEASONAL_PROMOS.map((promo, idx) => (
            <TouchableOpacity
              key={promo.id}
              activeOpacity={0.92}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                copyCode(promo.code, promo.id);
              }}
              style={[
                styles.seasonalCard,
                { backgroundColor: colors.card },
                idx % 3 === 0 && { width: "100%" },
              ]}
            >
              <Image
                source={promo.image}
                style={{ width: "100%", aspectRatio: 793 / 340, borderRadius: 16 }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── GRID OFFERS (File 5 — 2 per row variety) ─────────────────── */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>عروض حصرية</Text>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {GRID_PROMO_ROWS.map((row) => (
            <View key={row.id} style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                activeOpacity={0.92}
                onPress={() => copyCode(row.code, row.id + "-l")}
                style={{ flex: 1 }}
              >
                <Image
                  source={row.left}
                  style={{ width: "100%", aspectRatio: 1, borderRadius: 14 }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
              {row.right && (
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={() => copyCode(row.code, row.id + "-r")}
                  style={{ flex: 1 }}
                >
                  <Image
                    source={row.right}
                    style={{ width: "100%", aspectRatio: 1, borderRadius: 14 }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
              {!row.right && <View style={{ flex: 1 }} />}
            </View>
          ))}
        </View>

        {/* ── INVITE ──────────────────────────────────────────────────────── */}
        <View style={[styles.inviteCard, { backgroundColor: "#FFF7ED" }]}>
          <View style={styles.inviteContent}>
            <Text style={[styles.inviteTitle, { color: "#0F172A" }]}>دع أصدقائك ووفر أكثر</Text>
            <Text style={[styles.inviteBody, { color: "#475569" }]}>
              ادع أصدقائك واحصل على 50 ر.س لكل صديق{"\n"}عند أول طلب لهم
            </Text>
            <View style={[styles.inviteActions, { flexDirection: rowDir }]}>
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
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontFamily: "Tajawal_700Bold", fontSize: 17 },

  dotsRow: {
    flexDirection: "row", justifyContent: "center",
    alignItems: "center", gap: 5, marginTop: 10,
  },
  dot: { height: 6, borderRadius: 3 },

  statsRow: {
    flexDirection: "row", paddingHorizontal: 16,
    gap: 8, marginBottom: 24,
  },
  statCard: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 6,
    borderRadius: 18, alignItems: "center",
  },
  statIconBox: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  statValue: { fontFamily: "Tajawal_700Bold", marginBottom: 2 },
  statLabel: { fontFamily: "Tajawal_500Medium", fontSize: 10, textAlign: "center" },

  sectionHeader: {
    paddingHorizontal: 16, marginBottom: 14,
  },
  sectionTitle: { fontFamily: "Tajawal_700Bold", fontSize: 17 },

  // ── Coupon card ───────────────────────────────────────────────────────────
  couponCard: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 20,
    padding: 16,
    paddingEnd: 100,
    overflow: "visible",
    position: "relative",
    minHeight: 100,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  couponContent: { flex: 1, justifyContent: "center", gap: 5 },
  couponTitle: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  couponMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  couponMetaText: { fontFamily: "Tajawal_400Regular", fontSize: 11 },
  couponCodeCol: {
    alignItems: "center", justifyContent: "center",
    gap: 6, marginStart: 10, minWidth: 86,
  },
  couponCodeBox: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1.5, borderStyle: "dashed",
  },
  couponCodeText: { fontFamily: "Tajawal_700Bold", fontSize: 12, letterSpacing: 0.5 },
  copyText: { fontFamily: "Tajawal_600SemiBold", fontSize: 11 },
  discountTag: {
    position: "absolute", end: 0, top: 0, bottom: 0, width: 88,
    borderTopEndRadius: 20, borderBottomEndRadius: 20,
    alignItems: "center", justifyContent: "center", padding: 8,
  },
  discountTagText: {
    color: "#FFF", fontFamily: "Tajawal_700Bold",
    fontSize: 13, textAlign: "center",
  },
  notchTop: {
    position: "absolute", end: 80, top: -8,
    width: 16, height: 16, borderRadius: 8,
  },
  notchBottom: {
    position: "absolute", end: 80, bottom: -8,
    width: 16, height: 16, borderRadius: 8,
  },

  // ── Seasonal card ──────────────────────────────────────────────────────────
  seasonalCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // ── Invite ────────────────────────────────────────────────────────────────
  inviteCard: {
    marginHorizontal: 16, marginTop: 24, borderRadius: 24,
    padding: 16, flexDirection: "row",
    alignItems: "center", overflow: "hidden", minHeight: 130,
  },
  inviteContent: { flex: 1 },
  inviteTitle: { fontFamily: "Tajawal_700Bold", fontSize: 15, marginBottom: 6 },
  inviteBody: {
    fontFamily: "Tajawal_400Regular", fontSize: 11,
    lineHeight: 17, marginBottom: 12,
  },
  inviteActions: { alignItems: "center", gap: 8 },
  inviteBtn: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 20, paddingVertical: 9, borderRadius: 100,
  },
  inviteBtnText: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 12 },
  inviteShareBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center", justifyContent: "center",
  },
  inviteImage: { width: 110, height: 110, borderRadius: 16, marginStart: 8 },
});
