import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

const { width: SW } = Dimensions.get("window");

const FILTERS = [
  { id: "all", label: "الكل", icon: "star" as const, iconLib: "feather" },
  { id: "seasonal", label: "عروض موسمية", icon: "leaf" as const, iconLib: "mci" },
  { id: "discounts", label: "خصومات", icon: "percent" as const, iconLib: "feather" },
  { id: "referral", label: "دعوة الأصدقاء", icon: "account-group" as const, iconLib: "mci" },
];

const SEASONAL = [
  {
    id: "summer",
    title: "استعد للصيف",
    discount: "15",
    desc: "على تنظيف المكيفات",
    time: { h: "10", m: "15", s: "30" },
    bg: "#EBF5FF",
    accent: "#3B82F6",
    iconName: "air-conditioner" as const,
  },
  {
    id: "spring",
    title: "تنظيف الربيع",
    discount: "20",
    desc: "على التنظيف العميق",
    time: { h: "08", m: "21", s: "47" },
    bg: "#ECFDF5",
    accent: "#16C47F",
    iconName: "broom" as const,
  },
  {
    id: "eid",
    title: "عرض العيد",
    discount: "25",
    desc: "على جميع خدمات التنظيف",
    time: { h: "05", m: "18", s: "32" },
    bg: "#FFF7ED",
    accent: "#F59E0B",
    iconName: "mosque" as const,
  },
];

const PREMIUM = [
  { id: "loyal", title: "خصم العملاء الدائمين", desc: "خصم 10% على كل 5\nطلبات متتالية", icon: "shield-check-outline" as const, color: "#EF4444", bg: "#FEF2F2" },
  { id: "monthly", title: "اشتراك شهري", desc: "خصم يصل إلى 35%\nعلى الاشتراكات الشهرية", icon: "crown-outline" as const, color: "#F59E0B", bg: "#FFFBEB" },
  { id: "corporate", title: "للشركات", desc: "عروض خاصة للشركات\nوالمكاتب", icon: "office-building-outline" as const, color: "#3B82F6", bg: "#EFF6FF" },
];

export default function OffersScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [activeFilter, setActiveFilter] = useState("all");
  const [dot, setDot] = useState(0);

  const copyCode = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText("CLEAN30").catch(() => {});
    }
  };

  return (
    <View style={[s.root, { backgroundColor: "#F8FAFC" }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={s.hIcon} onPress={() => router.push("/notifications")}>
          <Feather name="bell" size={20} color="#1E293B" />
          <View style={s.notifDot} />
        </TouchableOpacity>
        <View style={s.hCenter}>
          <Text style={s.hTitle}>العروض والخصومات</Text>
          <Text style={s.hSub}>عروض حصرية عليك لا تفوتها!</Text>
        </View>
        <TouchableOpacity style={s.hIcon}>
          <Feather name="gift" size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersWrap}>
        {FILTERS.map((f) => {
          const active = activeFilter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => setActiveFilter(f.id)}
              style={[s.filterTab, active && { backgroundColor: "#3B82F6" }]}
            >
              {f.iconLib === "mci" ? (
                <MaterialCommunityIcons name={f.icon as any} size={16} color={active ? "#FFF" : "#64748B"} />
              ) : (
                <Feather name={f.icon as any} size={14} color={active ? "#FFF" : "#64748B"} />
              )}
              <Text style={[s.filterLabel, { color: active ? "#FFF" : "#64748B" }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Hero Banner */}
        <View style={s.heroWrap}>
          <LinearGradient colors={["#DBEAFE", "#EFF6FF"]} style={s.heroCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <View style={s.heroLeft}>
              <View style={s.heroBadge}>
                <Text style={s.heroBadgeText}>خصم حتى</Text>
                <Text style={s.heroBadgeNum}>30%</Text>
              </View>
              <Image source={require("@/assets/images/offers-hero-basket.jpg")} style={s.heroImg} resizeMode="contain" />
            </View>
            <View style={s.heroRight}>
              <Text style={s.heroTitle}>عرض خاص على</Text>
              <Text style={s.heroTitleBold}>تنظيف المنازل</Text>
              <Text style={s.heroDesc}>للفترة محدودة! احجز الآن واستفد من{"\n"}خصم يصل إلى 30% على جميع خدمات{"\n"}تنظيف المنازل.</Text>
              <TouchableOpacity style={s.heroCta} onPress={() => router.push("/services")}>
                <Text style={s.heroCtaText}>احجز الآن</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
          <View style={s.dots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[s.dot, { backgroundColor: dot === i ? "#3B82F6" : "#CBD5E1", width: dot === i ? 20 : 8 }]} />
            ))}
          </View>
        </View>

        {/* Seasonal Offers */}
        {(activeFilter === "all" || activeFilter === "seasonal") && <View style={s.secHeader}>
          <TouchableOpacity style={s.seeAllRow}>
            <Feather name="chevron-left" size={16} color="#3B82F6" />
            <Text style={s.seeAll}>عرض الكل</Text>
          </TouchableOpacity>
          <View style={s.secTitleRow}>
            <Text style={s.secTitle}>عروض موسمية</Text>
            <MaterialCommunityIcons name="star-four-points" size={18} color="#3B82F6" />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.seasonalScroll}>
          {SEASONAL.map((item) => (
            <View key={item.id} style={[s.seasonCard, { backgroundColor: item.bg }]}>
              <View style={s.seasonTop}>
                <View style={[s.seasonIconWrap, { backgroundColor: item.accent + "20" }]}>
                  <MaterialCommunityIcons name={item.iconName as any} size={28} color={item.accent} />
                </View>
                <View style={s.seasonTitleWrap}>
                  <Text style={s.seasonTitle}>{item.title}</Text>
                  <Text style={s.seasonKhasm}>خصم</Text>
                </View>
              </View>
              <Text style={[s.seasonDiscount, { color: item.accent }]}>{item.discount}%</Text>
              <Text style={s.seasonDesc}>{item.desc}</Text>
              <View style={s.seasonTimerWrap}>
                <Text style={s.seasonTimerLabel}>ينتهي خلال</Text>
                <View style={s.timerRow}>
                  <View style={s.timerBox}><Text style={s.timerNum}>{item.time.s}</Text><Text style={s.timerUnit}>ث</Text></View>
                  <Text style={s.timerSep}>:</Text>
                  <View style={s.timerBox}><Text style={s.timerNum}>{item.time.m}</Text><Text style={s.timerUnit}>د</Text></View>
                  <Text style={s.timerSep}>:</Text>
                  <View style={s.timerBox}><Text style={s.timerNum}>{item.time.h}</Text><Text style={s.timerUnit}>س</Text></View>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>}

        {/* Referral / Invite Friends */}
        {(activeFilter === "all" || activeFilter === "referral") && <>
        <View style={s.secHeader}>
          <View />
          <View style={s.secTitleRow}>
            <Text style={s.secTitle}>دعوة الأصدقاء</Text>
            <MaterialCommunityIcons name="account-group" size={18} color="#3B82F6" />
          </View>
        </View>

        <View style={s.referralCard}>
          <Image source={require("@/assets/images/illustration-referral.png")} style={s.referralImg} resizeMode="contain" />
          <View style={s.referralContent}>
            <Text style={s.referralTitle}>ادعُ أصدقائك{"\n"}واحصل على مكافآت!</Text>
            <Text style={s.referralDesc}>احصل على 30 ريال لكل صديق يدعو لأول{"\n"}مرة ويحصل على 20 ريال إضافية عند أول{"\n"}حجز له.</Text>
            <View style={s.referralActions}>
              <TouchableOpacity style={s.referralShareBtn}>
                <Feather name="share-2" size={16} color="#FFF" />
                <Text style={s.referralShareText}>دعوة الأصدقاء</Text>
              </TouchableOpacity>
              <View style={s.codeBox}>
                <TouchableOpacity onPress={copyCode}>
                  <Feather name="copy" size={14} color="#64748B" />
                </TouchableOpacity>
                <Text style={s.codeText}>CLEAN30</Text>
                <Text style={s.codeLabel}>كود الدعوة</Text>
              </View>
            </View>
          </View>
        </View>
        </>}

        {/* Premium Discounts */}
        {(activeFilter === "all" || activeFilter === "discounts") && <>
        <View style={s.secHeader}>
          <View />
          <View style={s.secTitleRow}>
            <Text style={s.secTitle}>خصومات مميزة</Text>
            <MaterialCommunityIcons name="diamond-stone" size={18} color="#3B82F6" />
          </View>
        </View>

        <View style={s.premiumRow}>
          {PREMIUM.map((p) => (
            <View key={p.id} style={[s.premiumCard, { backgroundColor: p.bg }]}>
              <View style={[s.premiumIconWrap, { backgroundColor: p.color + "20" }]}>
                <MaterialCommunityIcons name={p.icon as any} size={24} color={p.color} />
              </View>
              <Text style={s.premiumTitle}>{p.title}</Text>
              <Text style={s.premiumDesc}>{p.desc}</Text>
              <TouchableOpacity>
                <Text style={[s.premiumLink, { color: p.color }]}>«المزيد</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        </>}
      </ScrollView>
    </View>
  );
}

const CARD_W = (SW - 48 - 16) / 3;

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  hIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  notifDot: { position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: "#3B82F6", borderWidth: 2, borderColor: "#FFF" },
  hCenter: { flex: 1, alignItems: "center" },
  hTitle: { fontFamily: "Tajawal_700Bold", fontSize: 18, color: "#1E293B" },
  hSub: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#94A3B8", marginTop: 2 },

  filtersWrap: { paddingHorizontal: 16, gap: 8, paddingBottom: 16 },
  filterTab: { flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E2E8F0" },
  filterLabel: { fontFamily: "Tajawal_600SemiBold", fontSize: 13 },

  heroWrap: { paddingHorizontal: 16, marginBottom: 20 },
  heroCard: { borderRadius: 24, flexDirection: "row", padding: 16, minHeight: 180, overflow: "hidden" },
  heroLeft: { width: 120, alignItems: "center", justifyContent: "center" },
  heroBadge: { backgroundColor: "#16C47F", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center", marginBottom: 6, zIndex: 2 },
  heroBadgeText: { fontFamily: "Tajawal_500Medium", fontSize: 10, color: "#FFF" },
  heroBadgeNum: { fontFamily: "Tajawal_700Bold", fontSize: 20, color: "#FFF" },
  heroImg: { width: 110, height: 100 },
  heroRight: { flex: 1, alignItems: "flex-end", justifyContent: "center", paddingRight: 8 },
  heroTitle: { fontFamily: "Tajawal_600SemiBold", fontSize: 16, color: "#1E293B", textAlign: "right" },
  heroTitleBold: { fontFamily: "Tajawal_700Bold", fontSize: 22, color: "#3B82F6", textAlign: "right", marginBottom: 6 },
  heroDesc: { fontFamily: "Tajawal_400Regular", fontSize: 11, color: "#64748B", textAlign: "right", lineHeight: 18, marginBottom: 12 },
  heroCta: { backgroundColor: "#3B82F6", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  heroCtaText: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#FFF" },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12 },
  dot: { height: 8, borderRadius: 4 },

  secHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 14 },
  secTitleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  secTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#1E293B" },
  seeAllRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAll: { fontFamily: "Tajawal_600SemiBold", fontSize: 13, color: "#3B82F6" },

  seasonalScroll: { paddingHorizontal: 16, gap: 10, paddingBottom: 4, marginBottom: 20 },
  seasonCard: { width: CARD_W, borderRadius: 20, padding: 14, alignItems: "center" },
  seasonTop: { flexDirection: "row-reverse", alignItems: "center", width: "100%", marginBottom: 6 },
  seasonIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  seasonTitleWrap: { flex: 1, alignItems: "flex-end", marginRight: 8 },
  seasonTitle: { fontFamily: "Tajawal_700Bold", fontSize: 12, color: "#1E293B" },
  seasonKhasm: { fontFamily: "Tajawal_500Medium", fontSize: 11, color: "#64748B" },
  seasonDiscount: { fontFamily: "Tajawal_700Bold", fontSize: 32, marginVertical: 2 },
  seasonDesc: { fontFamily: "Tajawal_400Regular", fontSize: 10, color: "#64748B", textAlign: "center", marginBottom: 8 },
  seasonTimerWrap: { alignItems: "center" },
  seasonTimerLabel: { fontFamily: "Tajawal_500Medium", fontSize: 10, color: "#64748B", marginBottom: 4 },
  timerRow: { flexDirection: "row-reverse", alignItems: "center", gap: 2 },
  timerBox: { alignItems: "center", minWidth: 22 },
  timerNum: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#1E293B" },
  timerUnit: { fontFamily: "Tajawal_400Regular", fontSize: 9, color: "#94A3B8" },
  timerSep: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#94A3B8" },

  referralCard: { marginHorizontal: 16, borderRadius: 24, backgroundColor: "#F0FDF4", padding: 16, flexDirection: "row-reverse", alignItems: "center", marginBottom: 24, overflow: "hidden" },
  referralImg: { width: 110, height: 140 },
  referralContent: { flex: 1, alignItems: "flex-end", paddingRight: 10 },
  referralTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#16C47F", textAlign: "right", marginBottom: 6 },
  referralDesc: { fontFamily: "Tajawal_400Regular", fontSize: 11, color: "#64748B", textAlign: "right", lineHeight: 18, marginBottom: 12 },
  referralActions: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  referralShareBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 6, backgroundColor: "#EF4444", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  referralShareText: { fontFamily: "Tajawal_700Bold", fontSize: 12, color: "#FFF" },
  codeBox: { flexDirection: "row-reverse", alignItems: "center", gap: 6, backgroundColor: "#FFF", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0" },
  codeText: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#1E293B" },
  codeLabel: { fontFamily: "Tajawal_400Regular", fontSize: 10, color: "#94A3B8" },

  premiumRow: { flexDirection: "row-reverse", paddingHorizontal: 16, gap: 10, marginBottom: 24 },
  premiumCard: { flex: 1, borderRadius: 20, padding: 14, alignItems: "center" },
  premiumIconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  premiumTitle: { fontFamily: "Tajawal_700Bold", fontSize: 12, color: "#1E293B", textAlign: "center", marginBottom: 4 },
  premiumDesc: { fontFamily: "Tajawal_400Regular", fontSize: 10, color: "#64748B", textAlign: "center", lineHeight: 16, marginBottom: 6 },
  premiumLink: { fontFamily: "Tajawal_600SemiBold", fontSize: 11 },
});
