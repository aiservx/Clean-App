import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";

export default function PaymentForm() {
  const colors = useColors();
  const [num, setNum] = useState("");
  const [name, setName] = useState("");
  const [exp, setExp] = useState("");
  const [cvv, setCvv] = useState("");
  const [def, setDef] = useState(true);

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="إضافة بطاقة" subtitle="أدخل بيانات بطاقتك بأمان" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: "#1A1F71" }]}>
          <Text style={styles.cardBrand}>{num.startsWith("5") ? "MASTERCARD" : "VISA"}</Text>
          <Text style={styles.cardNum}>{num.padEnd(16, "•").replace(/(.{4})/g, "$1 ").trim()}</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View>
              <Text style={styles.cardL}>اسم حامل البطاقة</Text>
              <Text style={styles.cardN}>{name || "الاسم الكامل"}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.cardL}>تاريخ الانتهاء</Text>
              <Text style={styles.cardN}>{exp || "MM/YY"}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>رقم البطاقة</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.foreground }]}
          placeholder="0000 0000 0000 0000"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numeric"
          maxLength={16}
          value={num}
          onChangeText={setNum}
        />

        <Text style={[styles.label, { color: colors.foreground }]}>اسم حامل البطاقة</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.foreground }]}
          placeholder="الاسم كما يظهر على البطاقة"
          placeholderTextColor={colors.mutedForeground}
          value={name}
          onChangeText={setName}
        />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.foreground }]}>تاريخ الانتهاء</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.foreground }]}
              placeholder="MM/YY"
              placeholderTextColor={colors.mutedForeground}
              value={exp}
              onChangeText={setExp}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.foreground }]}>CVV</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.foreground }]}
              placeholder="123"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              maxLength={3}
              secureTextEntry
              value={cvv}
              onChangeText={setCvv}
            />
          </View>
        </View>

        <TouchableOpacity onPress={() => setDef(!def)} style={styles.defRow}>
          <View style={[styles.checkBox, { borderColor: colors.primary, backgroundColor: def ? colors.primary : "transparent" }]}>
            {def && <Feather name="check" size={12} color="#FFF" />}
          </View>
          <Text style={[styles.defT, { color: colors.foreground }]}>تعيين كبطاقة افتراضية</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Feather name="lock" size={14} color="#FFF" />
          <Text style={styles.saveT}>حفظ بأمان</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  card: { padding: 18, borderRadius: 18, height: 170, justifyContent: "space-between", marginBottom: 14 },
  cardBrand: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 18, fontStyle: "italic" },
  cardNum: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 19, letterSpacing: 2, textAlign: "center" },
  cardL: { color: "rgba(255,255,255,0.6)", fontFamily: "Tajawal_500Medium", fontSize: 9 },
  cardN: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 13 },
  label: { fontFamily: "Tajawal_700Bold", fontSize: 13, marginBottom: 6, marginTop: 6 },
  input: { height: 48, borderRadius: 12, paddingHorizontal: 14, fontFamily: "Tajawal_500Medium", fontSize: 13 },
  defRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  checkBox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  defT: { fontFamily: "Tajawal_500Medium", fontSize: 12 },
  bottom: { position: "absolute", bottom: 0, start: 0, end: 0, padding: 14, paddingBottom: 24 },
  saveBtn: { height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  saveT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 14 },
});
