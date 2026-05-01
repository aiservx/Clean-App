import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";

const FAVS = [
  { id: "1", n: "أحمد علي", r: "4.9", e: "5", img: require("@/assets/images/cleaner-fatima.png"), st: "متاح الآن" },
  { id: "2", n: "سعد عبدالله", r: "4.8", e: "3", img: require("@/assets/images/cleaner-sara.png"), st: "متاح الآن" },
  { id: "3", n: "محمد حسين", r: "4.7", e: "4", img: require("@/assets/images/cleaner-noura.png"), st: "مشغول" },
];

export default function FavoritesScreen() {
  const colors = useColors();
  const [favs, setFavs] = useState(FAVS);

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="المفضلة" subtitle="العمال المفضلين لديك" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 12 }} showsVerticalScrollIndicator={false}>
        {favs.map((f) => (
          <View key={f.id} style={[styles.card, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => setFavs(favs.filter((x) => x.id !== f.id))}>
              <MaterialCommunityIcons name="heart" size={22} color={colors.danger} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: "flex-end", marginHorizontal: 12 }}>
              <Text style={[styles.n, { color: colors.foreground }]}>{f.n}</Text>
              <View style={styles.statsRow}>
                <View style={[styles.statusPill, { backgroundColor: f.st === "متاح الآن" ? colors.successLight : colors.warningLight }]}>
                  <Text style={[styles.statusT, { color: f.st === "متاح الآن" ? colors.success : colors.warning }]}>{f.st}</Text>
                </View>
                <Text style={[styles.exp, { color: colors.mutedForeground }]}>خبرة {f.e} سنوات</Text>
                <View style={styles.dotSep} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <Feather name="star" size={11} color={colors.warning} />
                  <Text style={[styles.exp, { color: colors.foreground, fontFamily: "Tajawal_700Bold" }]}>{f.r}</Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => router.push(`/provider/${f.id}`)}>
                <Text style={styles.btnT}>عرض البروفايل واحجز</Text>
              </TouchableOpacity>
            </View>
            <Image source={f.img} style={{ width: 56, height: 56, borderRadius: 28 }} />
          </View>
        ))}
        {favs.length === 0 && (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Feather name="heart" size={48} color={colors.mutedForeground} />
            <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 15, color: colors.foreground, marginTop: 10 }}>لا يوجد عمال في المفضلة</Text>
            <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 4 }}>أضف العمال المفضلين لديك لطلبهم بسهولة</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  card: { padding: 12, borderRadius: 18, flexDirection: "row-reverse", alignItems: "center", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  n: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, marginBottom: 8 },
  exp: { fontFamily: "Tajawal_500Medium", fontSize: 10 },
  dotSep: { width: 3, height: 3, borderRadius: 2, backgroundColor: "#CBD5E1" },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  statusT: { fontFamily: "Tajawal_700Bold", fontSize: 9 },
  btn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100 },
  btnT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 11 },
});
