import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, I18nManager } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth, type Role } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

type MsgType = "error" | "success" | null;

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useI18n();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pwd, setPwd] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [role, setRole] = useState<Role>("user");
  const [busy, setBusy] = useState(false);
  const [msgType, setMsgType] = useState<MsgType>(null);
  const [msgText, setMsgText] = useState("");

  const showMsg = (type: MsgType, text: string) => {
    setMsgType(type);
    setMsgText(text);
  };

  const clearMsg = () => {
    setMsgType(null);
    setMsgText("");
  };

  const onSubmit = async () => {
    clearMsg();
    if (!name.trim()) return showMsg("error", "يرجى إدخال الاسم الكامل");
    if (!username.trim()) return showMsg("error", "يرجى إدخال اسم المستخدم");
    if (!pwd) return showMsg("error", "يرجى إدخال كلمة المرور");
    if (pwd.length < 6) return showMsg("error", "كلمة المرور يجب أن تكون 6 أحرف على الأقل");

    const loginEmail = username.includes("@") ? username.trim() : `${username.trim()}@clean-app.local`;
    setBusy(true);
    try {
      const { error } = await signUp({ email: loginEmail, password: pwd, full_name: name, phone, role, username: username.trim(), gender });
      if (error) {
        setBusy(false);
        const errMsg = error.includes("already") || error.includes("duplicate")
          ? "اسم المستخدم هذا مستخدم بالفعل، جرّب اسماً آخر"
          : error.includes("password")
          ? "كلمة المرور ضعيفة، اختر كلمة أقوى"
          : error.includes("email")
          ? "البريد الإلكتروني غير صحيح"
          : error;
        showMsg("error", errMsg);
        return;
      }
      setBusy(false);
      showMsg("success", role === "provider"
        ? "تم إنشاء حساب مزود الخدمة بنجاح ✓ — سجّل دخولك للمتابعة"
        : "تم إنشاء الحساب بنجاح ✓ — سجّل دخولك للمتابعة"
      );
      setTimeout(() => router.replace("/login"), 2200);
    } catch (e) {
      setBusy(false);
      showMsg("error", (e as Error)?.message || "خطأ في الاتصال بالشبكة");
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Feather name={I18nManager.isRTL ? "chevron-right" : "chevron-left"} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.logo, { backgroundColor: colors.primary }]}>
          <MaterialCommunityIcons name="broom" size={32} color="#FFF" />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>{t("signup_title")}</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>{t("account_type")}</Text>

        {msgType !== null && (
          <View style={[
            styles.banner,
            msgType === "success"
              ? { backgroundColor: "#D1FAE5", borderColor: "#16C47F" }
              : { backgroundColor: "#FEE2E2", borderColor: "#EF4444" },
          ]}>
            <Feather
              name={msgType === "success" ? "check-circle" : "alert-circle"}
              size={18}
              color={msgType === "success" ? "#16C47F" : "#EF4444"}
            />
            <Text style={[
              styles.bannerText,
              { color: msgType === "success" ? "#065F46" : "#991B1B" },
            ]}>
              {msgText}
            </Text>
          </View>
        )}

        <View style={styles.roleRow}>
          <TouchableOpacity
            onPress={() => { setRole("user"); clearMsg(); }}
            style={[styles.roleC, { borderColor: role === "user" ? colors.primary : colors.border, backgroundColor: role === "user" ? colors.primaryLight : colors.card }]}>
            <Feather name="user" size={20} color={role === "user" ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.roleT, { color: role === "user" ? colors.primary : colors.foreground }]}>{t("customer")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setRole("provider"); clearMsg(); }}
            style={[styles.roleC, { borderColor: role === "provider" ? colors.accent : colors.border, backgroundColor: role === "provider" ? colors.accentLight : colors.card }]}>
            <MaterialCommunityIcons name="briefcase-check" size={20} color={role === "provider" ? colors.accent : colors.mutedForeground} />
            <Text style={[styles.roleT, { color: role === "provider" ? colors.accent : colors.foreground }]}>{t("provider")}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.genderLabel, { color: colors.foreground }]}>{t("gender") || "الجنس"}</Text>
        <View style={styles.genderRow}>
          <TouchableOpacity
            onPress={() => setGender("male")}
            style={[styles.genderBtn, { borderColor: gender === "male" ? colors.primary : colors.border, backgroundColor: gender === "male" ? colors.primaryLight : colors.card }]}
          >
            <MaterialCommunityIcons name="gender-male" size={20} color={gender === "male" ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.genderT, { color: gender === "male" ? colors.primary : colors.foreground }]}>{t("male") || "ذكر"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setGender("female")}
            style={[styles.genderBtn, { borderColor: gender === "female" ? "#EC4899" : colors.border, backgroundColor: gender === "female" ? "#FCE7F3" : colors.card }]}
          >
            <MaterialCommunityIcons name="gender-female" size={20} color={gender === "female" ? "#EC4899" : colors.mutedForeground} />
            <Text style={[styles.genderT, { color: gender === "female" ? "#EC4899" : colors.foreground }]}>{t("female") || "أنثى"}</Text>
          </TouchableOpacity>
        </View>

        {[
          { i: "user", p: t("full_name"), v: name, s: setName, k: "default" as const },
          { i: "at-sign" as any, p: t("username") || "اسم المستخدم", v: username, s: setUsername, k: "default" as const },
          { i: "phone", p: t("phone"), v: phone, s: setPhone, k: "phone-pad" as const },
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
              onChangeText={(v) => { f.s(v); clearMsg(); }}
            />
          </View>
        ))}

        <TouchableOpacity activeOpacity={0.9} onPress={onSubmit} disabled={busy} style={{ marginTop: 8 }}>
          <LinearGradient
            colors={busy ? ["#9CA3AF", "#6B7280"] : [colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btn}
          >
            <Text style={styles.btnT}>
              {busy ? "جارٍ إنشاء الحساب..." : t("signup")}
            </Text>
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
  title: { fontFamily: "Tajawal_700Bold", fontSize: 24, marginBottom: 4 },
  sub: { fontFamily: "Tajawal_500Medium", fontSize: 13, marginBottom: 14 },
  banner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1.5, marginBottom: 14 },
  bannerText: { fontFamily: "Tajawal_600SemiBold", fontSize: 14, flex: 1, textAlign: "right" },
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  roleC: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 16, borderWidth: 1.5 },
  roleT: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  field: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, height: 54, borderRadius: 16, marginBottom: 10, gap: 10 },
  input: { flex: 1, fontFamily: "Tajawal_500Medium", fontSize: 14 },
  genderLabel: { fontFamily: "Tajawal_700Bold", fontSize: 13, marginBottom: 8 },
  genderRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  genderBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderRadius: 16, borderWidth: 1.5 },
  genderT: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  btn: { height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  btnT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 16 },
});
