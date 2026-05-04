import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Platform, I18nManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import FloatingTabBar from "@/components/FloatingTabBar";
import { SEASONAL_PROMOS, GRID_PROMO_ROWS } from "@/lib/promotions";

// ── Static assets ───────────────────────────────────────────────────────────────
const HERO_BANNERS = [
  require("@/assets/images/banners/offers_banner_0.png"),
  require("@/assets/images/banners/offers_banner_1.png"),
  require("@/assets/images/banners/offers_banner_2.png"),
  require("@/assets/images/banners/offers_banner_3.png"),
];

// Flat list of all grid card images with their coupon codes
const GRID_CARDS: { src: any; code: string }[] = ([
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

// ── Layout constants ─────────────────────────────────────────────────────────────
const H_PAD    = 16;          // horizontal padding for content
const GAP      = 10;          // gap between grid cards
const CARD_SZ  = 150;         // fixed square card size – always shows full image
const AR_HERO   = 853 / 440;
const AR_WIDE   = 793 / 340;
const AR_INVITE = 1378 / 563;

// ── Small horizontal-scroll strip of 2 square cards ───────────────────────────
function CardStrip({
  cards, startIdx, copied, onCopy,
}: {
  cards: { src: any; code: string }[];
  startIdx: number;
  copied: string | null;
  onCopy: (code: string, id: string) => void;
}) {
  const slice = cards.slice(startIdx, startIdx + 3);
  if (slice.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: H_PAD, gap: GAP, paddingVertical: 4 }}
      style={{ marginVertical: 10 }}
    >
      {slice.map((g, ci) => {
        const id = `g${startIdx + ci}`;
        return (
          <TouchableOpacity
            key={ci}
            activeOpacity={0.88}
            onPress={() => onCopy(g.code, id)}
            style={{ width: CARD_SZ, height: CARD_SZ, borderRadius: 14, overflow: "hidden" }}
          >
            {/* contain = full image visible, no cropping */}
            <Image source={g.src} style={{ width: CARD_SZ, height: CARD_SZ }} resizeMode="contain" />
            {copied === id && (
              <View style={s.copiedOv}>
                <Text style={s.copiedTxt}>تم النسخ ✓</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────────
export default function OffersScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [copied, setCopied] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);

  // W = true rendered width of the root View — always correct on native & web
  const [W, setW] = useState(0);
  // Derived image dimensions — IMG_W accounts for H_PAD on each side
  const IMG_W  = W > 0 ? W - H_PAD * 2 : 0;
  const HERO_H = IMG_W > 0 ? Math.round(IMG_W / AR_HERO)   : 0;
  const WIDE_H = IMG_W > 0 ? Math.round(IMG_W / AR_WIDE)   : 0;
  const INV_H  = IMG_W > 0 ? Math.round(IMG_W / AR_INVITE) : 0;

  // Auto-advance hero slider
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

  // Interleave: every 2 seasonal banners → 2 grid cards
  // bannerGroup[0] = banners 0-1, cards 0-1
  // bannerGroup[1] = banners 2-3, cards 2-3
  // bannerGroup[2] = banners 4-5, cards 4-5
  const bannerGroups: { banner: typeof SEASONAL_PROMOS[0]; idx: number }[][] = [];
  for (let i = 0; i < SEASONAL_PROMOS.length; i += 2) {
    bannerGroups.push(
      SEASONAL_PROMOS.slice(i, i + 2).map((b, j) => ({ banner: b, idx: i + j }))
    );
  }

  return (
    <View
      style={[s.root, { backgroundColor: colors.background }]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setW(w);
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>العروض والخصومات</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>

        {/* ── HERO SLIDER ─────────────────────────────────────────────── */}
        {IMG_W > 0 && (
          <View style={{ paddingHorizontal: H_PAD, marginBottom: 20 }}>
            {/* overflow:hidden clips any rounding pixel overflow */}
            <View style={{ width: IMG_W, height: HERO_H, borderRadius: 18, overflow: "hidden" }}>
              <Image
                key={`hero-${slide}`}
                source={HERO_BANNERS[slide]}
                style={{ width: IMG_W, height: HERO_H }}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={[s.tapZone, { left: 0 }]}
                onPress={() => setSlide(p => (p - 1 + HERO_BANNERS.length) % HERO_BANNERS.length)}
                activeOpacity={0.05}
              />
              <TouchableOpacity
                style={[s.tapZone, { right: 0 }]}
                onPress={() => setSlide(p => (p + 1) % HERO_BANNERS.length)}
                activeOpacity={0.05}
              />
              <View style={s.badge}>
                <Text style={s.badgeTxt}>{slide + 1} / {HERO_BANNERS.length}</Text>
              </View>
            </View>
            <View style={s.dotsRow}>
              {HERO_BANNERS.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => setSlide(i)}>
                  <View style={[s.dot, {
                    backgroundColor: i === slide ? colors.primary : colors.border,
                    width: i === slide ? 22 : 7,
                  }]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── STATS ───────────────────────────────────────────────────── */}
        <View style={[s.statsRow, { paddingHorizontal: H_PAD, marginBottom: 20 }]}>
          {[
            { icon: "tag",      label: "كوبونات",   val: String(COUPONS.length) },
            { icon: "gift",     label: "عروض",      val: String(SEASONAL_PROMOS.length) },
            { icon: "calendar", label: "موسمية",    val: String(GRID_PROMO_ROWS.length) },
            { icon: "users",    label: "دعوة صديق", val: "50 ر.س", sm: true },
          ].map(st => (
            <View key={st.label} style={[s.statCard, { backgroundColor: colors.card }]}>
              <View style={s.statIcon}><Feather name={st.icon as any} size={17} color="#16C47F" /></View>
              <Text style={[s.statVal, { color: colors.foreground, fontSize: st.sm ? 10 : 18 }]}>{st.val}</Text>
              <Text style={[s.statLbl, { color: colors.mutedForeground }]}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* ── COUPONS ─────────────────────────────────────────────────── */}
        <Text style={[s.secTitle, { color: colors.foreground, paddingHorizontal: H_PAD }]}>كوبونات مميزة</Text>
        <View style={{ paddingHorizontal: H_PAD, gap: 14, marginBottom: 4 }}>
          {COUPONS.map(c => (
            <View key={c.id} style={[s.coupon, { backgroundColor: colors.card }]}>
              <View style={s.couponBody}>
                <Text style={[s.couponTitle, { color: colors.foreground }]}>{c.title}</Text>
                <View style={s.meta}><Feather name="package" size={11} color={colors.mutedForeground} /><Text style={[s.metaTxt, { color: colors.mutedForeground }]}>{c.min}</Text></View>
                <View style={s.meta}><Feather name="clock"   size={11} color={colors.mutedForeground} /><Text style={[s.metaTxt, { color: colors.mutedForeground }]}>{c.exp}</Text></View>
              </View>
              <View style={s.couponRight}>
                <View style={[s.codeBox, { borderColor: c.accent }]}>
                  <Text style={[s.codeTxt, { color: colors.foreground }]}>{c.code}</Text>
                </View>
                <TouchableOpacity onPress={() => copy(c.code, c.id)}>
                  <Text style={[s.copyTxt, { color: c.accent }]}>{copied === c.id ? "تم النسخ ✓" : "نسخ الكود"}</Text>
                </TouchableOpacity>
              </View>
              <View style={[s.discTag, { backgroundColor: c.accent }]}>
                <Text style={s.discTxt}>{c.label}</Text>
              </View>
              <View style={[s.notchT, { backgroundColor: colors.background }]} />
              <View style={[s.notchB, { backgroundColor: colors.background }]} />
            </View>
          ))}
        </View>

        {/* ── INVITE FRIENDS BANNER ───────────────────────────────────── */}
        {IMG_W > 0 && (
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
        )}

        {/* ── SEASONAL BANNERS + GRID CARD PAIRS ──────────────────────── */}
        {IMG_W > 0 && (
          <>
            <Text style={[s.secTitle, { color: colors.foreground, paddingHorizontal: H_PAD, marginTop: 24 }]}>عروض موسمية</Text>

            {bannerGroups.map((group, gi) => (
              <View key={gi}>
                {/* 2 wide banners */}
                <View style={{ paddingHorizontal: H_PAD, gap: 12 }}>
                  {group.map(({ banner, idx }) => (
                    <TouchableOpacity key={banner.id} activeOpacity={0.92} onPress={() => copy(banner.code, `s${idx}`)}>
                      <View style={{ width: IMG_W, height: WIDE_H, borderRadius: 16, overflow: "hidden" }}>
                        <Image
                          source={banner.image}
                          style={{ width: IMG_W, height: WIDE_H }}
                          resizeMode="cover"
                        />
                        {copied === `s${idx}` && (
                          <View style={s.copiedOv}>
                            <Text style={s.copiedTxt}>تم نسخ {banner.code} ✓</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 2 square cards in horizontal scroll, between banner groups */}
                <CardStrip
                  cards={GRID_CARDS}
                  startIdx={gi * 2}
                  copied={copied}
                  onCopy={copy}
                />
              </View>
            ))}
          </>
        )}

      </ScrollView>

      <FloatingTabBar active="offers" />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: H_PAD, marginBottom: 12 },
  backBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Tajawal_700Bold", fontSize: 17 },

  tapZone:  { position: "absolute", top: 0, bottom: 0, width: "40%" },
  badge:    { position: "absolute", bottom: 10, end: 12, backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeTxt: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 11 },
  dotsRow:  { flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 10 },
  dot:      { height: 7, borderRadius: 4 },

  statsRow: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 18, alignItems: "center" },
  statIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#E8F5EE", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  statVal:  { fontFamily: "Tajawal_700Bold", marginBottom: 2 },
  statLbl:  { fontFamily: "Tajawal_500Medium", fontSize: 10, textAlign: "center" },

  secTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16, marginBottom: 12 },

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
