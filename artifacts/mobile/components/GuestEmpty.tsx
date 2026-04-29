import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";

export default function GuestEmpty({ title, subtitle, icon = "lock" }: { title: string; subtitle: string; icon?: string }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.box, { backgroundColor: colors.background, paddingTop: insets.top + 60 }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
        <MaterialCommunityIcons name={icon as any} size={48} color={colors.primary} />
      </View>
      <Text style={[styles.t, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.s, { color: colors.mutedForeground }]}>{subtitle}</Text>
      <TouchableOpacity activeOpacity={0.9} onPress={() => router.push("/login")} style={{ width: "80%", marginTop: 8 }}>
        <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
          <Text style={styles.btnT}>تسجيل الدخول</Text>
          <Feather name="log-in" size={18} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/signup")} style={{ marginTop: 14 }}>
        <Text style={{ fontFamily: "Tajawal_600SemiBold", color: colors.primary, fontSize: 14 }}>إنشاء حساب جديد</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, alignItems: "center", paddingHorizontal: 24, gap: 14 },
  iconWrap: { width: 96, height: 96, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  t: { fontFamily: "Tajawal_700Bold", fontSize: 22, textAlign: "center" },
  s: { fontFamily: "Tajawal_500Medium", fontSize: 14, textAlign: "center", marginBottom: 12 },
  btn: { height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", flexDirection: "row-reverse", gap: 10 },
  btnT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 16 },
});
