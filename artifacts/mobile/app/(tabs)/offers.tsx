import React, { useState, useEffect } from "react";
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

// ── Banner images ─────────────────────────────────────────────────────────────
const HERO_BANNERS = [
  require("@/assets/images/banners/offers_banner_0.png"),
  require("@/assets/images/banners/offers_banner_1.png"),
  require("@/assets/images/banners/offers_banner_2.png"),
  require("@/assets/images/banners/offers_banner_3.png"),
];

// ── Grid promo images (shown as 2-per-row vertical grid) ─────────────────────
const GRID_IMAGES: { src: any; code: string }[] = ([
  GRID_PROMO_ROWS[0]?.left  ? { src: GRID_PROMO_ROWS[0].left,  code: "SUMMER25" } : null,
  GRID_PROMO_ROWS[0]?.right ? { src: GRID_PROMO_ROWS[0].right, code: "SUMMER25" } : null,
  GRID_PROMO_ROWS[1]?.left  ? { src: GRID_PROMO_ROWS[1].left,  code: "SEASON20" } : null,
  GRID_PROMO_ROWS[1]?.right ? { src: GRID_PROMO_ROWS[1].right, code: "SEASON20" } : null,
  GRID_PROMO_ROWS[2]?.left  ? { src: GRID_PROMO_ROWS[2].left,  code: "RAIN18"   } : null,
  GRID_PROMO_ROWS[2]?.right ? { src: GRID_PROMO_ROWS[2].right, code: "RAIN18"   } : null,
  GRID_PROMO_ROWS[3]?.left  ? { src: GRID_PROMO_ROWS[3].left,  code: "WEEK12"   } : null,
] as ({ src: any; code: string } | null)[]).filter((x): x is { src: any; code: string } => x !== null);

const COUPONS = [
  { id: "clean20",   code: "CLEAN20",   label: "خصم 20%",     title: "خصم 20% على جميع الخدمات",  min: "الحد الأدنى 150 ر.س", exp: "ينتهي في 20 مايو", accent: "#16C47F" },
  { id: "save30",    code: "SAVE30",    label: "خصم\n30 ر.س", title: "خصم 30 ر.س على الطلبات",     min: "الحد الأدنى 200 ر.س", exp: "ينتهي في 15 مايو", accent: "#3B82F6" },
  { id: "carpet10",  code: "CARPET10",  label: "خصم 10%",     title: "خصم 10% على السجاد والكنب", min: "بدون حد أدنى",         exp: "ينتهي في 10 مايو", accent: "#7C3AED" },
  { id: "ramadan30", code: "RAMADAN30", label: "خصم 30%",     title: "عرض رمضان المبارك",          min: "الحد الأدنى 100 ر.س", exp: "ساري حتى رمضان",  accent: "#F59E0B" },
  { id: "summer25",  code: "SUMMER25",  label: "خصم 25%",     title: "عروض الصيف .. بيت منعش",     min: "الحد الأدنى 120 ر.س", exp: "حتى 31 أغسطس",   accent: "#EC4899" },
];

// ── Get real screen/iframe width immediately (no async, no blank flash) ───────
function getRealWidth(): number {
  // On web inside an iframe: window.innerWidth = the iframe's own width (e.g. 450px)
  if (Platform.OS === "web" && typeof window !== "undefined" && window.innerWidth > 0) {
    return window.innerWidth;
  }
  // On native: Dimensions gives the device screen width
  return Dimensions.get("window").width;
}

const AR_HERO   = 853 / 440;
const AR_WIDE   = 793 / 340;
const AR_INVITE = 1378 / 563;
const GRID_GAP  = 10;
const H_PAD     = 16;

export default function OffersScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [copied, setCopied] = useState<string | null>(null);
  const [slide,  setSlide]  = useState(0);

  // Width is known immediately — no blank screen, no waiting for onLayout
  const [W, setW] = useState<number>(getRealWidth);

  // onLayout keeps W accurate after orientation changes / resize
  const onLayout = (e: any) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setW(w);
  };

  // Sizes derived from real width
  const IMG_W      = W - H_PAD * 2;           // full-width images
  const HERO_H     = Math.round(IMG_W / AR_HERO);
  const WIDE_H     = Math.round(IMG_W / AR_WIDE);
  const INV_H      = Math.round(IMG_W / AR_INVITE);
  const CARD_W     = Math.round((IMG_W - GRID_GAP) / 2); // 2 per row
  const CARD_H     = CARD_W;                              // square

  // Auto-advance slider every 3.5 s — purely state-based, works everywhere
  useEffect(() => {
    const t = setInterval(() => setSlide(p => (p + 1) % HERO_BANNERS.length), 3500);
    return () => clearInterval(t);
  }, []);

  const copy = (code: string, id: string) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (Platform.OS === "web" && navigator?.clipboard) navigator.clipboard.writeText(code).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1600);
  };

  // Build rows of 2 for the grid
  const gridRows: { src: any; code: string }[][] = [];
  for (let i = 0; i < GRID_IMAGES.length; i += 2) {
    gridRows.push(GRID_IMAGES.slice(i, i + 2));
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} onLayout={onLayout}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>العروض والخصومات</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>

        {/* ── HERO SLIDER — state-based, a different image each tick ──── */}
        <View style={{ marginHorizontal: H_PAD, marginBottom: 20 }}>
          <View style={{ width: IMG_W, height: HERO_H, borderRadius: 18, overflow: "hidden" }}>
            <Image
              key={`hero-${slide}`}
              source={HERO_BANNERS[slide]}
              style={{ width: IMG_W, height: HERO_H }}
              resizeMode="cover"
            />
            {/* Tap left = prev / right = next */}
            <TouchableOpacity
              style={[styles.tapZone, { left: 0 }]}
              onPress={() => setSlide(p => (p - 1 + HERO_BANNERS.length) % HERO_BANNERS.length)}
              activeOpacity={0.05}
            />
            <TouchableOpacity
              style={[styles.tapZone, { right: 0 }]}
              onPress={() => setSlide(p => (p + 1) % HERO_BANNERS.length)}
              activeOpacity={0.05}
            />
            <View style={styles.badge}>
              <Text style={styles.badgeTxt}>{slide + 1} / {HERO_BANNERS.length}</Text>
            </View>
          </View>
          {/* Dots */}
          <View style={styles.dotsRow}>
            {HERO_BANNERS.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setSlide(i)}>
                <View style={[styles.dot, {
                  backgroundColor: i === slide ? colors.primary : colors.border,
                  width: i === slide ? 22 : 7,
                }]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── STATS ─────────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          {[
            { icon: "tag",      label: "كوبونات",   val: String(COUPONS.length) },
            { icon: "gift",     label: "عروض",      val: String(SEASONAL_PROMOS.length) },
            { icon: "calendar", label: "موسمية",    val: String(GRID_PROMO_ROWS.length) },
            { icon: "users",    label: "دعوة صديق", val: "50 ر.س", sm: true },
          ].map(s => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card }]}>
              <View style={styles.statIcon}><Feather name={s.icon as any} size={17} color="#16C47F" /></View>
              <Text style={[styles.statVal, { color: colors.foreground, fontSize: s.sm ? 10 : 18 }]}>{s.val}</Text>
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── COUPONS ───────────────────────────────────────────────────── */}
        <Text style={[styles.secTitle, { color: colors.foreground }]}>كوبونات مميزة</Text>
        <View style={[styles.section, { gap: 14 }]}>
          {COUPONS.map(c => (
            <View key={c.id} style={[styles.coupon, { backgroundColor: colors.card }]}>
              <View style={styles.couponBody}>
                <Text style={[styles.couponTitle, { color: colors.foreground }]}>{c.title}</Text>
                <View style={styles.meta}><Feather name="package" size={11} color={colors.mutedForeground} /><Text style={[styles.metaTxt, { color: colors.mutedForeground }]}>{c.min}</Text></View>
                <View style={styles.meta}><Feather name="clock"   size={11} color={colors.mutedForeground} /><Text style={[styles.metaTxt, { color: colors.mutedForeground }]}>{c.exp}</Text></View>
              </View>
              <View style={styles.couponRight}>
                <View style={[styles.codeBox, { borderColor: c.accent }]}>
                  <Text style={[styles.codeTxt, { color: colors.foreground }]}>{c.code}</Text>
                </View>
                <TouchableOpacity onPress={() => copy(c.code, c.id)}>
                  <Text style={[styles.copyTxt, { color: c.accent }]}>{copied === c.id ? "تم النسخ ✓" : "نسخ الكود"}</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.discTag, { backgroundColor: c.accent }]}>
                <Text style={styles.discTxt}>{c.label}</Text>
              </View>
              <View style={[styles.notchT, { backgroundColor: colors.background }]} />
              <View style={[styles.notchB, { backgroundColor: colors.background }]} />
            </View>
          ))}
        </View>

        {/* ── INVITE FRIENDS BANNER ─────────────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.92}
          style={{ marginHorizontal: H_PAD, marginTop: 24, borderRadius: 18, overflow: "hidden" }}
          onPress={() => router.push("/referrals" as any)}
        >
          <Image
            source={require("@/assets/images/invite_friends_banner.png")}
            style={{ width: IMG_W, height: INV_H }}
            resizeMode="cover"
          />
        </TouchableOpacity>

        {/* ── SEASONAL WIDE BANNERS ─────────────────────────────────────── */}
        <Text style={[styles.secTitle, { color: colors.foreground, marginTop: 24 }]}>عروض موسمية</Text>
        <View style={[styles.section, { gap: 12 }]}>
          {SEASONAL_PROMOS.map((p, i) => (
            <TouchableOpacity key={p.id} activeOpacity={0.92} onPress={() => copy(p.code, `s${i}`)}>
              <Image
                source={p.image}
                style={{ width: IMG_W, height: WIDE_H, borderRadius: 16 }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── GRID CARDS — 2 per row, vertical ─────────────────────────── */}
        {GRID_IMAGES.length > 0 && (
          <>
            <Text style={[styles.secTitle, { color: colors.foreground, marginTop: 20 }]}>بطاقات العروض</Text>
            <View style={[styles.section, { gap: GRID_GAP }]}>
              {gridRows.map((row, ri) => (
                <View key={ri} style={{ flexDirection: "row", gap: GRID_GAP }}>
                  {row.map((g, ci) => (
                    <TouchableOpacity
                      key={ci}
                      activeOpacity={0.88}
                      onPress={() => copy(g.code, `g${ri * 2 + ci}`)}
                      style={{ width: CARD_W, height: CARD_H, borderRadius: 14, overflow: "hidden" }}
                    >
                      <Image
                        source={g.src}
                        style={{ width: CARD_W, height: CARD_H }}
                        resizeMode="cover"
                      />
                      {copied === `g${ri * 2 + ci}` && (
                        <View style={styles.copiedOv}>
                          <Text style={styles.copiedTxt}>تم النسخ ✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                  {/* If odd number of images, fill last cell with empty space */}
                  {row.length === 1 && <View style={{ width: CARD_W }} />}
                </View>
              ))}
            </View>
          </>
        )}

      </ScrollView>

      <FloatingTabBar active="offers" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: H_PAD, marginBottom: 12,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#FFF", alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontFamily: "Tajawal_700Bold", fontSize: 17 },

  tapZone:  { position: "absolute", top: 0, bottom: 0, width: "40%" },
  badge:    { position: "absolute", bottom: 10, end: 12, backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeTxt: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 11 },
  dotsRow:  { flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 10 },
  dot:      { height: 7, borderRadius: 4 },

  statsRow: { flexDirection: "row", paddingHorizontal: H_PAD, gap: 8, marginBottom: 20 },
  statCard: { flex: 1, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 18, alignItems: "center" },
  statIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#E8F5EE", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  statVal:  { fontFamily: "Tajawal_700Bold", marginBottom: 2 },
  statLbl:  { fontFamily: "Tajawal_500Medium", fontSize: 10, textAlign: "center" },

  secTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16, paddingHorizontal: H_PAD, marginBottom: 12 },
  section:  { paddingHorizontal: H_PAD },

  coupon:      { flexDirection: "row", alignItems: "stretch", borderRadius: 20, padding: 14, paddingEnd: 98, position: "relative", minHeight: 96, shadowColor: "#64748B", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 2 },
  couponBody:  { flex: 1, justifyContent: "center", gap: 5 },
  couponTitle: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  meta:        { flexDirection: "row", alignItems: "center", gap: 4 },
  metaTxt:     { fontFamily: "Tajawal_400Regular", fontSize: 11 },
  couponRight: { alignItems: "center", justifyContent: "center", gap: 6, marginStart: 10, minWidth: 82 },
  codeBox:     { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1.5, borderStyle: "dashed" },
  codeTxt:     { fontFamily: "Tajawal_700Bold", fontSize: 11, letterSpacing: 0.5 },
  copyTxt:     { fontFamily: "Tajawal_600SemiBold", fontSize: 11 },
  discTag:     { position: "absolute", end: 0, top: 0, bottom: 0, width: 86, borderTopEndRadius: 20, borderBottomEndRadius: 20, alignItems: "center", justifyContent: "center", padding: 8 },
  discTxt:     { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 13, textAlign: "center" },
  notchT:      { position: "absolute", end: 78, top: -7,    width: 14, height: 14, borderRadius: 7 },
  notchB:      { position: "absolute", end: 78, bottom: -7, width: 14, height: 14, borderRadius: 7 },

  copiedOv:  { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  copiedTxt: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 12 },
});
