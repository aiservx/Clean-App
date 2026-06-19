import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, I18nManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

type Plan = {
  id: string;
  name: string;
  price: number;
  yearlyPrice: number;
  visits: number | "unlimited";
  gradientColors: readonly [string, string];
  accentColor: string;
  badge: string | null;
  features: { label: string; included: boolean }[];
};

const PLANS: Plan[] = [
  {
    id: "basic",
    name: "الأساسية",
    price: 199,
    yearlyPrice: 1990,
    visits: 2,
    gradientColors: ["#E0F2FE", "#BAE6FD"],
    accentColor: "#0284C7",
    badge: null,
    features: [
      { label: "زيارتان شهرياً", included: true },
      { label: "خصم 10% على الإضافات", included: true },
      { label: "أولوية الحجز", included: false },
      { label: "مزود ثابت مخصص", included: false },
      { label: "تنظيف عميق ربعي", included: false },
      { label: "دعم مخصص 24/7", included: false },
    ],
  },
  {
    id: "premium",
    name: "البريميوم",
    price: 349,
    yearlyPrice: 3490,
    visits: 4,
    gradientColors: ["#16C47F", "#059669"],
    accentColor: "#059669",
    badge: "الأكثر اختياراً",
    features: [
      { label: "4 زيارات شهرياً", included: true },
      { label: "خصم 20% على الإضافات", included: true },
      { label: "أولوية الحجز", included: true },
      { label: "مزود ثابت مخصص", included: true },
      { label: "تنظيف عميق ربعي", included: false },
      { label: "دعم مخصص 24/7", included: false },
    ],
  },
  {
    id: "vip",
    name: "VIP",
    price: 599,
    yearlyPrice: 5990,
    visits: "unlimited",
    gradientColors: ["#7C3AED", "#4F46E5"],
    accentColor: "#7C3AED",
    badge: "الأفضل قيمةً",
    features: [
      { label: "زيارات غير محدودة", included: true },
      { label: "خصم 35% على الإضافات", included: true },
      { label: "أولوية الحجز الفورية", included: true },
      { label: "مزود ثابت مخصص", included: true },
      { label: "تنظيف عميق ربعي", included: true },
      { label: "دعم مخصص 24/7", included: true },
    ],
  },
];

const BILLING_OPTIONS = [
  { key: "monthly", label: "شهري" },
  { key: "yearly", label: "سنوي  |  وفّر شهرين" },
];

export default function SubscriptionPlansScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { session } = useAuth();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [selected, setSelected] = useState<string | null>(null);

  const handleSubscribe = (plan: Plan) => {
    if (!session) { router.push("/login" as any); return; }
    Alert.alert(
      "الاشتراك قادم قريباً",
      `باقة ${plan.name} ستكون متاحة مع تكامل بوابة الدفع قريباً.\n\nسيتم إخطارك عند الإطلاق.`,
      [{ text: "حسناً", style: "default" }]
    );
  };

  const getPrice = (plan: Plan) =>
    billing === "yearly" ? Math.round(plan.yearlyPrice / 12) : plan.price;

  const getSaving = (plan: Plan) =>
    Math.round(plan.price * 12 - plan.yearlyPrice);

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[st.header, { paddingTop: insets.top + 6, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
          <Feather name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[st.headerT, { color: colors.foreground }]}>باقات الاشتراك</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient colors={["#16C47F22", "#8B5CF622"]} style={st.hero}>
          <MaterialCommunityIcons name="shield-star-outline" size={40} color="#16C47F" />
          <Text style={[st.heroTitle, { color: colors.foreground }]}>اشترك ووفّر أكثر</Text>
          <Text style={[st.heroSub, { color: colors.mutedForeground }]}>
            احصل على خدمة تنظيف منتظمة بسعر أقل مع ضمان الجودة الكاملة
          </Text>
        </LinearGradient>

        {/* Billing toggle */}
        <View style={[st.billingWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {BILLING_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setBilling(opt.key as any)}
              style={[
                st.billingBtn,
                billing === opt.key && { backgroundColor: colors.primary },
              ]}
            >
              <Text style={[
                st.billingT,
                { color: billing === opt.key ? "#FFF" : colors.mutedForeground },
              ]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Plans */}
        <View style={st.plansWrap}>
          {PLANS.map((plan) => {
            const isPremium = plan.id === "premium";
            const isVip = plan.id === "vip";
            const isSelected = selected === plan.id;

            if (isPremium || isVip) {
              return (
                <TouchableOpacity
                  key={plan.id}
                  activeOpacity={0.92}
                  onPress={() => setSelected(plan.id)}
                  style={[st.planCard, isSelected && { borderWidth: 2.5, borderColor: plan.accentColor }]}
                >
                  <LinearGradient
                    colors={plan.gradientColors as any}
                    style={st.planGrad}
                  >
                    {plan.badge && (
                      <View style={[st.badge, { backgroundColor: "rgba(255,255,255,0.3)" }]}>
                        <Text style={st.badgeT}>{plan.badge}</Text>
                      </View>
                    )}
                    <Text style={st.planNameDark}>{plan.name}</Text>
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                      <Text style={st.planPriceDark}>{getPrice(plan)}</Text>
                      <Text style={st.planCurrDark}>ر.س / شهر</Text>
                    </View>
                    {billing === "yearly" && (
                      <Text style={st.planSavingDark}>توفير {getSaving(plan)} ر.س سنوياً</Text>
                    )}
                    <Text style={st.planVisitsDark}>
                      {plan.visits === "unlimited" ? "زيارات غير محدودة" : `${plan.visits} زيارات شهرياً`}
                    </Text>
                  </LinearGradient>

                  <View style={[st.planFeatures, { backgroundColor: colors.card }]}>
                    {plan.features.map((f, i) => (
                      <View key={i} style={st.featureRow}>
                        <MaterialCommunityIcons
                          name={f.included ? "check-circle" : "close-circle-outline"}
                          size={16}
                          color={f.included ? "#16C47F" : "#CBD5E1"}
                        />
                        <Text style={[
                          st.featureT,
                          { color: f.included ? colors.foreground : colors.mutedForeground },
                        ]}>{f.label}</Text>
                      </View>
                    ))}
                    <TouchableOpacity
                      style={[st.subscribeBtn, { backgroundColor: plan.accentColor }]}
                      onPress={() => handleSubscribe(plan)}
                      activeOpacity={0.88}
                    >
                      <Text style={st.subscribeBtnT}>اشترك الآن</Text>
                      <Feather name={I18nManager.isRTL ? "arrow-left" : "arrow-right"} size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                key={plan.id}
                activeOpacity={0.92}
                onPress={() => setSelected(plan.id)}
                style={[
                  st.planCardBasic,
                  { backgroundColor: colors.card, borderColor: isSelected ? plan.accentColor : colors.border },
                  isSelected && { borderWidth: 2.5 },
                ]}
              >
                <View style={[st.planGradBasic, { backgroundColor: "#E0F2FE33" }]}>
                  <Text style={[st.planName, { color: colors.foreground }]}>{plan.name}</Text>
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                    <Text style={[st.planPrice, { color: plan.accentColor }]}>{getPrice(plan)}</Text>
                    <Text style={[st.planCurr, { color: colors.mutedForeground }]}>ر.س / شهر</Text>
                  </View>
                  {billing === "yearly" && (
                    <Text style={[st.planSaving, { color: plan.accentColor }]}>توفير {getSaving(plan)} ر.س سنوياً</Text>
                  )}
                  <Text style={[st.planVisits, { color: colors.mutedForeground }]}>
                    {plan.visits === "unlimited" ? "زيارات غير محدودة" : `${plan.visits} زيارات شهرياً`}
                  </Text>
                </View>
                <View style={st.planFeatures}>
                  {plan.features.map((f, i) => (
                    <View key={i} style={st.featureRow}>
                      <MaterialCommunityIcons
                        name={f.included ? "check-circle" : "close-circle-outline"}
                        size={16}
                        color={f.included ? "#16C47F" : "#CBD5E1"}
                      />
                      <Text style={[
                        st.featureT,
                        { color: f.included ? colors.foreground : colors.mutedForeground },
                      ]}>{f.label}</Text>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={[st.subscribeBtn, { backgroundColor: plan.accentColor }]}
                    onPress={() => handleSubscribe(plan)}
                    activeOpacity={0.88}
                  >
                    <Text style={st.subscribeBtnT}>اشترك الآن</Text>
                    <Feather name={I18nManager.isRTL ? "arrow-left" : "arrow-right"} size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* FAQ section */}
        <View style={[st.faqWrap, { marginHorizontal: 16 }]}>
          <Text style={[st.faqTitle, { color: colors.foreground }]}>أسئلة شائعة</Text>
          {[
            ["هل يمكنني الإلغاء في أي وقت؟", "نعم، يمكنك إلغاء اشتراكك في أي وقت بدون رسوم إضافية."],
            ["ما هو مفهوم 'المزود الثابت'؟", "مزود مخصص لك يتعرف على منزلك واحتياجاتك — مريح ومضمون."],
            ["هل الزيارات تتراكم للشهر التالي؟", "في الباقة الأساسية والبريميوم، تنتهي الزيارات مع نهاية الشهر."],
          ].map(([q, a], i) => (
            <View key={i} style={[st.faqRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="help-circle-outline" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[st.faqQ, { color: colors.foreground }]}>{q}</Text>
                <Text style={[st.faqA, { color: colors.mutedForeground }]}>{a}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 3,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerT: { fontFamily: "Tajawal_700Bold", fontSize: 17 },
  hero: { margin: 16, borderRadius: 20, padding: 24, alignItems: "center", gap: 8 },
  heroTitle: { fontFamily: "Tajawal_700Bold", fontSize: 22 },
  heroSub: { fontFamily: "Tajawal_400Regular", fontSize: 13, textAlign: "center", lineHeight: 20 },
  billingWrap: {
    flexDirection: "row", marginHorizontal: 16, marginBottom: 16,
    borderRadius: 14, borderWidth: 1, padding: 4, gap: 4,
  },
  billingBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  billingT: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  plansWrap: { paddingHorizontal: 16, gap: 16 },
  planCard: {
    borderRadius: 22, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 18, elevation: 6,
    borderWidth: 0,
  },
  planCardBasic: {
    borderRadius: 22, overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  planGrad: { padding: 20, gap: 6 },
  planGradBasic: { padding: 20, gap: 6 },
  badge: {
    alignSelf: "flex-end", paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 100, marginBottom: 4,
  },
  badgeT: { fontFamily: "Tajawal_700Bold", fontSize: 11, color: "#FFF" },
  planName: { fontFamily: "Tajawal_700Bold", fontSize: 18 },
  planNameDark: { fontFamily: "Tajawal_700Bold", fontSize: 18, color: "#FFF" },
  planPrice: { fontFamily: "Tajawal_700Bold", fontSize: 32 },
  planPriceDark: { fontFamily: "Tajawal_700Bold", fontSize: 32, color: "#FFF" },
  planCurr: { fontFamily: "Tajawal_500Medium", fontSize: 13 },
  planCurrDark: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: "rgba(255,255,255,0.85)" },
  planSaving: { fontFamily: "Tajawal_500Medium", fontSize: 12 },
  planSavingDark: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: "rgba(255,255,255,0.8)" },
  planVisits: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  planVisitsDark: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "rgba(255,255,255,0.9)" },
  planFeatures: { padding: 16, gap: 10 },
  featureRow: { flexDirection: I18nManager.isRTL ? "row" : "row-reverse", alignItems: "center", gap: 10 },
  featureT: { fontFamily: "Tajawal_500Medium", fontSize: 13, flex: 1 },
  subscribeBtn: {
    marginTop: 8, height: 48, borderRadius: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  subscribeBtnT: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#FFF" },
  faqWrap: { marginTop: 24, gap: 10 },
  faqTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16, marginBottom: 4 },
  faqRow: {
    flexDirection: I18nManager.isRTL ? "row" : "row-reverse", gap: 10, padding: 14,
    borderRadius: 14, borderWidth: 1,
  },
  faqQ: { fontFamily: "Tajawal_700Bold", fontSize: 13, marginBottom: 4 },
  faqA: { fontFamily: "Tajawal_400Regular", fontSize: 12, lineHeight: 18 },
});
