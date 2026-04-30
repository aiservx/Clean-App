import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useI18n();
  const { signIn, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!email || !pwd) return Alert.alert(t("error"), t("enter_credentials"));
    setBusy(true);

    try {
      const res = await signIn(email.trim(), pwd);
      setBusy(false);

      if (res.error) {
        return Alert.alert(t("signin_error"), res.error);
      }

      const role = res.role || "user";
      console.log("[v0] Login successful with role:", role);
      
      // Redirect based on role
      if (role === "provider" || role === "admin") {
        router.replace("/(provider)/home" as any);
      } else {
        router.replace("/(tabs)/home" as any);
      }
    } catch (e) {
      setBusy(false);
      Alert.alert(t("signin_error"), (e as Error).message);
    }
  };

  const browseAsGuest = async () => {
    // Clear any stale session before guest browsing
    await signOut();
    router.replace("/(tabs)/home" as any);
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
        <Text style={[styles.title, { color: colors.foreground }]}>{t("login_title")}</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>{t("login_sub")}</Text>

        <View style={[styles.field, { backgroundColor: colors.card }]}>
          <Feather name="mail" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder={t("email")}
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
            placeholder={t("password")}
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            value={pwd}
            onChangeText={setPwd}
            textAlign="right"
          />
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={onSubmit} disabled={busy} style={{ marginTop: 8 }}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
            <Text style={styles.btnT}>{busy ? t("loading") : t("signin")}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/signup")} style={{ marginTop: 16, alignItems: "center" }}>
          <Text style={{ fontFamily: "Tajawal_600SemiBold", color: colors.foreground, fontSize: 14 }}>
            {t("no_account")} <Text style={{ color: colors.primary }}>{t("signup_link")}</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={browseAsGuest} style={{ marginTop: 24, alignItems: "center" }}>
          <Text style={{ fontFamily: "Tajawal_500Medium", color: colors.mutedForeground, fontSize: 13 }}>
            {t("browse_as_guest")}
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
