import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!email || !pwd) return Alert.alert("تنبيه", "أدخل البريد وكلمة المرور");
    setBusy(true);
    const { error } = await signIn(email.trim(), pwd);
    setBusy(false);
    if (error) return Alert.alert("خطأ", error);
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Feather name="chevron-right" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.logo, { backgroundColor: colors.primary }]}>
          <MaterialCommunityIcons name="broom" size={32} color="#FFF" />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>أهلاً بعودتك</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>سجّل دخولك للمتابعة</Text>

        <View style={[styles.field, { backgroundColor: colors.card }]}>
          <Feather name="mail" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="البريد الإلكتروني"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            textAlign="right"
          />
        </View>

        <View style={[styles.field, { backgroundColor: colors.card }]}>
          <Feather name="lock" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="كلمة المرور"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            value={pwd}
            onChangeText={setPwd}
            textAlign="right"
          />
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={onSubmit} disabled={busy} style={{ marginTop: 8 }}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
            <Text style={styles.btnT}>{busy ? "جاري الدخول..." : "تسجيل الدخول"}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/signup")} style={{ marginTop: 16, alignItems: "center" }}>
          <Text style={{ fontFamily: "Tajawal_600SemiBold", color: colors.foreground, fontSize: 14 }}>
            ليس لديك حساب؟ <Text style={{ color: colors.primary }}>إنشاء حساب جديد</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/(tabs)")} style={{ marginTop: 24, alignItems: "center" }}>
          <Text style={{ fontFamily: "Tajawal_500Medium", color: colors.mutedForeground, fontSize: 13 }}>
            تصفح كزائر
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  logo: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center", alignSelf: "flex-end", marginBottom: 16 },
  title: { fontFamily: "Tajawal_700Bold", fontSize: 26, textAlign: "right", marginBottom: 4 },
  sub: { fontFamily: "Tajawal_500Medium", fontSize: 14, textAlign: "right", marginBottom: 24 },
  field: { flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 16, height: 56, borderRadius: 16, marginBottom: 12, gap: 10 },
  input: { flex: 1, fontFamily: "Tajawal_500Medium", fontSize: 14 },
  btn: { height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  btnT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 16 },
});
