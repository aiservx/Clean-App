import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useBooking, DEFAULT_SERVICE } from "@/store/booking";

const PAYMENT_METHODS = [
  { id: "1", title: "بطاقة ائتمانية / مدى", subtitle: "**** **** **** 4242", badge: "موصى بها", type: "visa" },
  { id: "2", title: "Apple Pay", subtitle: "ادفع باستخدام Apple Pay", type: "apple" },
  { id: "3", title: "الدفع نقداً", subtitle: "ادفع نقداً عند استلام الخدمة", type: "cash" },
  { id: "4", title: "تمارا - دفع لاحقاً", subtitle: "قسم فاتورتك إلى 4 دفعات بدون فوائد", type: "tamara" },
];

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
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={[styles.safeBadge, { backgroundColor: colors.successLight }]}>
           <Feather name="shield" size={12} color={colors.success} />
           <Text style={[styles.safeBadgeText, { color: colors.success }]}>دفع آمن</Text>
        </View>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>الدفع</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>اختر طريقة الدفع المناسبة</Text>
        </View>
        <TouchableOpacity style={styles.iconCircle} onPress={() => router.back()}>
          <Feather name="chevron-right" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Total Amount Card */}
        <View style={styles.totalWrap}>
           <LinearGradient
             colors={[colors.accentLight, colors.secondary]}
             start={{ x: 0, y: 0 }}
             end={{ x: 1, y: 1 }}
             style={styles.totalCard}
           >
              <Image source={require("@/assets/images/illustration-wallet.png")} style={styles.walletImage} />
              <View style={styles.totalContent}>
                 <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>المبلغ الإجمالي</Text>
                 <Text style={[styles.totalAmount, { color: colors.accent }]}>{totals.total} ر.س</Text>
                 <View style={styles.lockRow}>
                    <Feather name="lock" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.lockText, { color: colors.mutedForeground }]}>جميع المعاملات مشفرة وآمنة</Text>
                 </View>
              </View>
           </LinearGradient>
        </View>

        {/* Payment Methods Section */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>اختر طريقة الدفع</Text>
        
        <View style={styles.methodsContainer}>
          {PAYMENT_METHODS.map((method) => {
            const isSelected = selectedMethod === method.id;
            return (
              <TouchableOpacity
                key={method.id}
                onPress={() => setSelectedMethod(method.id)}
                style={[
                  styles.methodItem,
                  { 
                    backgroundColor: colors.card,
                    borderColor: isSelected ? colors.accent : "transparent",
                    borderWidth: isSelected ? 2 : 0
                  }
                ]}
              >
                <View style={styles.radioContainer}>
                  {isSelected ? (
                    <View style={[styles.radioActive, { backgroundColor: colors.accent }]}>
                       <Feather name="check" size={12} color="#FFFFFF" />
                    </View>
                  ) : (
                    <View style={[styles.radioInactive, { borderColor: colors.border }]} />
                  )}
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

                <View style={styles.methodLogoWrap}>
                  {method.type === "visa" && <Image source={require("@/assets/images/icon.png")} style={styles.methodLogo} resizeMode="contain" />}
                  {method.type === "apple" && <MaterialCommunityIcons name="apple" size={24} color="#000000" />}
                  {method.type === "cash" && <MaterialCommunityIcons name="cash" size={24} color={colors.success} />}
                  {method.type === "tamara" && <View style={[styles.tamaraLogo, { backgroundColor: "#FB923C" }]}><Text style={styles.tamaraText}>tamara</Text></View>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.securityRow}>
           <Feather name="lock" size={14} color={colors.mutedForeground} />
           <Text style={[styles.securityText, { color: colors.mutedForeground }]}>بياناتك آمنة ولن يتم حفظها</Text>
        </View>

        {/* Order Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.summaryHeader, { color: colors.foreground }]}>ملخص الطلب</Text>
          <View style={styles.summaryRow}>
             <Text style={[styles.summaryValue, { color: colors.foreground }]}>{totals.base} ر.س</Text>
             <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{service.title}</Text>
          </View>
          <View style={styles.summaryRow}>
             <Text style={[styles.summaryValue, { color: colors.foreground }]}>{totals.fee} ر.س</Text>
             <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>رسوم الخدمة</Text>
          </View>

          <View style={[styles.dotDivider, { borderTopColor: colors.border }]} />

          <View style={styles.summaryRow}>
             <Text style={[styles.summaryValue, { color: colors.foreground }]}>{totals.subtotal} ر.س</Text>
             <Text style={[styles.summaryLabel, { color: colors.foreground }]}>المجموع الفرعي</Text>
          </View>
          <View style={styles.summaryRow}>
             <Text style={[styles.summaryValue, { color: colors.foreground }]}>{totals.vat} ر.س</Text>
             <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>ضريبة القيمة المضافة (15%)</Text>
          </View>

          <View style={[styles.totalRow, { backgroundColor: colors.primaryLight + "30" }]}>
             <Text style={[styles.totalValue, { color: colors.primary }]}>{totals.total} ر.س</Text>
             <Text style={[styles.totalLabel, { color: colors.foreground }]}>الإجمالي الكلي</Text>
          </View>
        </View>

        {/* Feature Icons */}
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

      {/* Sticky Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={async () => {
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            try {
              const { supabase } = await import("@/lib/supabase");
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) { router.push("/login"); return; }
              const svcId = (booking as any).service?.id;
              const isUuid = typeof svcId === "string" && /^[0-9a-f-]{36}$/i.test(svcId);
              const insertData: any = {
                user_id: user.id,
                service_id: isUuid ? svcId : null,
                total: totals.total,
                payment_method: "card",
                status: "pending",
                scheduled_at: new Date().toISOString(),
              };
              const { data: row } = await supabase.from("bookings").insert(insertData).select("id").maybeSingle();
              if (row?.id) router.replace({ pathname: "/tracking", params: { id: row.id } } as any);
              else router.replace("/tracking");
            } catch {
              router.replace("/tracking");
            }
          }}
        >
          <LinearGradient
            colors={[colors.accent, colors.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmBtn}
          >
            <Feather name="chevron-left" size={20} color="#FFFFFF" />
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  safeBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  safeBadgeText: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 11,
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
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 18,
  },
  headerSubtitle: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 13,
  },
  totalWrap: {
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  totalCard: {
    borderRadius: 32,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  walletImage: {
    width: 80,
    height: 80,
    marginRight: 16,
  },
  totalContent: {
    flex: 1,
    alignItems: "flex-end",
  },
  totalLabel: {
    fontFamily: "Tajawal_600SemiBold",
    fontSize: 14,
    marginBottom: 4,
  },
  totalAmount: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 32,
    marginBottom: 8,
  },
  lockRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  lockText: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 11,
  },
  sectionTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 12,
  },
  methodsContainer: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  methodItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  radioContainer: {
    marginRight: 16,
  },
  radioActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInactive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  methodTextWrap: {
    flex: 1,
    alignItems: "flex-end",
    marginHorizontal: 16,
  },
  methodTitleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  methodTitle: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 15,
  },
  recBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  recBadgeText: {
    fontFamily: "Tajawal_600SemiBold",
    fontSize: 10,
  },
  methodSubtitle: {
    fontFamily: "Tajawal_400Regular",
    fontSize: 12,
  },
  methodLogoWrap: {
    width: 48,
    alignItems: "center",
  },
  methodLogo: {
    width: 32,
    height: 32,
  },
  tamaraLogo: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tamaraText: {
    color: "#FFFFFF",
    fontFamily: "Tajawal_700Bold",
    fontSize: 9,
  },
  securityRow: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginBottom: 18,
  },
  securityText: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 12,
  },
  summaryCard: {
    marginHorizontal: 24,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryHeader: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 16,
    padding: 20,
    paddingBottom: 12,
    textAlign: "right",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  summaryLabel: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 14,
  },
  summaryValue: {
    fontFamily: "Tajawal_600SemiBold",
    fontSize: 14,
  },
  dotDivider: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    marginHorizontal: 20,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    marginTop: 8,
  },
  totalValue: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 18,
  },
  featuresRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  featureItem: {
    alignItems: "center",
    gap: 8,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontFamily: "Tajawal_600SemiBold",
    fontSize: 10,
    textAlign: "center",
    width: 80,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
  },
  confirmBtn: {
    height: 64,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  confirmTextContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  confirmTitle: {
    color: "#FFFFFF",
    fontFamily: "Tajawal_700Bold",
    fontSize: 16,
  },
  confirmSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Tajawal_500Medium",
    fontSize: 12,
  },
});
