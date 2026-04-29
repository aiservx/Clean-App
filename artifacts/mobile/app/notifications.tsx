import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";

const NOTIFS = [
  { id: "1", icon: "navigation-2", color: "#16C47F", title: "العامل في طريقه إليك", body: "أحمد علي بدأ التحرك إلى موقعك. الوصول خلال 12 دقيقة", time: "منذ دقيقتين", unread: true },
  { id: "2", icon: "check-circle", color: "#2F80ED", title: "تم استلام طلبك", body: "تم تأكيد طلب تنظيف عميق ودفع 92 ر.س", time: "منذ 10 دقائق", unread: true },
  { id: "3", icon: "gift", color: "#F59E0B", title: "كوبون جديد بانتظارك", body: "احصل على خصم 30 ر.س باستخدام كود SAVE30", time: "منذ ساعة", unread: false },
  { id: "4", icon: "star", color: "#EC4899", title: "قيّم تجربتك", body: "كيف كانت خدمة سارة محمد؟ شاركنا رأيك", time: "أمس", unread: false },
  { id: "5", icon: "credit-card", color: "#8B5CF6", title: "تم خصم المبلغ", body: "تم خصم 120 ر.س من بطاقة فيزا **** 4242", time: "أمس", unread: false },
  { id: "6", icon: "users", color: "#16C47F", title: "صديقك انضم!", body: "أحمد سجّل عبر دعوتك. حصلت على 50 ر.س", time: "منذ يومين", unread: false },
];

export default function NotificationsScreen() {
  const colors = useColors();
  const [filter, setFilter] = useState("all");

  const list = filter === "unread" ? NOTIFS.filter((n) => n.unread) : NOTIFS;

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="الإشعارات" subtitle="آخر التحديثات والتنبيهات" />

      <View style={styles.tabs}>
        {[
          { id: "all", label: "الكل" },
          { id: "unread", label: "غير مقروءة" },
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setFilter(t.id)}
            style={[styles.tab, filter === t.id && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.tabT, { color: filter === t.id ? "#FFF" : colors.foreground }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.markAll}>
          <Text style={[styles.markAllT, { color: colors.primary }]}>تعليم الكل كمقروء</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16, gap: 10 }} showsVerticalScrollIndicator={false}>
        {list.map((n) => (
          <View key={n.id} style={[styles.row, { backgroundColor: colors.card }]}>
            {n.unread && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>{n.title}</Text>
              <Text style={[styles.rowBody, { color: colors.mutedForeground }]} numberOfLines={2}>{n.body}</Text>
              <Text style={[styles.rowTime, { color: colors.mutedForeground }]}>{n.time}</Text>
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
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, backgroundColor: "#FFFFFF" },
  tabT: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  markAll: { marginRight: "auto" },
  markAllT: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  row: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 16, gap: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, position: "absolute", top: 12, left: 12 },
  rowText: { flex: 1, alignItems: "flex-end" },
  rowTitle: { fontFamily: "Tajawal_700Bold", fontSize: 13, marginBottom: 2 },
  rowBody: { fontFamily: "Tajawal_400Regular", fontSize: 11, textAlign: "right", lineHeight: 16 },
  rowTime: { fontFamily: "Tajawal_500Medium", fontSize: 10, marginTop: 4 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
