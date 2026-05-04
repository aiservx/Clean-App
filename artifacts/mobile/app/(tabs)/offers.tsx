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
import { SEASONAL_PROMOS, FEATURED_PROMOS, GRID_PROMO_ROWS } from "@/lib/promotions";

// ─── Aspect ratios (per-card, after cropping) ────────────────────────────────
// seasonal_banner_*: 853×461px → AR = 853/461 ≈ 1.85
// featured_banner_*: 793×330px → AR = 793/330 ≈ 2.40
// grid_banner_r*_c*: 512×384px → AR = 512/384 ≈ 4:3 = 1.33
const SEASONAL_AR = 853 / 461;   // ~1.85
const FEATURED_AR = 793 / 330;   // ~2.40
const GRID_CELL_AR = 512 / 384;  // ~1.33

const { width: SW } = Dimensions.get("window");
const CONTENT_W = SW - 32;
const GRID_CELL_W = Math.floor((CONTENT_W - 12) / 2);

// Hero uses featured_banner_0/1/2 (rows 0-2 of promo-offers-4.png)
const HERO_IMAGES = [
  require("@/assets/images/banners/featured_banner_0.png"),
  require("@/assets/images/banners/featured_banner_1.png"),
  require("@/assets/images/banners/featured_banner_2.png"),
];
const HERO_AR = FEATURED_AR;
const HERO_H = Math.round(CONTENT_W / HERO_AR);
const HERO_GAP = 10;

const COUPONS = [
  {
    id: "clean20", code: "CLEAN20", discountLabel: "خصم 20%",
    title: "خصم 20% على جميع الخدمات",
    minOrder: "الحد الأدنى للطلب 150 ر.س", expiry: "ينتهي في 20 مايو 2025",
  },
  {
    id: "save30", code: "SAVE30", discountLabel: "خصم\n30 ر.س",
    title: "خصم 30 ر.س على الطلبات",
    minOrder: "الحد الأدنى للطلب 200 ر.س", expiry: "ينتهي في 15 مايو 2025",
  },
  {
    id: "carpet10", code: "CARPET10", discountLabel: "خصم 10%",
    title: "خصم 10% على تنظيف السجاد والكنب",
    minOrder: "بدون حد أدنى", expiry: "ينتهي في 10 مايو 2025",
  },
];

const rowDir = I18nManager.isRTL ? ("row" as const) : ("row-reverse" as const);
const colAlign = I18nManager.isRTL ? ("flex-start" as const) : ("flex-end" as const);

export default function OffersScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAllSeasonal, setShowAllSeasonal] = useState(false);
  const [heroIdx, setHeroIdx] = useState(0);
  const heroRef = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setHeroIdx((prev) => {
        const next = (prev + 1) % HERO_IMAGES.length;
        heroRef.current?.scrollTo({ x: next * (CONTENT_W + HERO_GAP), animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(t);
  }, []);

  const copyCode = (code: string, id: string) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const seasonalItems = showAllSeasonal ? SEASONAL_PROMOS : SEASONAL_PROMOS.slice(0, 2);

  // Group seasonal items into pairs (items 0-3 = seasonal_banner → show 2-per-row)
  // items 4-7 = featured_banner → show 1-per-row (wider landscape)
  const renderSeasonal = () => {
    const nodes: React.ReactNode[] = [];
    let i = 0;
    while (i < seasonalItems.length) {
      const item = seasonalItems[i];
      const next = seasonalItems[i + 1];
      const isSeasonalPair = i < 4 && next && i + 1 < 4;

      if (isSeasonalPair) {
        // 2-per-row for seasonal_banner (853×461 at half width)
        nodes.push(
          <View key={`pair-${i}`} style={styles.pairRow}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => copyCode(item.code, item.id)}>
              <Image
                source={item.image}
                style={{ width: GRID_CELL_W, aspectRatio: SEASONAL_AR, borderRadius: 14 }}
                resizeMode="cover"
              />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.9} onPress={() => copyCode(next.code, next.id)}>
              <Image
                source={next.image}
                style={{ width: GRID_CELL_W, aspectRatio: SEASONAL_AR, borderRadius: 14 }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          </View>
        );
        i += 2;
      } else {
        // 1-per-row for featured_banner (wider landscape)
        nodes.push(
          <TouchableOpacity key={item.id} activeOpacity={0.9} onPress={() => copyCode(item.code, item.id)}>
            <Image
              source={item.image}
              style={{ width: "100%", aspectRatio: FEATURED_AR, borderRadius: 16 }}
              resizeMode="cover"
            />
          </TouchableOpacity>
        );
        i++;
      }
    }
    return nodes;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
          <Feather name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>العروض والخصومات</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>

        {/* ── HERO SLIDER ── */}
        <View style={{ marginBottom: 22 }}>
          <ScrollView
            ref={heroRef}
            horizontal
            snapToInterval={CONTENT_W + HERO_GAP}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              setHeroIdx(Math.round(e.nativeEvent.contentOffset.x / (CONTENT_W + HERO_GAP)));
            }}
            contentContainerStyle={{ paddingHorizontal: 16, gap: HERO_GAP }}
          >
            {HERO_IMAGES.map((src, idx) => (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.92}
                onPress={() => router.push("/services" as any)}
                style={{ width: CONTENT_W, height: HERO_H, borderRadius: 18, overflow: "hidden" }}
              >
                <Image source={src} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.heroDots}>
            {HERO_IMAGES.map((_, idx) => (
              <View
                key={idx}
                style={[styles.heroDot, {
                  backgroundColor: idx === heroIdx ? colors.primary : colors.border,
                  width: idx === heroIdx ? 18 : 6,
                }]}
              />
            ))}
          </View>
        </View>

        {/* ── STATS ── */}
        <View style={styles.statsRow}>
          {[
            { icon: "tag",      label: "كوبونات",   value: "12" },
            { icon: "calendar", label: "موسمية",    value: String(SEASONAL_PROMOS.length) },
            { icon: "gift",     label: "حصرية",     value: String(FEATURED_PROMOS.length) },
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

        {/* ── SEASONAL ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>عروض موسمية</Text>
          <TouchableOpacity onPress={() => setShowAllSeasonal((v) => !v)} style={styles.seeAllChip} activeOpacity={0.7}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>
              {showAllSeasonal ? "عرض أقل" : `عرض الكل (${SEASONAL_PROMOS.length})`}
            </Text>
            <Feather name={showAllSeasonal ? "chevron-up" : "chevron-down"} size={12} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 10, marginBottom: 22 }}>
          {renderSeasonal()}
        </View>

        {/* ── FEATURED (full-width landscape banners) ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>عروض حصرية</Text>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 10, marginBottom: 22 }}>
          {FEATURED_PROMOS.map((p) => (
            <TouchableOpacity key={p.id} activeOpacity={0.9} onPress={() => copyCode(p.code, p.id)}>
              <Image
                source={p.image}
                style={{ width: "100%", aspectRatio: FEATURED_AR, borderRadius: 16 }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}

          {/* Grid rows (image 5, rows 1-3): each row shown as 2-per-row cell pair */}
          {GRID_PROMO_ROWS.map((row) => (
            <View key={row.id} style={styles.pairRow}>
              <TouchableOpacity activeOpacity={0.9} onPress={() => copyCode(row.code + "_L", row.id + "_l")}>
                <Image
                  source={row.left}
                  style={{ width: GRID_CELL_W, aspectRatio: GRID_CELL_AR, borderRadius: 14 }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.9} onPress={() => copyCode(row.code + "_R", row.id + "_r")}>
                <Image
                  source={row.right}
                  style={{ width: GRID_CELL_W, aspectRatio: GRID_CELL_AR, borderRadius: 14 }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* ── COUPONS ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>كوبونات مميزة</Text>
          <TouchableOpacity>
            <Text style={[styles.seeAll, { color: colors.primary }]}>عرض الكل</Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {COUPONS.map((c) => (
            <View key={c.id} style={[styles.couponCard, { backgroundColor: colors.card }]}>
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
              <View style={[styles.couponTag, { backgroundColor: colors.primary }]}>
                <Text style={styles.couponTagText}>{c.discountLabel}</Text>
              </View>
              <View style={[styles.couponNotchTop, { backgroundColor: colors.background }]} />
              <View style={[styles.couponNotchBottom, { backgroundColor: colors.background }]} />
            </View>
          ))}
        </View>

        {/* ── INVITE ── */}
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
    flexDirection: rowDir, alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, marginBottom: 16,
  },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontFamily: "Tajawal_700Bold", fontSize: 17 },

  heroDots: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5, marginTop: 10 },
  heroDot: { height: 6, borderRadius: 3 },

  statsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 22 },
  statCard: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 6, borderRadius: 18, alignItems: "center",
  },
  statIconBox: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statValue: { fontFamily: "Tajawal_700Bold", marginBottom: 2 },
  statLabel: { fontFamily: "Tajawal_500Medium", fontSize: 10, textAlign: "center" },

  sectionHeader: {
    flexDirection: rowDir, justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, marginBottom: 12,
  },
  sectionTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  seeAll: { fontFamily: "Tajawal_600SemiBold", fontSize: 13 },
  seeAllChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4 },

  pairRow: { flexDirection: rowDir, gap: 12 },

  couponCard: {
    flexDirection: rowDir, alignItems: "stretch", borderRadius: 20,
    padding: 16, paddingEnd: 96, overflow: "visible", position: "relative", minHeight: 96,
  },
  couponContent: { flex: 1, alignItems: colAlign, justifyContent: "center", gap: 6 },
  couponTitle: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  couponMetaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  couponMeta: { fontFamily: "Tajawal_400Regular", fontSize: 11 },
  couponCodeColumn: { alignItems: "center", justifyContent: "center", gap: 6, marginStart: 12, minWidth: 90 },
  couponCodeBox: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, borderStyle: "dashed" },
  couponCodeText: { fontFamily: "Tajawal_700Bold", fontSize: 13, letterSpacing: 0.5 },
  copyCodeText: { fontFamily: "Tajawal_600SemiBold", fontSize: 11 },
  couponTag: {
    position: "absolute", end: 0, top: 0, bottom: 0, width: 80,
    borderTopEndRadius: 20, borderBottomEndRadius: 20, alignItems: "center", justifyContent: "center", padding: 8,
  },
  couponTagText: { color: "#FFFFFF", fontFamily: "Tajawal_700Bold", fontSize: 13, textAlign: "center" },
  couponNotchTop: { position: "absolute", end: 72, top: -8, width: 16, height: 16, borderRadius: 8 },
  couponNotchBottom: { position: "absolute", end: 72, bottom: -8, width: 16, height: 16, borderRadius: 8 },

  inviteCard: {
    marginHorizontal: 16, marginTop: 22, borderRadius: 24, padding: 16,
    flexDirection: rowDir, alignItems: "center", overflow: "hidden", minHeight: 130,
  },
  inviteContent: { flex: 1, alignItems: colAlign },
  inviteTitle: { fontFamily: "Tajawal_700Bold", fontSize: 15, marginBottom: 6 },
  inviteBody: { fontFamily: "Tajawal_400Regular", fontSize: 11, lineHeight: 16, marginBottom: 12 },
  inviteActionRow: { flexDirection: rowDir, alignItems: "center", gap: 8 },
  inviteBtn: { backgroundColor: "#F59E0B", paddingHorizontal: 22, paddingVertical: 10, borderRadius: 100 },
  inviteBtnText: { color: "#FFFFFF", fontFamily: "Tajawal_700Bold", fontSize: 12 },
  inviteShareBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: "#FFFFFF",
    alignItems: "center", justifyContent: "center",
  },
  inviteImage: { width: 110, height: 110, borderRadius: 16, marginStart: 8 },
});
