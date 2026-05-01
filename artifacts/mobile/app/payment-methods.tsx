import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Feather, MaterialCommunityIcons, FontAwesome } from "@expo/vector-icons";
import { router } from "expo-router";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";

const CARDS = [
  { id: "1", brand: "visa", last: "4242", name: "أحمد محمد", default: true, color: "#1A1F71" },
  { id: "2", brand: "mastercard", last: "8888", name: "أحمد محمد", default: false, color: "#EB001B" },
];

const OTHER = [
  { id: "apple", t: "Apple Pay", i: "apple" as const, c: "#000" },
  { id: "stc", t: "STC Pay", i: "wallet" as const, c: "#4F008C" },
  { id: "mada", t: "مدى", i: "credit-card" as const, c: "#16C47F" },
];

export default function PaymentMethods() {
  const colors = useColors();

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="وسائل الدفع" subtitle="إدارة بطاقاتك وطرق الدفع" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.label, { color: colors.foreground }]}>البطاقات المحفوظة</Text>
        <View style={{ gap: 10 }}>
          {CARDS.map((c) => (
            <View key={c.id} style={[styles.card, { backgroundColor: c.color }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={styles.cardBrand}>{c.brand.toUpperCase()}</Text>
                {c.default && (
                  <View style={styles.defBadge}>
                    <Text style={styles.defT}>افتراضي</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardNum}>**** **** **** {c.last}</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View>
                  <Text style={styles.cardLabel}>اسم حامل البطاقة</Text>
                  <Text style={styles.cardName}>{c.name}</Text>
                </View>
                <TouchableOpacity><Feather name="more-horizontal" size={20} color="#FFF" /></TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={[styles.addBtn, { borderColor: colors.primary }]} onPress={() => router.push("/payment-form")}>
          <Feather name="plus" size={16} color={colors.primary} />
          <Text style={[styles.addT, { color: colors.primary }]}>إضافة بطاقة جديدة</Text>
        </TouchableOpacity>

        <Text style={[styles.label, { color: colors.foreground, marginTop: 18 }]}>طرق الدفع الأخرى</Text>
        <View style={{ gap: 10 }}>
          {OTHER.map((o) => (
            <TouchableOpacity key={o.id} style={[styles.row, { backgroundColor: colors.card }]}>
              <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
              <Text style={[styles.rowT, { color: colors.foreground, flex: 1, textAlign: "right", marginHorizontal: 12 }]}>{o.t}</Text>
              <View style={[styles.icon, { backgroundColor: o.c + "22" }]}>
                {o.id === "apple" ? <FontAwesome name="apple" size={18} color={o.c} /> : <Feather name={o.i} size={18} color={o.c} />}
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.row, { backgroundColor: colors.card }]}>
            <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
            <Text style={[styles.rowT, { color: colors.foreground, flex: 1, textAlign: "right", marginHorizontal: 12 }]}>الدفع عند الاستلام</Text>
            <View style={[styles.icon, { backgroundColor: "#F59E0B22" }]}>
              <MaterialCommunityIcons name="cash" size={20} color="#F59E0B" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  label: { fontFamily: "Tajawal_700Bold", fontSize: 14, textAlign: "right", marginBottom: 10 },
  card: { padding: 18, borderRadius: 18, height: 170, justifyContent: "space-between" },
  cardBrand: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 18, fontStyle: "italic" },
  cardNum: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 19, letterSpacing: 2, textAlign: "center" },
  cardLabel: { color: "rgba(255,255,255,0.6)", fontFamily: "Tajawal_500Medium", fontSize: 9 },
  cardName: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 13 },
  defBadge: { backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100 },
  defT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 10 },
  addBtn: { borderWidth: 1, borderStyle: "dashed", borderRadius: 14, paddingVertical: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, marginTop: 12 },
  addT: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 14 },
  rowT: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
