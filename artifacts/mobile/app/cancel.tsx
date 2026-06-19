import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, ActivityIndicator, Animated, I18nManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

// ── Cancellation Reasons ──────────────────────────────────────────────────────
type Reason = { id: string; label: string; icon: string; canRetain: boolean };
const REASONS: Reason[] = [
  { id: "time",      label: "الوقت لا يناسبني",         icon: "clock-alert-outline",     canRetain: true  },
  { id: "price",     label: "السعر مرتفع",               icon: "currency-usd-off",         canRetain: true  },
  { id: "provider",  label: "أريد تغيير الفني",          icon: "account-switch-outline",   canRetain: true  },
  { id: "mistake",   label: "حجز خاطئ",                  icon: "pencil-off-outline",       canRetain: false },
  { id: "emergency", label: "ظروف طارئة",                icon: "alert-circle-outline",     canRetain: false },
  { id: "other",     label: "سبب آخر",                   icon: "dots-horizontal-circle-outline", canRetain: false },
];

// ── Retention Offer Component ─────────────────────────────────────────────────
function RetentionOffer({ onKeep, onProceed, colors }: {
  onKeep: () => void;
  onProceed: () => void;
  colors: any;
}) {
  const pulse = useState(new Animated.Value(1))[0];
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={offer.container}>
      <LinearGradient colors={["#FEF3C7", "#FDE68A"]} style={offer.gradient}>
        <Text style={offer.emoji}>🎁</Text>
        <Text style={offer.title}>انتظر! لديك عرض خاص</Text>
        <Text style={offer.subtitle}>
          احتفظ بحجزك الآن واحصل على{" "}
          <Text style={offer.highlight}>10% خصم</Text>{" "}
          على طلبك التالي — العرض لمدة 24 ساعة فقط!
        </Text>
        <Animated.View style={{ transform: [{ scale: pulse }], width: "100%" }}>
          <TouchableOpacity style={[offer.keepBtn, { backgroundColor: colors.primary }]} onPress={onKeep}>
            <Text style={offer.keepText}>✅ سأحتفظ بالحجز</Text>
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity style={offer.proceedBtn} onPress={onProceed}>
          <Text style={offer.proceedText}>لا، سأكمل الإلغاء</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const offer = StyleSheet.create({
  container: { marginTop: 16 },
  gradient: { borderRadius: 24, padding: 24, alignItems: "center" },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontFamily: "Tajawal_700Bold", fontSize: 20, color: "#92400E", marginBottom: 8, textAlign: "center" },
  subtitle: { fontFamily: "Tajawal_400Regular", fontSize: 14, color: "#78350F", textAlign: "center", marginBottom: 20, lineHeight: 22 },
  highlight: { fontFamily: "Tajawal_700Bold", color: "#D97706", fontSize: 16 },
  keepBtn: { width: "100%", height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  keepText: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#FFF" },
  proceedBtn: { paddingVertical: 8 },
  proceedText: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: "#92400E", textDecorationLine: "underline" },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function CancelScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ bookingId: string; providerId?: string; serviceTitle?: string }>();
  const { bookingId, providerId, serviceTitle } = params;

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [step, setStep] = useState<"reason" | "retention" | "cancelling" | "done">("reason");
  const [cancelledWithOffer, setCancelledWithOffer] = useState(false);
  const successScale = useState(new Animated.Value(0))[0];

  const selectedReasonObj = REASONS.find((r) => r.id === selectedReason);

  const onReasonNext = () => {
    if (!selectedReason) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (selectedReasonObj?.canRetain) {
      setStep("retention");
    } else {
      doCancel(false);
    }
  };

  const onKeepBooking = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const doCancel = async (withOffer: boolean) => {
    setStep("cancelling");
    setCancelledWithOffer(withOffer);
    if (!session?.user || !bookingId) { router.back(); return; }

    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
    await supabase.from("booking_status_log").insert({
      booking_id: bookingId,
      status: "cancelled",
      note: `ألغي بواسطة العميل — السبب: ${selectedReasonObj?.label ?? "غير محدد"}`,
    });

    if (providerId) {
      createNotification(
        providerId,
        "booking_cancelled",
        "❌ تم إلغاء الطلب",
        `قام العميل بإلغاء طلب ${serviceTitle ?? ""} — السبب: ${selectedReasonObj?.label ?? ""}`,
        { bookingId }
      );
    }

    if (withOffer) {
      const code = `KEEP${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      await supabase.from("promo_codes").insert({
        code,
        discount_pct: 10,
        max_uses: 1,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        description: "مكافأة احتفاظ بالعميل",
      }).select().maybeSingle();
    }

    setStep("done");
    Animated.spring(successScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 6 }).start();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  // ── Done Screen ─────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <View style={[s.root, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 32 }]}>
        <Animated.View style={{ transform: [{ scale: successScale }], alignItems: "center" }}>
          <View style={[s.doneCircle, { backgroundColor: "#FEF2F2" }]}>
            <MaterialCommunityIcons name="close-circle-outline" size={64} color="#EF4444" />
          </View>
          <Text style={[s.doneTitle, { color: colors.foreground }]}>تم إلغاء الطلب</Text>
          <Text style={[s.doneSub, { color: colors.mutedForeground }]}>
            نأسف لذلك! يمكنك حجز خدمة جديدة في أي وقت
          </Text>

          {cancelledWithOffer && (
            <View style={[s.couponBanner, { backgroundColor: colors.card, borderColor: "#F59E0B" }]}>
              <Text style={s.couponIcon}>🎁</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.couponTitle, { color: colors.foreground }]}>حصلت على كوبون 10% خصم</Text>
                <Text style={[s.couponSub, { color: colors.mutedForeground }]}>سيصلك في قسم العروض قريباً</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[s.homeBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace("/(tabs)/home" as any)}
          >
            <Text style={s.homeBtnT}>العودة للرئيسية</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.rebookBtn, { borderColor: colors.border }]}
            onPress={() => router.replace("/services" as any)}
          >
            <Text style={[s.rebookBtnT, { color: colors.primary }]}>حجز خدمة جديدة</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (step === "cancelling") {
    return (
      <View style={[s.root, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[s.loadingText, { color: colors.mutedForeground }]}>جاري إلغاء الطلب…</Text>
      </View>
    );
  }

  // ── Main ────────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[s.hIcon, { backgroundColor: colors.card }]} onPress={() => router.back()}>
          <Feather name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[s.hTitle, { color: colors.foreground }]}>إلغاء الطلب</Text>
        <View style={s.hIcon} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {step === "reason" && (
          <>
            {/* Warning Banner */}
            <LinearGradient colors={["#FEF3C7", "#FFFBEB"]} style={s.warningBanner}>
              <MaterialCommunityIcons name="alert-outline" size={24} color="#D97706" />
              <View style={{ flex: 1, marginStart: 10 }}>
                <Text style={s.warningTitle}>قبل الإلغاء</Text>
                <Text style={s.warningText}>
                  {serviceTitle ? `طلب "${serviceTitle}" ` : "الطلب "}
                  قيد المعالجة. إلغاء متكرر قد يؤثر على أولوية خدمتك.
                </Text>
              </View>
            </LinearGradient>

            {/* Reasons */}
            <Text style={[s.sectionTitle, { color: colors.foreground }]}>ما سبب إلغائك؟</Text>
            <Text style={[s.sectionSub, { color: colors.mutedForeground }]}>
              رأيك يساعدنا على تحسين الخدمة
            </Text>

            <View style={s.reasonsGrid}>
              {REASONS.map((r) => {
                const sel = selectedReason === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => {
                      if (Platform.OS !== "web") Haptics.selectionAsync();
                      setSelectedReason(r.id);
                    }}
                    activeOpacity={0.8}
                    style={[
                      s.reasonCard,
                      { backgroundColor: colors.card, borderColor: sel ? colors.primary : colors.border },
                      sel && { backgroundColor: colors.primary + "10" },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={r.icon as any}
                      size={26}
                      color={sel ? colors.primary : colors.mutedForeground}
                    />
                    <Text style={[s.reasonLabel, { color: sel ? colors.primary : colors.foreground }]}>
                      {r.label}
                    </Text>
                    {sel && (
                      <View style={[s.checkDot, { backgroundColor: colors.primary }]}>
                        <Feather name="check" size={10} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={onReasonNext}
              disabled={!selectedReason}
              style={[s.nextBtn, { backgroundColor: selectedReason ? "#EF4444" : colors.border }]}
            >
              <Text style={s.nextBtnT}>متابعة الإلغاء</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.backRow} onPress={() => router.back()}>
              <Text style={[s.backText, { color: colors.primary }]}>← لا، أريد الإبقاء على الطلب</Text>
            </TouchableOpacity>
          </>
        )}

        {step === "retention" && (
          <RetentionOffer
            colors={colors}
            onKeep={onKeepBooking}
            onProceed={() => doCancel(true)}
          />
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: I18nManager.isRTL ? "row" : "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  hIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  hTitle: { fontFamily: "Tajawal_700Bold", fontSize: 18 },

  warningBanner: {
    flexDirection: I18nManager.isRTL ? "row" : "row-reverse",
    alignItems: "flex-start",
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
  },
  warningTitle: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#92400E", marginBottom: 4 },
  warningText: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#78350F", lineHeight: 18 },

  sectionTitle: { fontFamily: "Tajawal_700Bold", fontSize: 17, marginBottom: 4 },
  sectionSub: { fontFamily: "Tajawal_400Regular", fontSize: 13, marginBottom: 16 },

  reasonsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  reasonCard: {
    width: "47%",
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  reasonLabel: { fontFamily: "Tajawal_600SemiBold", fontSize: 13, textAlign: "center" },
  checkDot: {
    position: "absolute", top: -6, end: -6,
    width: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#FFF",
  },

  nextBtn: {
    height: 56, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  nextBtnT: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#FFF" },
  backRow: { alignItems: "center", paddingVertical: 8 },
  backText: { fontFamily: "Tajawal_600SemiBold", fontSize: 14 },

  loadingText: { fontFamily: "Tajawal_500Medium", fontSize: 14, marginTop: 16 },

  doneCircle: { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  doneTitle: { fontFamily: "Tajawal_700Bold", fontSize: 22, textAlign: "center", marginBottom: 8 },
  doneSub: { fontFamily: "Tajawal_400Regular", fontSize: 14, textAlign: "center", marginBottom: 24, paddingHorizontal: 24 },

  couponBanner: {
    flexDirection: I18nManager.isRTL ? "row" : "row-reverse",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 24,
    width: "100%",
  },
  couponIcon: { fontSize: 28 },
  couponTitle: { fontFamily: "Tajawal_700Bold", fontSize: 14, marginBottom: 2 },
  couponSub: { fontFamily: "Tajawal_400Regular", fontSize: 12 },

  homeBtn: { width: "100%", height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  homeBtnT: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#FFF" },
  rebookBtn: { width: "100%", height: 50, borderRadius: 16, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  rebookBtnT: { fontFamily: "Tajawal_700Bold", fontSize: 15 },
});
