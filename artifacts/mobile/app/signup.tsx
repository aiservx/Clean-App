import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth, type Role } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useI18n();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pwd, setPwd] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!name || !email || !pwd) return Alert.alert(t("error"), t("enter_credentials"));
    if (pwd.length < 6) return Alert.alert(t("error"), "Password must be at least 6 characters");
    setBusy(true);
    try {
      const { error } = await signUp({ email: email.trim(), password: pwd, full_name: name, phone, role });
      if (error) {
        setBusy(false);
        return Alert.alert(t("error"), error);
      }
      setBusy(false);
      Alert.alert(t("ok"), "Account created. Sign in to continue.", [
        { text: t("ok"), onPress: () => router.replace("/login") },
      ]);
    } catch (e) {
      setBusy(false);
      Alert.alert(t("error"), (e as Error)?.message || "Network error");
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Feather name="chevron-right" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.logo, { backgroundColor: colors.primary }]}>
          <MaterialCommunityIcons name="broom" size={32} color="#FFF" />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>{t("signup_title")}</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>{t("account_type")}</Text>

        <View style={styles.roleRow}>
          <TouchableOpacity
            onPress={() => setRole("user")}
            style={[styles.roleC, { borderColor: role === "user" ? colors.primary : colors.border, backgroundColor: role === "user" ? colors.primaryLight : colors.card }]}>
            <Feather name="user" size={20} color={role === "user" ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.roleT, { color: role === "user" ? colors.primary : colors.foreground }]}>{t("customer")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setRole("provider")}
            style={[styles.roleC, { borderColor: role === "provider" ? colors.accent : colors.border, backgroundColor: role === "provider" ? colors.accentLight : colors.card }]}>
            <MaterialCommunityIcons name="briefcase-check" size={20} color={role === "provider" ? colors.accent : colors.mutedForeground} />
            <Text style={[styles.roleT, { color: role === "provider" ? colors.accent : colors.foreground }]}>{t("provider")}</Text>
          </TouchableOpacity>
        </View>

        {[
          { i: "user", p: t("full_name"), v: name, s: setName, k: "default" as const },
          { i: "phone", p: t("phone"), v: phone, s: setPhone, k: "phone-pad" as const },
          { i: "mail", p: t("email"), v: email, s: setEmail, k: "email-address" as const },
          { i: "lock", p: t("password"), v: pwd, s: setPwd, k: "default" as const, sec: true },
        ].map((f) => (
          <View key={f.p} style={[styles.field, { backgroundColor: colors.card }]}>
            <Feather name={f.i as any} size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder={f.p}
              placeholderTextColor={colors.mutedForeground}
              keyboardType={f.k}
              autoCapitalize="none"
              secureTextEntry={(f as any).sec}
              value={f.v}
              onChangeText={f.s}
              textAlign="right"
            />
          </View>
        ))}

        <TouchableOpacity activeOpacity={0.9} onPress={onSubmit} disabled={busy} style={{ marginTop: 8 }}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
            <Text style={styles.btnT}>{busy ? t("loading") : t("signup")}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/login")} style={{ marginTop: 16, alignItems: "center" }}>
          <Text style={{ fontFamily: "Tajawal_600SemiBold", color: colors.foreground, fontSize: 14 }}>
            {t("have_account")} <Text style={{ color: colors.primary }}>{t("signin_link")}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  logo: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", alignSelf: "flex-end", marginBottom: 12 },
  title: { fontFamily: "Tajawal_700Bold", fontSize: 24, textAlign: "right", marginBottom: 4 },
  sub: { fontFamily: "Tajawal_500Medium", fontSize: 13, textAlign: "right", marginBottom: 18 },
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  roleC: { flex: 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 16, borderWidth: 1.5 },
  roleT: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  field: { flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 16, height: 54, borderRadius: 16, marginBottom: 10, gap: 10 },
  input: { flex: 1, fontFamily: "Tajawal_500Medium", fontSize: 14 },
  btn: { height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  btnT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 16 },
});
