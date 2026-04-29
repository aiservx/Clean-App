import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import ScreenHeader from "@/components/ScreenHeader";
import AppMap from "@/components/AppMap";
import { useColors } from "@/hooks/useColors";

const TYPES = [
  { id: "home", l: "المنزل", i: "home" },
  { id: "work", l: "العمل", i: "briefcase" },
  { id: "family", l: "العائلة", i: "users" },
  { id: "other", l: "أخرى", i: "map-pin" },
];

export default function AddressForm() {
  const colors = useColors();
  const [type, setType] = useState("home");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [city, setCity] = useState("الرياض");
  const [defaultAddr, setDefaultAddr] = useState(false);

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="عنوان جديد" subtitle="حدد موقعك على الخريطة" />
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        <View style={styles.mapWrap}>
          <AppMap
            style={StyleSheet.absoluteFill}
            region={{ latitude: 24.7136, longitude: 46.6753, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
          />
          <View style={styles.pin}>
            <MaterialCommunityIcons name="map-marker" size={42} color={colors.primary} />
          </View>
          <TouchableOpacity style={[styles.gpsBtn, { backgroundColor: "#FFF" }]}>
            <MaterialCommunityIcons name="crosshairs-gps" size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.autoBtn, { borderColor: colors.primary }]}>
          <Feather name="navigation" size={14} color={colors.primary} />
          <Text style={[styles.autoT, { color: colors.primary }]}>استخدام موقعي الحالي تلقائياً</Text>
        </TouchableOpacity>

        <Text style={[styles.label, { color: colors.foreground }]}>نوع العنوان</Text>
        <View style={styles.typesGrid}>
          {TYPES.map((t) => {
            const a = type === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setType(t.id)}
                style={[styles.typeCard, { backgroundColor: a ? colors.primary : colors.card, borderColor: a ? colors.primary : colors.border }]}
              >
                <Feather name={t.i as any} size={18} color={a ? "#FFF" : colors.foreground} />
                <Text style={[styles.typeT, { color: a ? "#FFF" : colors.foreground }]}>{t.l}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>اسم العنوان</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.foreground }]} placeholder="مثال: منزل أهلي" placeholderTextColor={colors.mutedForeground} value={title} onChangeText={setTitle} textAlign="right" />

        <Text style={[styles.label, { color: colors.foreground }]}>المدينة</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.foreground }]} value={city} onChangeText={setCity} textAlign="right" />

        <Text style={[styles.label, { color: colors.foreground }]}>تفاصيل العنوان</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, height: 80, paddingTop: 12 }]} placeholder="حي، شارع، رقم المبنى، رقم الشقة" placeholderTextColor={colors.mutedForeground} value={details} onChangeText={setDetails} textAlign="right" multiline />

        <TouchableOpacity onPress={() => setDefaultAddr(!defaultAddr)} style={styles.defRow}>
          <View style={[styles.checkBox, { borderColor: colors.primary, backgroundColor: defaultAddr ? colors.primary : "transparent" }]}>
            {defaultAddr && <Feather name="check" size={12} color="#FFF" />}
          </View>
          <Text style={[styles.defT, { color: colors.foreground }]}>تعيين كعنوان افتراضي</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={styles.saveT}>حفظ العنوان</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  mapWrap: { height: 200, borderRadius: 18, overflow: "hidden", marginBottom: 10, position: "relative" },
  pin: { position: "absolute", top: "50%", left: "50%", marginLeft: -21, marginTop: -36 },
  gpsBtn: { position: "absolute", bottom: 10, left: 10, width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  autoBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center", justifyContent: "center", flexDirection: "row-reverse", gap: 6, marginBottom: 14, borderStyle: "dashed" },
  autoT: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  label: { fontFamily: "Tajawal_700Bold", fontSize: 13, textAlign: "right", marginBottom: 6, marginTop: 8 },
  typesGrid: { flexDirection: "row-reverse", gap: 8 },
  typeCard: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", borderWidth: 1, gap: 4 },
  typeT: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  input: { height: 48, borderRadius: 12, paddingHorizontal: 14, fontFamily: "Tajawal_500Medium", fontSize: 13 },
  defRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginTop: 12 },
  checkBox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  defT: { fontFamily: "Tajawal_500Medium", fontSize: 12 },
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 14, paddingBottom: 24 },
  saveBtn: { height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  saveT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 14 },
});
