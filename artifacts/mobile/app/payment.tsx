import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform , I18nManager} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons, FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useBooking, DEFAULT_SERVICE } from "@/store/booking";
import { createNotification, notifyAvailableProviders } from "@/lib/notifications";

type Method = {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  type: "visa" | "mada" | "mastercard" | "apple" | "stcpay" | "cash" | "tamara";
};

const PAYMENT_METHODS: Method[] = [
  { id: "1", title: "بطاقة ائتمانية", subtitle: "**** **** **** 4242", badge: "موصى بها", type: "visa" },
  { id: "5", title: "مدى", subtitle: "بطاقة مدى البنكية", type: "mada" },
  { id: "2", title: "Apple Pay", subtitle: "ادفع بسرعة وأمان", type: "apple" },
  { id: "6", title: "STC Pay", subtitle: "محفظة STC الرقمية", type: "stcpay" },
  { id: "4", title: "تمارا", subtitle: "قسّم على 4 دفعات بدون فوائد", type: "tamara" },
  { id: "3", title: "الدفع نقداً", subtitle: "ادفع نقداً عند استلام الخدمة", type: "cash" },
];

// Inline pseudo-logo components — no broken images, looks real, recognizable colors
function MethodLogo({ type }: { type: Method["type"] }) {
  if (type === "visa") {
    return (
      <View style={[lg.box, { backgroundColor: "#1A1F71" }]}>
        <Text style={[lg.text, { color: "#F7B600", fontSize: 12, letterSpacing: 1 }]}>VISA</Text>
      </View>
    );
  }
  if (type === "mastercard") {
    return (
      <View style={lg.boxRow}>
        <View style={[lg.circle, { backgroundColor: "#EB001B" }]} />
        <View style={[lg.circle, { backgroundColor: "#F79E1B", marginStart: -10, opacity: 0.9 }]} />
      </View>
    );
  }
  if (type === "mada") {
    return (
      <View style={[lg.box, { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" }]}>
        <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 11, color: "#84B740" }}>m</Text>
        <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 11, color: "#005DAA" }}>ada</Text>
      </View>
    );
  }
  if (type === "apple") {
    return (
      <View style={[lg.box, { backgroundColor: "#000000" }]}>
        <FontAwesome name="apple" size={16} color="#FFFFFF" style={{ marginTop: -2 }} />
        <Text style={{ color: "#FFFFFF", fontFamily: "Tajawal_700Bold", fontSize: 9, marginTop: -2 }}>Pay</Text>
      </View>
    );
  }
  if (type === "stcpay") {
    return (
      <View style={[lg.box, { backgroundColor: "#5F006E" }]}>
        <Text style={{ color: "#FFFFFF", fontFamily: "Tajawal_700Bold", fontSize: 10 }}>stc</Text>
        <Text style={{ color: "#FFFFFF", fontFamily: "Tajawal_500Medium", fontSize: 8 }}>pay</Text>
      </View>
    );
  }
  if (type === "tamara") {
    return (
      <View style={[lg.box, { backgroundColor: "#FB923C" }]}>
        <Text style={{ color: "#FFFFFF", fontFamily: "Tajawal_700Bold", fontSize: 10 }}>tamara</Text>
      </View>
    );
  }
  // cash
  return (
    <View style={[lg.box, { backgroundColor: "#16C47F22" }]}>
      <MaterialCommunityIcons name="cash-multiple" size={20} color="#16C47F" />
    </View>
  );
}

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const booking = useBooking();
  const selectedMethod = booking.paymentMethodId;
  const setSelectedMethod = (id: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    booking.setPaymentMethodId(id);
  };

  const service = booking.service ?? DEFAULT_SERVICE;
  const totals = useMemo(() => {
    const base = service.price;
    const fee = 10;
    const subtotal = base + fee;
    const vat = Math.round(subtotal * 0.15 * 100) / 100;
    const total = Math.round((subtotal + vat) * 100) / 100;
    return { base, fee, subtotal, vat, total };
  }, [service.price]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
          <Feather name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>الدفع</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>اختر طريقة الدفع المناسبة</Text>
        </View>
        <View style={[styles.safeBadge, { backgroundColor: colors.successLight }]}>
          <Feather name="shield" size={12} color={colors.success} />
          <Text style={[styles.safeBadgeText, { color: colors.success }]}>دفع آمن</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Total Amount Card — REDESIGNED with wallet icon as a floating background motif */}
        <View style={styles.totalWrap}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.totalCard}
          >
            {/* Decorative bg circles */}
            <View style={[styles.bgCircle, { top: -40, end: -40, backgroundColor: "rgba(255,255,255,0.08)" }]} />
            <View style={[styles.bgCircle, { bottom: -30, start: -30, width: 140, height: 140, backgroundColor: "rgba(255,255,255,0.06)" }]} />

            {/* Big floating wallet glyph */}
            <View style={styles.walletGlyph}>
              <MaterialCommunityIcons name="wallet" size={120} color="rgba(255,255,255,0.18)" />
            </View>

            <View style={styles.totalContent}>
              <View style={styles.totalChip}>
                <Feather name="lock" size={11} color="#FFFFFF" />
                <Text style={styles.totalChipT}>معاملة مشفرة</Text>
              </View>
              <Text style={styles.totalLabelLight}>المبلغ الإجمالي</Text>
              <Text style={styles.totalAmountLight}>{totals.total} ر.س</Text>
              <Text style={styles.totalSubLight}>{service.title}</Text>
            </View>
          </LinearGradient>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>اختر طريقة الدفع</Text>

        <View style={styles.methodsContainer}>
          {PAYMENT_METHODS.map((method) => {
            const isSelected = selectedMethod === method.id;
            return (
              <TouchableOpacity
                key={method.id}
                onPress={() => setSelectedMethod(method.id)}
                activeOpacity={0.85}
                style={[
                  styles.methodItem,
                  {
                    backgroundColor: colors.card,
                    borderColor: isSelected ? colors.primary : "transparent",
                    borderWidth: isSelected ? 2 : 0,
                  },
                ]}
              >
                <View style={styles.methodLogoWrap}>
                  <MethodLogo type={method.type} />
                </View>

                <View style={styles.methodTextWrap}>
                  <View style={styles.methodTitleRow}>
                    <Text style={[styles.methodTitle, { color: colors.foreground }]}>{method.title}</Text>
                    {method.badge && (
                      <View style={[styles.recBadge, { backgroundColor: colors.successLight }]}>
                        <Text style={[styles.recBadgeText, { color: colors.success }]}>{method.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.methodSubtitle, { color: colors.mutedForeground }]}>{method.subtitle}</Text>
                </View>

                <View style={styles.radioContainer}>
                  {isSelected ? (
                    <View style={[styles.radioActive, { backgroundColor: colors.primary }]}>
                      <Feather name="check" size={12} color="#FFFFFF" />
                    </View>
                  ) : (
                    <View style={[styles.radioInactive, { borderColor: colors.border }]} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.securityRow}>
          <Feather name="lock" size={14} color={colors.mutedForeground} />
          <Text style={[styles.securityText, { color: colors.mutedForeground }]}>بياناتك آمنة ولن يتم حفظها</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.summaryHeader, { color: colors.foreground }]}>ملخص الطلب</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{service.title}</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{totals.base} ر.س</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>رسوم الخدمة</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{totals.fee} ر.س</Text>
          </View>

          <View style={[styles.dotDivider, { borderTopColor: colors.border }]} />

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.foreground }]}>المجموع الفرعي</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{totals.subtotal} ر.س</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>ضريبة القيمة المضافة (15%)</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{totals.vat} ر.س</Text>
          </View>

          <View style={[styles.totalRow, { backgroundColor: colors.primaryLight + "30" }]}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>الإجمالي الكلي</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>{totals.total} ر.س</Text>
          </View>
        </View>

        <View style={styles.featuresRow}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="headphones" size={16} color={colors.foreground} />
            </View>
            <Text style={[styles.featureText, { color: colors.mutedForeground }]}>دعم على مدار الساعة</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="shield" size={16} color={colors.foreground} />
            </View>
            <Text style={[styles.featureText, { color: colors.mutedForeground }]}>دفع آمن 100%</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="refresh-ccw" size={16} color={colors.foreground} />
            </View>
            <Text style={[styles.featureText, { color: colors.mutedForeground }]}>إلغاء سهل وسريع</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={async () => {
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            try {
              const { supabase } = await import("@/lib/supabase");
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) { router.push("/login"); return; }
              const svcId = booking.service?.id;
              const isUuid = typeof svcId === "string" && /^[0-9a-f-]{36}$/i.test(svcId);
              const cleanerId = booking.cleanerId;
              const isProvUuid = typeof cleanerId === "string" && /^[0-9a-f-]{36}$/i.test(cleanerId);
              const methodMap: Record<string, string> = {
                "1": "card", "5": "mada", "2": "apple_pay", "6": "stc_pay", "4": "tamara", "3": "cash",
              };
              const insertData: any = {
                user_id: user.id,
                service_id: isUuid ? svcId : null,
                provider_id: isProvUuid ? cleanerId : null,
                total: totals.total,
                payment_method: methodMap[booking.paymentMethodId] || "card",
                status: "pending",
                scheduled_at: booking.scheduledIso || new Date().toISOString(),
              };
              const { data: row, error } = await supabase.from("bookings").insert(insertData).select("id").maybeSingle();
              if (error) console.log("[v0] booking insert error:", error.message);
              if (row?.id) {
                const svcTitle = booking.service?.title || "خدمة تنظيف";
                const svcPrice = booking.service?.price ?? 0;

                createNotification(
                  user.id,
                  "booking_created",
                  "✅ تم استلام طلبك!",
                  `طلبك لـ${svcTitle} في طور البحث عن أفضل مزود قريب منك`,
                  { bookingId: row.id }
                );
                notifyAvailableProviders(
                  `🔔 طلب ${svcTitle} جديد!`,
                  `قيمة الطلب ${svcPrice} ر.س — اضغط قبول للحجز الفوري`,
                  { bookingId: row.id, type: "booking_created" },
                  row.id
                );
                router.replace({ pathname: "/tracking", params: { id: row.id } } as any);
              } else router.replace("/tracking");
            } catch (e) {
              console.log("[v0] payment confirm failed:", (e as Error).message);
              router.replace("/tracking");
            }
          }}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmBtn}
          >
            <Feather name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} size={20} color="#FFFFFF" />
            <View style={styles.confirmTextContainer}>
              <Text style={styles.confirmTitle}>تأكيد الدفع</Text>
              <Text style={styles.confirmSubtitle}>{totals.total} ر.س | الإجمالي</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const lg = StyleSheet.create({
  box: {
    width: 48, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 1,
  },
  boxRow: { width: 48, height: 32, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  circle: { width: 22, height: 22, borderRadius: 11 },
  text: { fontFamily: "Tajawal_700Bold" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 12 },
  safeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  safeBadgeText: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  headerTitleContainer: { alignItems: "center" },
  headerTitle: { fontFamily: "Tajawal_700Bold", fontSize: 18 },
  headerSubtitle: { fontFamily: "Tajawal_400Regular", fontSize: 13 },
  totalWrap: { paddingHorizontal: 16, marginBottom: 18 },
  totalCard: { borderRadius: 28, padding: 24, minHeight: 160, overflow: "hidden", position: "relative" },
  bgCircle: { position: "absolute", width: 200, height: 200, borderRadius: 100 },
  walletGlyph: { position: "absolute", start: 12, bottom: -10, opacity: 0.5 },
  totalContent: { alignItems: "flex-end", gap: 4 },
  totalChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, marginBottom: 6 },
  totalChipT: { color: "#FFFFFF", fontFamily: "Tajawal_700Bold", fontSize: 10 },
  totalLabelLight: { fontFamily: "Tajawal_500Medium", fontSize: 13, color: "rgba(255,255,255,0.85)" },
  totalAmountLight: { fontFamily: "Tajawal_700Bold", fontSize: 36, color: "#FFFFFF", letterSpacing: -0.5 },
  totalSubLight: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 4 },
  sectionTitle: { fontFamily: "Tajawal_700Bold", fontSize: 18, textAlign: "center", marginBottom: 12 },
  methodsContainer: { paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  methodItem: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 20, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  radioContainer: { marginEnd: 16 },
  radioActive: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  radioInactive: { width: 24, height: 24, borderRadius: 12, borderWidth: 1 },
  methodTextWrap: { flex: 1, alignItems: "flex-end", marginHorizontal: 16 },
  methodTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  methodTitle: { fontFamily: "Tajawal_700Bold", fontSize: 15 },
  recBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  recBadgeText: { fontFamily: "Tajawal_600SemiBold", fontSize: 10 },
  methodSubtitle: { fontFamily: "Tajawal_400Regular", fontSize: 12 },
  methodLogoWrap: { width: 56, alignItems: "center" },
  securityRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginBottom: 18 },
  securityText: { fontFamily: "Tajawal_500Medium", fontSize: 12 },
  summaryCard: { marginHorizontal: 24, borderRadius: 24, overflow: "hidden", marginBottom: 18, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  summaryHeader: { fontFamily: "Tajawal_700Bold", fontSize: 16, padding: 20, paddingBottom: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 8 },
  summaryLabel: { fontFamily: "Tajawal_500Medium", fontSize: 14 },
  summaryValue: { fontFamily: "Tajawal_600SemiBold", fontSize: 14 },
  dotDivider: { borderTopWidth: 1, borderStyle: "dashed", marginHorizontal: 20, marginVertical: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, marginTop: 8 },
  totalValue: { fontFamily: "Tajawal_700Bold", fontSize: 18 },
  totalLabel: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  featuresRow: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 16, marginBottom: 12 },
  featureItem: { alignItems: "center", gap: 8 },
  featureIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  featureText: { fontFamily: "Tajawal_600SemiBold", fontSize: 10, textAlign: "center", width: 80 },
  bottomBar: { position: "absolute", bottom: 0, start: 0, end: 0, paddingHorizontal: 16, paddingTop: 16, backgroundColor: "#FFFFFF", borderTopLeftRadius: 32, borderTopRightRadius: 32, shadowColor: "#0F172A", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 10 },
  confirmBtn: { height: 64, borderRadius: 20, flexDirection: "row", alignItems: "center", paddingHorizontal: 20 },
  confirmTextContainer: { flex: 1, alignItems: "flex-end" },
  confirmTitle: { color: "#FFFFFF", fontFamily: "Tajawal_700Bold", fontSize: 16 },
  confirmSubtitle: { color: "rgba(255,255,255,0.8)", fontFamily: "Tajawal_500Medium", fontSize: 12 },
});
