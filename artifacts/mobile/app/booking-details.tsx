import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";

const TIMELINE = [
  { t: "تم استلام الطلب", time: "10:00 ص", done: true },
  { t: "تأكيد العامل وبدء التحرك", time: "10:05 ص", done: true },
  { t: "العامل في الطريق إليك", time: "10:10 ص", done: true, active: true },
  { t: "وصول العامل وبدء العمل", time: "—", done: false },
  { t: "إنجاز الخدمة", time: "—", done: false },
  { t: "الدفع والتقييم", time: "—", done: false },
];

export default function BookingDetails() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="تفاصيل الطلب" subtitle="طلب رقم #4587" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.statusCard, { backgroundColor: colors.primary }]}>
          <View>
            <Text style={styles.statusL}>الحالة الحالية</Text>
            <Text style={styles.statusT}>قيد التنفيذ</Text>
            <Text style={styles.statusS}>العامل في الطريق إليك - 12 دقيقة</Text>
          </View>
          <MaterialCommunityIcons name="truck-delivery" size={50} color="#FFF" />
        </View>

        <View style={[styles.box, { backgroundColor: colors.card }]}>
          <View style={styles.row}>
            <Image source={require("@/assets/images/cleaner-fatima.png")} style={styles.av} />
            <View style={{ flex: 1, marginHorizontal: 10, alignItems: "flex-end" }}>
              <Text style={[styles.n, { color: colors.foreground }]}>أحمد علي</Text>
              <Text style={[styles.s, { color: colors.mutedForeground }]}>عامل نظافة محترف</Text>
              <View style={{ flexDirection: "row-reverse", gap: 4, alignItems: "center", marginTop: 2 }}>
                <Feather name="star" size={11} color={colors.warning} />
                <Text style={[styles.s, { color: colors.foreground, fontFamily: "Tajawal_700Bold" }]}>4.9</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <TouchableOpacity style={[styles.icon, { backgroundColor: colors.primaryLight }]} onPress={() => router.push("/chat-detail?name=أحمد علي")}>
                <Feather name="message-circle" size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.icon, { backgroundColor: colors.successLight }]}>
                <Feather name="phone" size={16} color={colors.success} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>تتبع الطلب</Text>
        <View style={[styles.box, { backgroundColor: colors.card }]}>
          {TIMELINE.map((s, i) => (
            <View key={i} style={styles.tlRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tlT, { color: s.done ? colors.foreground : colors.mutedForeground, fontFamily: s.active ? "Tajawal_700Bold" : "Tajawal_500Medium" }]}>{s.t}</Text>
                <Text style={[styles.tlTime, { color: colors.mutedForeground }]}>{s.time}</Text>
              </View>
              <View style={styles.tlIconCol}>
                {i < TIMELINE.length - 1 && <View style={[styles.tlLine, { backgroundColor: TIMELINE[i + 1].done ? colors.primary : colors.border }]} />}
                <View style={[styles.tlDot, { backgroundColor: s.done ? colors.primary : colors.border, borderWidth: s.active ? 4 : 0, borderColor: colors.primaryLight }]}>
                  {s.done && <Feather name="check" size={10} color="#FFF" />}
                </View>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>تفاصيل الخدمة</Text>
        <View style={[styles.box, { backgroundColor: colors.card }]}>
          {[
            { l: "نوع الخدمة", v: "تنظيف عميق للمنزل" },
            { l: "التاريخ والوقت", v: "اليوم، 10:00 ص - 12:00 م" },
            { l: "العنوان", v: "حي النخيل، شارع الأمير نايف، الرياض" },
            { l: "ملاحظات", v: "—" },
          ].map((d) => (
            <View key={d.l} style={styles.dRow}>
              <Text style={[styles.dV, { color: colors.foreground }]}>{d.v}</Text>
              <Text style={[styles.dL, { color: colors.mutedForeground }]}>{d.l}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>ملخص الفاتورة</Text>
        <View style={[styles.box, { backgroundColor: colors.card }]}>
          {[
            { l: "سعر الخدمة", v: "85 ر.س" },
            { l: "رسوم خدمة", v: "5 ر.س" },
            { l: "خصم كوبون", v: "−10 ر.س", danger: true },
            { l: "ضريبة (15%)", v: "12 ر.س" },
          ].map((d) => (
            <View key={d.l} style={styles.dRow}>
              <Text style={[styles.dV, { color: d.danger ? colors.success : colors.foreground }]}>{d.v}</Text>
              <Text style={[styles.dL, { color: colors.mutedForeground }]}>{d.l}</Text>
            </View>
          ))}
          <View style={[styles.dRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 }]}>
            <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 16, color: colors.primary }}>92 ر.س</Text>
            <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 13, color: colors.foreground }}>الإجمالي</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={[styles.cancelBtn]} onPress={() => router.back()}>
          <Text style={[styles.cancelT, { color: colors.danger }]}>إلغاء الطلب</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.trackBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/tracking")}>
          <Feather name="map-pin" size={16} color="#FFF" />
          <Text style={styles.trackT}>تتبع مباشر</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  statusCard: { padding: 18, borderRadius: 18, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  statusL: { color: "rgba(255,255,255,0.8)", fontFamily: "Tajawal_500Medium", fontSize: 11 },
  statusT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 22, marginVertical: 2 },
  statusS: { color: "rgba(255,255,255,0.95)", fontFamily: "Tajawal_500Medium", fontSize: 12 },
  box: { padding: 14, borderRadius: 16, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center" },
  av: { width: 50, height: 50, borderRadius: 25 },
  n: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  s: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: "Tajawal_700Bold", fontSize: 13, textAlign: "right", marginBottom: 8, marginTop: 6 },
  tlRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 6 },
  tlT: { fontSize: 12, textAlign: "right" },
  tlTime: { fontFamily: "Tajawal_500Medium", fontSize: 10, textAlign: "right", marginTop: 2 },
  tlIconCol: { alignItems: "center", marginLeft: 12, position: "relative", paddingVertical: 4 },
  tlDot: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", zIndex: 1 },
  tlLine: { position: "absolute", top: 18, bottom: -28, width: 2, alignSelf: "center" },
  dRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  dL: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  dV: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 14, paddingBottom: 24, flexDirection: "row-reverse", gap: 10 },
  cancelBtn: { paddingHorizontal: 16, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cancelT: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  trackBtn: { flex: 1, height: 48, borderRadius: 14, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8 },
  trackT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 13 },
});
