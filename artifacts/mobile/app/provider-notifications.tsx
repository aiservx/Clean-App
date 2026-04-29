import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";

const NOTIFS = [
  { id: "1", icon: "shopping-bag", color: "#16C47F", title: "طلب جديد", body: "خالد العتيبي طلب خدمة تنظيف عميق - 150 ر.س", time: "منذ دقيقة", unread: true },
  { id: "2", icon: "dollar-sign", color: "#2F80ED", title: "تم استلام أرباحك", body: "تم إضافة 92 ر.س إلى محفظتك", time: "منذ 30 دقيقة", unread: true },
  { id: "3", icon: "star", color: "#F59E0B", title: "تقييم جديد", body: "فاطمة قيّمتك 5 نجوم! اقرأ التعليق", time: "منذ ساعة", unread: false },
  { id: "4", icon: "alert-circle", color: "#EF4444", title: "موعد قريب", body: "لديك طلب بعد 30 دقيقة - حي النخيل", time: "منذ ساعتين", unread: false },
  { id: "5", icon: "trending-up", color: "#8B5CF6", title: "أرباحك ارتفعت", body: "أرباحك هذا الأسبوع +15% عن السابق", time: "أمس", unread: false },
  { id: "6", icon: "gift", color: "#EC4899", title: "بونص أداء ممتاز", body: "حصلت على 50 ر.س مكافأة لتقييمك العالي", time: "أمس", unread: false },
];

export default function ProviderNotifications() {
  const colors = useColors();
  const [filter, setFilter] = useState("all");
  const list = filter === "unread" ? NOTIFS.filter((n) => n.unread) : NOTIFS;

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="الإشعارات" subtitle="آخر التحديثات والطلبات" />
      <View style={styles.tabs}>
        {[{ id: "all", l: "الكل" }, { id: "unread", l: "غير مقروءة" }].map((t) => (
          <TouchableOpacity key={t.id} onPress={() => setFilter(t.id)} style={[styles.tab, filter === t.id && { backgroundColor: colors.primary }]}>
            <Text style={[styles.tabT, { color: filter === t.id ? "#FFF" : colors.foreground }]}>{t.l}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={{ marginRight: "auto" }}>
          <Text style={[styles.markAll, { color: colors.primary }]}>تعليم الكل كمقروء</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10 }} showsVerticalScrollIndicator={false}>
        {list.map((n) => (
          <View key={n.id} style={[styles.row, { backgroundColor: colors.card }]}>
            {n.unread && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
            <View style={styles.text}>
              <Text style={[styles.t, { color: colors.foreground }]}>{n.title}</Text>
              <Text style={[styles.b, { color: colors.mutedForeground }]} numberOfLines={2}>{n.body}</Text>
              <Text style={[styles.tm, { color: colors.mutedForeground }]}>{n.time}</Text>
            </View>
            <View style={[styles.iconBox, { backgroundColor: n.color + "22" }]}>
              <Feather name={n.icon as any} size={18} color={n.color} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  tabs: { flexDirection: "row-reverse", paddingHorizontal: 16, gap: 8, marginBottom: 12, alignItems: "center" },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, backgroundColor: "#FFF" },
  tabT: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  markAll: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  row: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 16, gap: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, position: "absolute", top: 12, left: 12 },
  text: { flex: 1, alignItems: "flex-end" },
  t: { fontFamily: "Tajawal_700Bold", fontSize: 13, marginBottom: 2 },
  b: { fontFamily: "Tajawal_400Regular", fontSize: 11, textAlign: "right", lineHeight: 16 },
  tm: { fontFamily: "Tajawal_500Medium", fontSize: 10, marginTop: 4 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
