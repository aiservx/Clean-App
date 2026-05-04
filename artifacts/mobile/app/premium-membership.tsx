import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Alert, I18nManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

const PLANS = [
  {
    id: "monthly",
    label: "شهري",
    price: "49",
    period: "ر.س / شهر",
    badge: null,
    color: "#3B82F6",
    gradColors: ["#3B82F6", "#2563EB"] as [string, string],
  },
  {
    id: "yearly",
    label: "سنوي",
    price: "399",
    period: "ر.س / سنة",
    badge: "الأوفر 32%",
    color: "#7C3AED",
    gradColors: ["#7C3AED", "#5B21B6"] as [string, string],
  },
];

const BENEFITS = [
  { icon: "tag", color: "#16C47F",  bg: "#DCFCE7", label: "خصم 20% على جميع الطلبات",         desc: "وفّر على كل حجز طوال مدة عضويتك" },
  { icon: "zap", color: "#F59E0B",  bg: "#FEF3C7", label: "أولوية في التخصيص",                 desc: "احصل على أفضل المزودين بشكل فوري" },
  { icon: "gift", color: "#EC4899", bg: "#FCE7F3", label: "عروض ومفاجآت حصرية",               desc: "كوبونات وهدايا شهرية لأعضاء بريميوم فقط" },
  { icon: "headphones", color: "#3B82F6", bg: "#DBEAFE", label: "دعم أولوية 24/7",             desc: "فريق دعم مخصص يرد في دقائق" },
  { icon: "star", color: "#7C3AED", bg: "#EDE9FE", label: "تقرير جودة شهري",                  desc: "تقرير مفصّل عن خدماتك وتجاربك" },
  { icon: "shield", color: "#0EA5E9", bg: "#E0F2FE", label: "ضمان الرضا أو استرداد الأموال",  desc: "غير راضٍ؟ نسترد لك المبلغ كاملاً" },
];

export default function PremiumMembership() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { session } = useAuth();
  const [selected, setSelected] = useState<"monthly" | "yearly">("yearly");

  const handleSubscribe = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "🌟 العضوية المميزة",
      `سيتم تفعيل الباقة ${selected === "yearly" ? "السنوية" : "الشهرية"} قريباً!\n\nميزة الدفع قيد التطوير وستكون متاحة في التحديث القادم.`,
      [{ text: "حسناً", style: "default" }]
    );
  };

  const plan = PLANS.find(p => p.id === selected)!;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient colors={["#7C3AED", "#4F46E5"]} style={[s.heroGrad, { paddingTop: insets.top + 10 }]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Feather name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.heroTitle}>العضوية المميزة ✨</Text>
            <Text style={s.heroSub}>ارتقِ بتجربتك مع نظافة</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Crown */}
        <View style={s.crownWrap}>
          <View style={s.crownCircle}>
            <MaterialCommunityIcons name="crown" size={52} color="#FDE68A" />
          </View>
          <View style={s.starsBadge}>
            <MaterialCommunityIcons name="star" size={11} color="#FDE68A" />
            <Text style={s.starsBadgeT}>Premium Member</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Plans */}
        <View style={s.plansRow}>
          {PLANS.map((p) => {
            const isSelected = selected === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.88}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.selectionAsync();
                  setSelected(p.id as any);
                }}
                style={[s.planCard, isSelected && { borderColor: p.color, borderWidth: 2.5 }]}
              >
                {isSelected && (
                  <LinearGradient colors={p.gradColors} style={s.planSelectedGrad} />
                )}
                {p.badge && (
                  <View style={[s.planBadge, { backgroundColor: p.color }]}>
                    <Text style={s.planBadgeT}>{p.badge}</Text>
                  </View>
                )}
                <Text style={[s.planLabel, isSelected && { color: "#FFF" }]}>{p.label}</Text>
                <Text style={[s.planPrice, isSelected && { color: "#FFF" }]}>{p.price}</Text>
                <Text style={[s.planPeriod, isSelected && { color: "rgba(255,255,255,0.8)" }]}>{p.period}</Text>
                {isSelected && (
                  <View style={s.planCheck}>
                    <Feather name="check-circle" size={16} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Benefits */}
        <View style={[s.benefitsCard, { backgroundColor: colors.card }]}>
          <Text style={[s.benefitsTitle, { color: colors.foreground }]}>مميزات العضوية</Text>
          {BENEFITS.map((b, i) => (
            <View key={i} style={[s.benefitRow, i < BENEFITS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={[s.benefitLabel, { color: colors.foreground }]}>{b.label}</Text>
                <Text style={[s.benefitDesc, { color: colors.mutedForeground }]}>{b.desc}</Text>
              </View>
              <View style={[s.benefitIcon, { backgroundColor: b.bg }]}>
                <Feather name={b.icon as any} size={18} color={b.color} />
              </View>
            </View>
          ))}
        </View>

        {/* Trust */}
        <View style={[s.trustRow, { backgroundColor: colors.card }]}>
          {[
            { icon: "shield", label: "آمن 100%", color: "#16C47F" },
            { icon: "rotate-ccw", label: "استرداد مضمون", color: "#3B82F6" },
            { icon: "x-circle", label: "إلغاء في أي وقت", color: "#F59E0B" },
          ].map((t, i) => (
            <View key={i} style={s.trustItem}>
              <Feather name={t.icon as any} size={20} color={t.color} />
              <Text style={[s.trustLabel, { color: colors.foreground }]}>{t.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={[s.cta, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity activeOpacity={0.9} onPress={handleSubscribe}>
          <LinearGradient colors={plan.gradColors} style={s.ctaBtn}>
            <MaterialCommunityIcons name="crown" size={18} color="#FDE68A" />
            <Text style={s.ctaBtnT}>
              اشترك الآن · {plan.price} {plan.period}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        <Text style={[s.ctaSub, { color: colors.mutedForeground }]}>
          يمكنك إلغاء الاشتراك في أي وقت بدون رسوم
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  heroGrad: { paddingHorizontal: 16, paddingBottom: 32 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  heroTitle: { fontFamily: "Tajawal_700Bold", fontSize: 18, color: "#FFF" },
  heroSub: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },

  crownWrap: { alignItems: "center", paddingVertical: 8 },
  crownCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  starsBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 5, borderRadius: 100 },
  starsBadgeT: { fontFamily: "Tajawal_700Bold", fontSize: 12, color: "#FDE68A" },

  plansRow: { flexDirection: "row", paddingHorizontal: 16, gap: 12, marginTop: -16, marginBottom: 16 },
  planCard: {
    flex: 1, borderRadius: 20, padding: 16, alignItems: "center",
    backgroundColor: "#FFF", borderWidth: 1.5, borderColor: "#E2E8F0",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    overflow: "hidden", position: "relative", minHeight: 130,
  },
  planSelectedGrad: { ...StyleSheet.absoluteFillObject, borderRadius: 20 },
  planBadge: { position: "absolute", top: 10, start: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  planBadgeT: { fontFamily: "Tajawal_700Bold", fontSize: 10, color: "#FFF" },
  planLabel: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#1E293B", marginTop: 8 },
  planPrice: { fontFamily: "Tajawal_700Bold", fontSize: 28, color: "#1E293B", marginTop: 4 },
  planPeriod: { fontFamily: "Tajawal_500Medium", fontSize: 11, color: "#64748B", marginTop: 2 },
  planCheck: { marginTop: 8 },

  benefitsCard: { marginHorizontal: 16, borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  benefitsTitle: { fontFamily: "Tajawal_700Bold", fontSize: 15, marginBottom: 12, textAlign: "right" },
  benefitRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  benefitIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  benefitLabel: { fontFamily: "Tajawal_700Bold", fontSize: 13, marginBottom: 2 },
  benefitDesc: { fontFamily: "Tajawal_400Regular", fontSize: 11, lineHeight: 16 },

  trustRow: { marginHorizontal: 16, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 12, flexDirection: "row", justifyContent: "space-around", marginBottom: 8 },
  trustItem: { alignItems: "center", gap: 6 },
  trustLabel: { fontFamily: "Tajawal_600SemiBold", fontSize: 11 },

  cta: { position: "absolute", bottom: 0, start: 0, end: 0, paddingHorizontal: 20, paddingTop: 12, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 8 },
  ctaBtn: { height: 54, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  ctaBtnT: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#FFF" },
  ctaSub: { fontFamily: "Tajawal_400Regular", fontSize: 11, textAlign: "center", marginTop: 8 },
});
