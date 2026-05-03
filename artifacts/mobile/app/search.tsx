import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image , I18nManager} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";

const RECENT = ["تنظيف منازل", "تنظيف كنب", "تنظيف عميق", "غسيل سجاد"];
const POPULAR = [
  { t: "تنظيف منازل", i: "home", c: "#16C47F" },
  { t: "تنظيف عميق", i: "droplet", c: "#2F80ED" },
  { t: "تنظيف مكاتب", i: "briefcase", c: "#F59E0B" },
  { t: "تنظيف فلل", i: "home", c: "#8B5CF6" },
];

const PROVIDERS = [
  { id: "1", n: "أحمد علي", r: "4.9", img: require("@/assets/images/cleaner-fatima.png") },
  { id: "2", n: "سعد عبدالله", r: "4.8", img: require("@/assets/images/cleaner-sara.png") },
  { id: "3", n: "محمد حسين", r: "4.7", img: require("@/assets/images/cleaner-noura.png") },
];

export default function SearchScreen() {
  const colors = useColors();
  const [q, setQ] = useState("");

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="البحث" />
      <View style={[styles.search, { backgroundColor: colors.card }]}>
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          autoFocus
          placeholder="ابحث عن خدمة أو عامل..."
          placeholderTextColor={colors.mutedForeground}
          style={styles.input}
          textAlign="right"
          value={q}
          onChangeText={setQ}
        />
        {q.length > 0 && (
          <TouchableOpacity onPress={() => setQ("")}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.label, { color: colors.foreground }]}>عمليات البحث الأخيرة</Text>
        <View style={styles.tags}>
          {RECENT.map((t) => (
            <TouchableOpacity key={t} style={[styles.tag, { backgroundColor: colors.card }]}>
              <Feather name="clock" size={12} color={colors.mutedForeground} />
              <Text style={[styles.tagT, { color: colors.foreground }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.foreground, marginTop: 18 }]}>الأكثر بحثاً</Text>
        <View style={styles.popGrid}>
          {POPULAR.map((p) => (
            <TouchableOpacity key={p.t} style={[styles.popCard, { backgroundColor: colors.card }]} onPress={() => router.push("/services")}>
              <View style={[styles.popIcon, { backgroundColor: p.c + "22" }]}>
                <Feather name={p.i as any} size={20} color={p.c} />
              </View>
              <Text style={[styles.popT, { color: colors.foreground }]}>{p.t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.foreground, marginTop: 18 }]}>عمال موصى بهم</Text>
        <View style={{ gap: 10 }}>
          {PROVIDERS.map((p) => (
            <TouchableOpacity key={p.id} style={[styles.prov, { backgroundColor: colors.card }]} onPress={() => router.push(`/provider/${p.id}`)}>
              <Image source={p.img} style={{ width: 44, height: 44, borderRadius: 22 }} />
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <Text style={[styles.provN, { color: colors.foreground }]}>{p.n}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <MaterialCommunityIcons name="star" size={11} color={colors.warning} />
                  <Text style={[styles.provR, { color: colors.mutedForeground }]}>{p.r}</Text>
                </View>
              </View>
              <Feather name={I18nManager.isRTL ? "chevron-left" : "chevron-right"} size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  search: {
    marginHorizontal: 16,
    marginBottom: 14,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  input: { flex: 1, fontFamily: "Tajawal_500Medium", fontSize: 13 },
  label: { fontFamily: "Tajawal_700Bold", fontSize: 14, marginBottom: 8 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, gap: 6 },
  tagT: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  popGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  popCard: { width: "48%", padding: 12, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  popIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  popT: { fontFamily: "Tajawal_700Bold", fontSize: 12, flex: 1 },
  prov: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 16 },
  provN: { fontFamily: "Tajawal_700Bold", fontSize: 13, marginBottom: 2 },
  provR: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
});
