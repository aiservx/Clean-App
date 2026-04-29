import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";

const TABS = ["جديدة", "نشطة", "مكتملة"];
const ORDERS = [
  { id: "1", t: "تنظيف عميق", c: "خالد العتيبي", date: "اليوم 10:00 ص", addr: "حي النخيل", p: "150", st: "نشطة", stColor: "#16C47F" },
  { id: "2", t: "تنظيف منزل", c: "سعد الحربي", date: "اليوم 1:00 م", addr: "حي العليا", p: "85", st: "جديدة", stColor: "#2F80ED" },
  { id: "3", t: "تنظيف فلل", c: "محمد القحطاني", date: "غداً 9:00 ص", addr: "حي الصحافة", p: "250", st: "نشطة", stColor: "#16C47F" },
  { id: "4", t: "تنظيف كنب", c: "نورة الفهد", date: "أمس 3:00 م", addr: "حي الورود", p: "120", st: "مكتمل", stColor: "#94A3B8" },
];

export default function ProviderBookings() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [tab, setTab] = useState(0);

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()}><Feather name="chevron-right" size={22} color={colors.foreground} /></TouchableOpacity>
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text style={[styles.hT, { color: colors.foreground }]}>طلباتي</Text>
          <Text style={[styles.hS, { color: colors.mutedForeground }]}>إدارة جميع الطلبات</Text>
        </View>
        <TouchableOpacity><Feather name="filter" size={20} color={colors.foreground} /></TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={t} onPress={() => setTab(i)} style={[styles.tab, tab === i && { backgroundColor: colors.primary }]}>
            <Text style={[styles.tabT, { color: tab === i ? "#FFF" : colors.foreground }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130, paddingHorizontal: 16, gap: 10 }} showsVerticalScrollIndicator={false}>
        {ORDERS.map((o) => (
          <TouchableOpacity key={o.id} style={[styles.card, { backgroundColor: colors.card }]} onPress={() => router.push("/booking-details")}>
            <View style={styles.cardTop}>
              <View style={[styles.stBadge, { backgroundColor: o.stColor + "22" }]}>
                <Text style={[styles.stT, { color: o.stColor }]}>{o.st}</Text>
              </View>
              <Text style={[styles.cardT, { color: colors.foreground }]}>{o.t}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={{ gap: 6 }}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoV, { color: colors.foreground }]}>{o.c}</Text>
                <Feather name="user" size={12} color={colors.mutedForeground} />
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoV, { color: colors.foreground }]}>{o.date}</Text>
                <Feather name="clock" size={12} color={colors.mutedForeground} />
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoV, { color: colors.foreground }]}>{o.addr}</Text>
                <Feather name="map-pin" size={12} color={colors.mutedForeground} />
              </View>
            </View>
            <View style={styles.cardFoot}>
              {o.st === "جديدة" ? (
                <>
                  <TouchableOpacity style={[styles.primBtn, { backgroundColor: colors.primary }]}>
                    <Text style={styles.primT}>قبول</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.secBtn, { borderColor: colors.border }]}>
                    <Text style={[styles.secT, { color: colors.foreground }]}>رفض</Text>
                  </TouchableOpacity>
                </>
              ) : o.st === "نشطة" ? (
                <>
                  <TouchableOpacity style={[styles.primBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/tracking")}>
                    <Text style={styles.primT}>التوجه للموقع</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.secBtn, { borderColor: colors.border }]}>
                    <Feather name="message-circle" size={16} color={colors.foreground} />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={[styles.primBtn, { backgroundColor: colors.muted, flex: 1 }]}>
                  <Text style={[styles.primT, { color: colors.foreground }]}>عرض الفاتورة</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={[styles.priceV, { color: colors.primary }]}>{o.p} ر.س</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 12, gap: 10 },
  hT: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  hS: { fontFamily: "Tajawal_400Regular", fontSize: 11 },
  tabs: { flexDirection: "row-reverse", paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 100, alignItems: "center", backgroundColor: "#FFFFFF" },
  tabT: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  card: { padding: 14, borderRadius: 18 },
  cardTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  cardT: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  stBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100 },
  stT: { fontFamily: "Tajawal_700Bold", fontSize: 10 },
  divider: { height: 1, marginBottom: 10 },
  infoRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  infoV: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  cardFoot: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginTop: 12 },
  primBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 100 },
  primT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 11 },
  secBtn: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 100, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  secT: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  priceV: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
});
