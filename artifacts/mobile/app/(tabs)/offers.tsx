import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Platform, I18nManager, FlatList, useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import FloatingTabBar from "@/components/FloatingTabBar";
import { SEASONAL_PROMOS, GRID_PROMO_ROWS } from "@/lib/promotions";

// ── Hero slider banners ───────────────────────────────────────────────────────
const HERO_BANNERS = [
  require("@/assets/images/banners/offers_banner_0.png"),
  require("@/assets/images/banners/offers_banner_1.png"),
  require("@/assets/images/banners/offers_banner_2.png"),
  require("@/assets/images/banners/offers_banner_3.png"),
];
const HERO_AR = 853 / 440;

// ── Collect all grid promo images for 3-per-row horizontal strip ─────────────
const GRID_IMAGES: { src: any; code: string }[] = [
  GRID_PROMO_ROWS[0]?.left  && { src: GRID_PROMO_ROWS[0].left,  code: "SUMMER25" },
  GRID_PROMO_ROWS[0]?.right && { src: GRID_PROMO_ROWS[0].right, code: "SUMMER25" },
  GRID_PROMO_ROWS[1]?.left  && { src: GRID_PROMO_ROWS[1].left,  code: "SEASON20" },
  GRID_PROMO_ROWS[1]?.right && { src: GRID_PROMO_ROWS[1].right, code: "SEASON20" },
  GRID_PROMO_ROWS[2]?.left  && { src: GRID_PROMO_ROWS[2].left,  code: "RAIN18" },
  GRID_PROMO_ROWS[2]?.right && { src: GRID_PROMO_ROWS[2].right, code: "RAIN18" },
  GRID_PROMO_ROWS[3]?.left  && { src: GRID_PROMO_ROWS[3].left,  code: "WEEK12" },
].filter(Boolean) as { src: any; code: string }[];

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

const rowDir = I18nManager.isRTL ? ("row" as const) : ("row-reverse" as const);

export default function OffersScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { width: W } = useWindowDimensions();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [slideIdx, setSlideIdx] = useState(0);
  const heroRef = useRef<FlatList>(null);

  // Card sizes derived from screen width
  const CONTENT_W = W - 32; // 16px padding each side
  const GRID_GAP = 8;
  const GRID_CARD_W = (CONTENT_W - GRID_GAP * 2) / 3; // exactly 3 per visible row

  // Auto-advance hero slider
  useEffect(() => {
    const id = setInterval(() => {
      setSlideIdx((prev) => {
        const next = (prev + 1) % HERO_BANNERS.length;
        heroRef.current?.scrollToIndex({ index: next, animated: true });
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

  const renderHeroBanner = useCallback(({ item }: { item: any }) => (
    <View style={{ width: W, paddingHorizontal: 16 }}>
      <Image
        source={item}
        style={{ width: "100%", aspectRatio: HERO_AR, borderRadius: 18 }}
        resizeMode="cover"
      />
    </View>
  ), [W]);

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

        {/* ── HERO SLIDER ────────────────────────────────────────────────── */}
        <View style={{ marginBottom: 20 }}>
          <FlatList
            ref={heroRef}
            data={HERO_BANNERS}
            renderItem={renderHeroBanner}
            keyExtractor={(_, i) => `hero-${i}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setSlideIdx(Math.round(e.nativeEvent.contentOffset.x / W))
            }
            getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
          />
          {/* Pagination dots */}
          <View style={styles.dotsRow}>
            {HERO_BANNERS.map((_, idx) => (
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
              <View style={[styles.discountTag, { backgroundColor: c.accent }]}>
                <Text style={styles.discountTagText}>{c.discountLabel}</Text>
              </View>
              <View style={[styles.notchTop,    { backgroundColor: colors.background }]} />
              <View style={[styles.notchBottom, { backgroundColor: colors.background }]} />
            </View>
          ))}
        </View>

        {/* ── INVITE FRIENDS BANNER ────────────────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.92}
          style={{ marginHorizontal: 16, marginTop: 24, borderRadius: 18, overflow: "hidden" }}
          onPress={() => router.push("/referrals" as any)}
        >
          <Image
            source={require("@/assets/images/invite_friends_banner.png")}
            style={{ width: CONTENT_W, aspectRatio: 1378 / 563, borderRadius: 18 }}
            resizeMode="cover"
          />
        </TouchableOpacity>

        {/* ── SEASONAL OFFERS — wide banners ───────────────────────────────── */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>عروض موسمية</Text>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {SEASONAL_PROMOS.map((promo, i) => (
            <TouchableOpacity
              key={promo.id}
              activeOpacity={0.92}
              onPress={() => copyCode(promo.code, `s${i}`)}
            >
              <Image
                source={promo.image}
                style={{ width: CONTENT_W, aspectRatio: 793 / 340, borderRadius: 16 }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── GRID PROMOS — 3-per-row horizontal scrollable strip ───────────── */}
        {GRID_IMAGES.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>بطاقات العروض</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={GRID_CARD_W + GRID_GAP}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: 16, gap: GRID_GAP }}
              style={{ marginBottom: 8 }}
            >
              {GRID_IMAGES.map((g, idx) => (
                <TouchableOpacity
                  key={`grid-${idx}`}
                  activeOpacity={0.88}
                  onPress={() => copyCode(g.code, `grid-${idx}`)}
                >
                  <Image
                    source={g.src}
                    style={{ width: GRID_CARD_W, height: GRID_CARD_W, borderRadius: 14 }}
                    resizeMode="cover"
                  />
                  {copiedId === `grid-${idx}` && (
                    <View style={styles.copiedOverlay}>
                      <Text style={styles.copiedOverlayText}>تم النسخ ✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

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

  copiedOverlay: {
    position: "absolute", inset: 0, borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center", justifyContent: "center",
  },
  copiedOverlayText: {
    color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 13,
  },
});
