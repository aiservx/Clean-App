import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { SectionHeader } from "@/components/SectionHeader";

const PAYMENT_METHODS = [
  { id: "1", title: "بطاقة ائتمانية / مدى", subtitle: "**** **** **** 4242", badge: "موصى بها", type: "visa" },
  { id: "2", title: "Apple Pay", subtitle: "ادفع باستخدام Apple Pay", type: "apple" },
  { id: "3", title: "الدفع نقداً", subtitle: "ادفع نقداً عند استلام الخدمة", type: "cash" },
  { id: "4", title: "تمارا - دفع لاحقاً", subtitle: "قسم فاتورتك إلى 4 دفعات بدون فوائد", type: "tamara" },
];

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [selectedMethod, setSelectedMethod] = useState("1");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Feather name="chevron-right" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>الدفع</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>اختر طريقة الدفع المناسبة</Text>
        </View>
        <View style={[styles.safeBadge, { backgroundColor: colors.successLight }]}>
          <MaterialCommunityIcons name="shield-check" size={14} color={colors.success} />
          <Text style={[styles.safeBadgeText, { color: colors.success }]}>دفع آمن</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={[colors.secondary, colors.border]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.totalCard}
        >
          <Image source={require("@/assets/images/illustration-wallet.png")} style={styles.walletImage} resizeMode="contain" />
          <View style={styles.totalTextContainer}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>المبلغ الإجمالي</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>190 ر.س</Text>
            <View style={styles.encryptionRow}>
              <Feather name="lock" size={12} color={colors.mutedForeground} />
              <Text style={[styles.encryptionText, { color: colors.mutedForeground }]}>جميع المعاملات مشفرة وآمنة</Text>
            </View>
          </View>
        </LinearGradient>

        <SectionHeader title="اختر طريقة الدفع" />
        
        <View style={styles.methodsContainer}>
          {PAYMENT_METHODS.map(method => {
            const isSelected = selectedMethod === method.id;
            return (
              <TouchableOpacity 
                key={method.id}
                onPress={() => setSelectedMethod(method.id)}
                style={[
                  styles.methodRow, 
                  { 
                    backgroundColor: colors.card,
                    borderColor: isSelected ? colors.primary : colors.border 
                  },
                  isSelected && { backgroundColor: colors.primaryLight + "30" }
                ]}
              >
                <View style={styles.radioContainer}>
                  <View style={[styles.radioOuter, { borderColor: isSelected ? colors.primary : colors.mutedForeground }]}>
                    {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                </View>
                
                <View style={styles.methodInfo}>
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
                
                <View style={[styles.methodLogo, { backgroundColor: colors.secondary }]}>
                  {method.type === "visa" && <Text style={{ fontFamily: "Cairo_700Bold", color: "#1A1F71", fontSize: 16 }}>VISA</Text>}
                  {method.type === "apple" && <MaterialCommunityIcons name="apple" size={24} color="#000" />}
                  {method.type === "cash" && <Text style={{ fontSize: 20 }}>💵</Text>}
                  {method.type === "tamara" && (
                    <LinearGradient colors={["#FF7A8A", "#FFB347"]} style={styles.tamaraLogo}>
                      <Text style={{ fontFamily: "Cairo_700Bold", color: "#FFF", fontSize: 10 }}>tamara</Text>
                    </LinearGradient>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.privacyRow}>
          <Feather name="lock" size={14} color={colors.success} />
          <Text style={[styles.privacyText, { color: colors.mutedForeground }]}>بياناتك آمنة ولن يتم حفظها</Text>
        </View>

        <SectionHeader title="ملخص الطلب" />
        
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>150 ر.س</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>تنظيف منزل (3 غرف)</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>30 ر.س</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>تنظيف إضافي: المطبخ</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>10 ر.س</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>رسوم الخدمة</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>190 ر.س</Text>
            <Text style={[styles.summaryLabel, { color: colors.foreground }]}>المجموع الفرعي</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>28.50 ر.س</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>ضريبة القيمة المضافة (15%)</Text>
          </View>
          <View style={[styles.finalTotalRow, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.finalTotalValue, { color: colors.primaryDark }]}>218.50 ر.س</Text>
            <Text style={[styles.finalTotalLabel, { color: colors.primaryDark }]}>الإجمالي الكلي</Text>
          </View>
        </View>

      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push("/(tabs)")}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmGradient}
          >
            <View style={styles.confirmArrowContainer}>
              <Feather name="arrow-left" size={20} color={colors.primary} />
            </View>
            <View style={styles.confirmTextContainer}>
              <Text style={styles.confirmTitle}>تأكيد الدفع</Text>
            </View>
            <Text style={styles.confirmPrice}>218.50 ر.س</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.trustRow}>
          <Text style={[styles.trustText, { color: colors.mutedForeground }]}>إلغاء سهل وسريع</Text>
          <Text style={[styles.trustDot, { color: colors.mutedForeground }]}>•</Text>
          <Text style={[styles.trustText, { color: colors.mutedForeground }]}>دفع آمن 100%</Text>
          <Text style={[styles.trustDot, { color: colors.mutedForeground }]}>•</Text>
          <Text style={[styles.trustText, { color: colors.mutedForeground }]}>دعم على مدار الساعة</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  headerSubtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
  },
  safeBadge: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 4,
  },
  safeBadgeText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 160,
  },
  totalCard: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    padding: 24,
    borderRadius: 24,
    marginBottom: 32,
  },
  walletImage: {
    width: 80,
    height: 80,
    marginLeft: 20,
  },
  totalTextContainer: {
    flex: 1,
    alignItems: "flex-end", // RTL
  },
  totalLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
    marginBottom: 4,
  },
  totalAmount: {
    fontFamily: "Cairo_700Bold",
    fontSize: 32,
    marginBottom: 8,
  },
  encryptionRow: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    gap: 6,
  },
  encryptionText: {
    fontFamily: "Cairo_500Medium",
    fontSize: 11,
  },
  methodsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  radioContainer: {
    paddingRight: 16,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  methodInfo: {
    flex: 1,
    alignItems: "flex-end", // RTL
    marginRight: 16,
  },
  methodTitleRow: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  methodTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
  },
  recBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  recBadgeText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 10,
  },
  methodSubtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
  },
  methodLogo: {
    width: 48,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tamaraLogo: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  privacyRow: {
    flexDirection: "row-reverse", // RTL
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 32,
  },
  privacyText: {
    fontFamily: "Cairo_500Medium",
    fontSize: 12,
  },
  summaryCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  summaryLabel: {
    fontFamily: "Cairo_500Medium",
    fontSize: 14,
  },
  summaryValue: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
    marginVertical: 4,
  },
  finalTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  finalTotalLabel: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
  },
  finalTotalValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 8,
  },
  confirmGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 100,
    marginBottom: 16,
  },
  confirmArrowContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  confirmTextContainer: {
    flex: 1,
    alignItems: "flex-end", // RTL
  },
  confirmTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  confirmPrice: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
    color: "#FFFFFF",
    marginLeft: 16,
  },
  trustRow: {
    flexDirection: "row-reverse", // RTL
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  trustText: {
    fontFamily: "Cairo_500Medium",
    fontSize: 10,
  },
  trustDot: {
    fontSize: 10,
  },
});
