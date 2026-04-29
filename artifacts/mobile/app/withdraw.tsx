import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";

const METHODS = [
  { id: "bank", l: "حوالة بنكية", s: "خلال 24 ساعة", i: "credit-card", c: "#16C47F" },
  { id: "stc", l: "STC Pay", s: "فوري", i: "smartphone", c: "#4F008C" },
  { id: "wallet", l: "محفظة محلية", s: "فوري", i: "wallet", c: "#2F80ED" },
];

const QUICK = [100, 250, 500, 1000];

export default function Withdraw() {
  const colors = useColors();
  const [amount, setAmount] = useState("500");
  const [method, setMethod] = useState("bank");
  const balance = 1245.5;

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="سحب الأرباح" subtitle="رصيدك المتاح للسحب" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.balCard}>
          <Text style={styles.balL}>الرصيد المتاح</Text>
          <Text style={styles.balV}>{balance.toLocaleString()} <Text style={{ fontSize: 14 }}>ر.س</Text></Text>
        </LinearGradient>

        <Text style={[styles.l, { color: colors.foreground }]}>المبلغ المراد سحبه</Text>
        <View style={[styles.amountInput, { backgroundColor: colors.card }]}>
          <Text style={[styles.curr, { color: colors.mutedForeground }]}>ر.س</Text>
          <TextInput
            style={[styles.amount, { color: colors.foreground }]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            textAlign="center"
          />
        </View>

        <View style={styles.quickRow}>
          {QUICK.map((q) => (
            <TouchableOpacity key={q} onPress={() => setAmount(String(q))} style={[styles.qBtn, { backgroundColor: amount === String(q) ? colors.primary : colors.card }]}>
              <Text style={[styles.qT, { color: amount === String(q) ? "#FFF" : colors.foreground }]}>{q}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setAmount(String(balance))} style={[styles.qBtn, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.qT, { color: colors.primary }]}>الكل</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.l, { color: colors.foreground }]}>طريقة السحب</Text>
        <View style={{ gap: 8 }}>
          {METHODS.map((m) => {
            const a = method === m.id;
            return (
              <TouchableOpacity key={m.id} onPress={() => setMethod(m.id)} style={[styles.mRow, { backgroundColor: colors.card, borderColor: a ? colors.primary : "transparent" }]}>
                <View style={[styles.radio, { borderColor: a ? colors.primary : colors.border }]}>
                  {a && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                </View>
                <View style={{ flex: 1, alignItems: "flex-end", marginHorizontal: 12 }}>
                  <Text style={[styles.mL, { color: colors.foreground }]}>{m.l}</Text>
                  <Text style={[styles.mS, { color: colors.mutedForeground }]}>{m.s}</Text>
                </View>
                <View style={[styles.mIcon, { backgroundColor: m.c + "22" }]}>
                  <Feather name={m.i as any} size={18} color={m.c} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.summary, { backgroundColor: colors.card }]}>
          {[
            { l: "المبلغ", v: `${amount} ر.س` },
            { l: "رسوم السحب", v: "0 ر.س", g: true },
            { l: "الإجمالي للتحويل", v: `${amount} ر.س`, b: true },
          ].map((r) => (
            <View key={r.l} style={styles.sRow}>
              <Text style={[styles.sV, { color: r.g ? colors.success : colors.foreground, fontFamily: r.b ? "Tajawal_700Bold" : "Tajawal_500Medium", fontSize: r.b ? 14 : 12 }]}>{r.v}</Text>
              <Text style={[styles.sL, { color: r.b ? colors.foreground : colors.mutedForeground, fontFamily: r.b ? "Tajawal_700Bold" : "Tajawal_500Medium" }]}>{r.l}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Feather name="arrow-up" size={16} color="#FFF" />
          <Text style={styles.btnT}>تأكيد السحب</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  balCard: { padding: 18, borderRadius: 18, alignItems: "flex-end", marginBottom: 14 },
  balL: { color: "rgba(255,255,255,0.85)", fontFamily: "Tajawal_500Medium", fontSize: 11 },
  balV: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 30, marginTop: 4 },
  l: { fontFamily: "Tajawal_700Bold", fontSize: 13, textAlign: "right", marginBottom: 8, marginTop: 6 },
  amountInput: { borderRadius: 16, paddingVertical: 18, paddingHorizontal: 20, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 },
  amount: { fontFamily: "Tajawal_700Bold", fontSize: 36, minWidth: 100 },
  curr: { fontFamily: "Tajawal_500Medium", fontSize: 14 },
  quickRow: { flexDirection: "row-reverse", gap: 6, marginBottom: 4 },
  qBtn: { flex: 1, paddingVertical: 8, borderRadius: 100, alignItems: "center" },
  qT: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  mRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 14, borderWidth: 1.5 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  mL: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  mS: { fontFamily: "Tajawal_500Medium", fontSize: 10, marginTop: 1 },
  mIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  summary: { padding: 14, borderRadius: 14, marginTop: 14, gap: 8 },
  sRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  sL: { fontSize: 11 },
  sV: {},
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 14, paddingBottom: 24 },
  btn: { height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row-reverse", gap: 8 },
  btnT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 14 },
});
