import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform , I18nManager} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import FloatingTabBar from "@/components/FloatingTabBar";
import { SEASONAL_PROMOS, FEATURED_PROMOS } from "@/lib/promotions";

const PREVIEW_COUNT = 2;

type Stat = { id: string; icon: string; label: string; value: string; color: string; isReferral?: boolean };

const STATS: Stat[] = [
  { id: "coupons", icon: "tag", label: "كوبونات", value: "12", color: "#16C47F" },
  { id: "seasonal", icon: "calendar", label: "موسم", value: String(SEASONAL_PROMOS.length), color: "#16C47F" },
  { id: "exclusive", icon: "gift", label: "حصرية", value: String(FEATURED_PROMOS.length), color: "#16C47F" },
  { id: "referral", icon: "users", label: "دعوة الأصدقاء", value: "اربح 50 ر.س", color: "#16C47F", isReferral: true },
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
  const [showAllSeasonal, setShowAllSeasonal] = useState(false);
  const [showAllFeatured, setShowAllFeatured] = useState(false);

  const visibleSeasonal = showAllSeasonal ? SEASONAL_PROMOS : SEASONAL_PROMOS.slice(0, PREVIEW_COUNT);
  const visibleFeatured = showAllFeatured ? FEATURED_PROMOS : FEATURED_PROMOS.slice(0, PREVIEW_COUNT);

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
        <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
          <Feather name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>العروض والخصومات</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
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

        {/* ── Seasonal offers ── show 2 by default, toggle to show all 8 */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>عروض موسمية</Text>
          <TouchableOpacity
            onPress={() => setShowAllSeasonal((v) => !v)}
            style={styles.seeAllChip}
            activeOpacity={0.7}
          >
            <Text style={[styles.seeAll, { color: colors.primary }]}>
              {showAllSeasonal ? "عرض أقل" : `عرض الكل (${SEASONAL_PROMOS.length})`}
            </Text>
            <Feather name={showAllSeasonal ? "chevron-up" : "chevron-down"} size={12} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 12, marginBottom: 22 }}>
          {visibleSeasonal.map((slide) => (
            <TouchableOpacity
              key={slide.id}
              activeOpacity={0.92}
              onPress={() => copyCode(slide.code, slide.id)}
              style={styles.heroCard}
            >
              <Image source={slide.image} style={styles.heroFullImage} resizeMode="cover" />

              {/* Soft scrim on the left side so the text reads on any banner */}
              <LinearGradient
                colors={["rgba(0,0,0,0.35)", "rgba(0,0,0,0.05)", "rgba(0,0,0,0)"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 0.7, y: 0.5 }}
                style={StyleSheet.absoluteFillObject}
              />

              {/* Floating discount % badge in the top-left */}
              <View style={styles.heroDiscountBadge}>
                <Text style={styles.heroDiscountBadgeText}>-{slide.discount}%</Text>
              </View>

              {/* Text block in the empty (left) area of the banner */}
              <View style={styles.heroOverlay}>
                <View style={[styles.heroBadge, { backgroundColor: slide.badgeBg }]}>
                  <Feather name="zap" size={10} color={slide.badgeText} />
                  <Text style={[styles.heroBadgeText, { color: slide.badgeText }]}>{slide.badge}</Text>
                </View>

                <View>
                  <Text style={[styles.heroTitle, { color: slide.textColor }]} numberOfLines={2}>
                    {slide.title}
                  </Text>
                  <Text style={[styles.heroSub, { color: slide.textColor, opacity: 0.92 }]} numberOfLines={2}>
                    {slide.subtitle}
                  </Text>
                </View>

                <View style={styles.heroCtaRow}>
                  <TouchableOpacity
                    onPress={() => copyCode(slide.code, slide.id)}
                    activeOpacity={0.85}
                    style={[styles.heroCta, { backgroundColor: slide.ctaBg }]}
                  >
                    <Feather name={copiedId === slide.id ? "check" : "tag"} size={12} color={slide.ctaText} />
                    <Text style={[styles.heroCtaText, { color: slide.ctaText }]}>
                      {copiedId === slide.id ? "تم نسخ الكود" : slide.cta}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.heroCodePill}>
                    <Text style={[styles.heroCodeText, { color: slide.textColor }]}>{slide.code}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Featured offers ── show 2 by default, toggle to show all */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>عروض حصرية</Text>
          <TouchableOpacity
            onPress={() => setShowAllFeatured((v) => !v)}
            style={styles.seeAllChip}
            activeOpacity={0.7}
          >
            <Text style={[styles.seeAll, { color: colors.primary }]}>
              {showAllFeatured ? "عرض أقل" : `عرض الكل (${FEATURED_PROMOS.length})`}
            </Text>
            <Feather name={showAllFeatured ? "chevron-up" : "chevron-down"} size={12} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 12, marginBottom: 22 }}>
          {visibleFeatured.map((p) => (
            <TouchableOpacity
              key={p.id}
              activeOpacity={0.9}
              onPress={() => copyCode(p.code, p.id)}
              style={styles.featuredCard}
            >
              <Image source={p.image} style={styles.featuredImage} resizeMode="cover" />

              {/* Subtle scrim on the LEFT (text-side) so light text reads */}
              <LinearGradient
                colors={["rgba(0,0,0,0.18)", "rgba(0,0,0,0.04)", "rgba(0,0,0,0)"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 0.6, y: 0.5 }}
                style={StyleSheet.absoluteFillObject}
              />

              {/* Floating discount % badge in the top-left corner */}
              <View style={styles.featuredDiscountBadge}>
                <Text style={styles.featuredDiscountNum}>-{p.discount}%</Text>
              </View>

              {/* Text block on the empty left half of the banner */}
              <View style={styles.featuredOverlay}>
                <View style={[styles.featuredBadge, { backgroundColor: p.badgeBg }]}>
                  <Text style={[styles.featuredBadgeText, { color: p.badgeText }]}>{p.badge}</Text>
                </View>
                <Text style={[styles.featuredTitle, { color: p.titleColor }]} numberOfLines={2}>
                  {p.title}
                </Text>
                <Text style={[styles.featuredSub, { color: p.subColor }]} numberOfLines={2}>
                  {p.subtitle}
                </Text>
                <View style={styles.featuredCtaRow}>
                  <View style={[styles.featuredCta, { backgroundColor: p.ctaBg }]}>
                    <Feather name={copiedId === p.id ? "check" : "arrow-left"} size={12} color={p.ctaText} />
                    <Text style={[styles.featuredCtaText, { color: p.ctaText }]}>
                      {copiedId === p.id ? "تم النسخ" : p.cta}
                    </Text>
                  </View>
                  <View style={styles.featuredCodePill}>
                    <Text style={styles.featuredCodeText}>{p.code}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Premium Coupons */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>كوبونات مميزة</Text>
          <TouchableOpacity>
            <Text style={[styles.seeAll, { color: colors.primary }]}>عرض الكل</Text>
          </TouchableOpacity>
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

const rowDir = I18nManager.isRTL ? ("row" as const) : ("row-reverse" as const);
const colAlign = I18nManager.isRTL ? ("flex-start" as const) : ("flex-end" as const);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: rowDir,
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

  // Seasonal banner cards (full-width, image with overlay text)
  heroCard: {
    borderRadius: 22,
    overflow: "hidden",
    height: 170,
    position: "relative",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  heroFullImage: {
    width: "100%",
    height: "100%",
  },
  heroDiscountBadge: {
    position: "absolute",
    top: 12,
    start: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  heroDiscountBadgeText: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 12,
    color: "#0F172A",
  },
  heroOverlay: {
    position: "absolute",
    top: 14,
    bottom: 14,
    start: 14,
    width: "58%",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 100,
    marginTop: 24, // leave room for the floating discount badge
  },
  heroBadgeText: { fontFamily: "Tajawal_700Bold", fontSize: 10 },
  heroTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 15,
    lineHeight: 19,
    textShadowColor: "rgba(0,0,0,0.22)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroSub: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroCtaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
  },
  heroCtaText: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  heroCodePill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.18)",
    borderStyle: "dashed",
  },
  heroCodeText: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 10,
    letterSpacing: 0.4,
  },

  // "عرض الكل" toggle pill
  seeAllChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  // Featured promo banners (image 2)
  featuredCard: {
    borderRadius: 22,
    overflow: "hidden",
    height: 150,
    position: "relative",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  featuredImage: { width: "100%", height: "100%" },
  featuredDiscountBadge: {
    position: "absolute",
    top: 12,
    start: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  featuredDiscountNum: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 12,
    color: "#0F172A",
  },
  featuredOverlay: {
    position: "absolute",
    top: 14,
    bottom: 14,
    start: 14,
    width: "58%",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  featuredBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 100,
    marginTop: 24, // leave room for floating discount badge
  },
  featuredBadgeText: { fontFamily: "Tajawal_700Bold", fontSize: 10 },
  featuredTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 15,
    lineHeight: 19,
    marginTop: 4,
    textShadowColor: "rgba(0,0,0,0.18)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  featuredSub: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 1,
  },
  featuredCtaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  featuredCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
  },
  featuredCtaText: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  featuredCodePill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    borderStyle: "dashed",
  },
  featuredCodeText: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 10,
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },

  // Stats row
  statsRow: {
    flexDirection: "row",
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
    flexDirection: rowDir,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  seeAll: { fontFamily: "Tajawal_600SemiBold", fontSize: 13 },

  // Coupons
  couponCard: {
    flexDirection: rowDir,
    alignItems: "stretch",
    borderRadius: 20,
    padding: 16,
    paddingEnd: 96,
    overflow: "visible",
    position: "relative",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 96,
  },
  couponContent: { flex: 1, alignItems: colAlign, justifyContent: "center", gap: 6 },
  couponTitle: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  couponMetaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  couponMeta: { fontFamily: "Tajawal_400Regular", fontSize: 11 },
  couponCodeColumn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginStart: 12,
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
    end: 0,
    top: 0,
    bottom: 0,
    width: 80,
    borderTopEndRadius: 20,
    borderBottomEndRadius: 20,
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
    end: 72,
    top: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  couponNotchBottom: {
    position: "absolute",
    end: 72,
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
    flexDirection: rowDir,
    alignItems: "center",
    overflow: "hidden",
    minHeight: 130,
  },
  inviteContent: { flex: 1, alignItems: colAlign },
  inviteTitle: { fontFamily: "Tajawal_700Bold", fontSize: 15, marginBottom: 6 },
  inviteBody: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  inviteActionRow: { flexDirection: rowDir, alignItems: "center", gap: 8 },
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
    marginStart: 8,
  },
});
