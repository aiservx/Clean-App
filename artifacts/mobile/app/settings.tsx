import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Modal, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";
import { useTheme, ThemeMode } from "@/lib/theme";
import { useI18n, Lang } from "@/lib/i18n";

export default function Settings() {
  const colors = useColors();
  const { t, lang, setLang } = useI18n();
  const { mode, setMode } = useTheme();
  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(false);
  const [sms, setSms] = useState(true);
  const [biometric, setBiometric] = useState(true);
  const [location, setLocation] = useState(true);
  const [langOpen, setLangOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const Section = ({ title, children }: any) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={[styles.sT, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={[styles.section, { backgroundColor: colors.card }]}>{children}</View>
    </View>
  );

  const Item = ({ icon, label, valueText, onPress, switchVal, onSwitch, iconBg, iconColor, danger }: any) => (
    <TouchableOpacity onPress={onPress} disabled={onSwitch !== undefined && !onPress} style={styles.item}>
      {onSwitch !== undefined ? (
        <Switch value={switchVal} onValueChange={onSwitch} trackColor={{ true: colors.primary, false: "#E5E7EB" }} thumbColor="#FFF" />
      ) : (
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
          {valueText ? <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 12, color: colors.mutedForeground }}>{valueText}</Text> : null}
          <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
        </View>
      )}
      <Text style={[styles.itemT, { color: danger ? colors.danger : colors.foreground }]}>{label}</Text>
      <View style={[styles.itemIcon, { backgroundColor: (iconBg || colors.primaryLight) }]}>
        <Feather name={icon} size={16} color={iconColor || colors.primary} />
      </View>
    </TouchableOpacity>
  );

  const langLabel = lang === "ar" ? t("language_arabic") : t("language_english");
  const modeLabel = mode === "light" ? t("light_mode") : mode === "dark" ? t("dark_mode") : t("system_mode");

  const ChoiceModal = ({ open, onClose, title, options, current, onPick }: any) => (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBg} onPress={onClose}>
        <Pressable style={[styles.modalCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text>
          {options.map((o: any) => {
            const active = o.value === current;
            return (
              <TouchableOpacity
                key={o.value}
                onPress={() => { onPick(o.value); onClose(); }}
                style={[styles.modalRow, { backgroundColor: active ? colors.primaryLight : "transparent" }]}
              >
                <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 14, color: active ? colors.primary : colors.foreground, flex: 1, textAlign: "right" }}>{o.label}</Text>
                {active && <Feather name="check" size={18} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title={t("settings_title")} subtitle={t("settings_sub2")} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Section title={t("account")}>
          <Item icon="user" label={t("edit_profile")} onPress={() => router.push("/edit-profile")} />
          <Item icon="lock" label={t("change_password")} onPress={() => {}} iconBg={colors.accentLight} iconColor={colors.accent} />
          <Item icon="shield" label={t("privacy_security")} onPress={() => {}} iconBg="#EDE9FE" iconColor="#8B5CF6" />
        </Section>

        <Section title={t("notifications")}>
          <Item icon="bell" label={t("push_notifs")} switchVal={push} onSwitch={setPush} iconBg="#FEF3C7" iconColor="#F59E0B" />
          <Item icon="mail" label={t("email_notifs")} switchVal={email} onSwitch={setEmail} iconBg={colors.accentLight} iconColor={colors.accent} />
          <Item icon="message-square" label={t("sms_notifs")} switchVal={sms} onSwitch={setSms} />
        </Section>

        <Section title={t("security")}>
          <Item icon="smartphone" label={t("biometric_login")} switchVal={biometric} onSwitch={setBiometric} iconBg="#EDE9FE" iconColor="#8B5CF6" />
          <Item icon="map-pin" label={t("share_location")} switchVal={location} onSwitch={setLocation} />
        </Section>

        <Section title={t("app")}>
          <Item icon="globe" label={t("language")} valueText={langLabel} onPress={() => setLangOpen(true)} />
          <Item icon="moon" label={t("appearance")} valueText={modeLabel} onPress={() => setThemeOpen(true)} iconBg="#1F2937" iconColor="#FFF" />
          <Item icon="info" label={t("about_app")} onPress={() => {}} iconBg={colors.accentLight} iconColor={colors.accent} />
        </Section>

        <Section title={t("account")}>
          <Item icon="log-out" label={t("signout")} onPress={() => router.replace("/onboarding")} iconBg={colors.dangerLight} iconColor={colors.danger} danger />
          <Item icon="trash-2" label={t("delete_account")} onPress={() => {}} iconBg={colors.dangerLight} iconColor={colors.danger} danger />
        </Section>
      </ScrollView>

      <ChoiceModal
        open={langOpen}
        onClose={() => setLangOpen(false)}
        title={t("pick_language")}
        current={lang}
        onPick={(v: Lang) => setLang(v)}
        options={[
          { value: "ar", label: t("language_arabic") },
          { value: "en", label: t("language_english") },
        ]}
      />
      <ChoiceModal
        open={themeOpen}
        onClose={() => setThemeOpen(false)}
        title={t("pick_appearance")}
        current={mode}
        onPick={(v: ThemeMode) => setMode(v)}
        options={[
          { value: "light", label: t("light_mode") },
          { value: "dark", label: t("dark_mode") },
          { value: "system", label: t("system_mode") },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  sT: { fontFamily: "Tajawal_700Bold", fontSize: 11, textAlign: "right", marginBottom: 6, marginRight: 4 },
  section: { borderRadius: 16, paddingHorizontal: 14 },
  item: { flexDirection: "row-reverse", alignItems: "center", paddingVertical: 12, gap: 10 },
  itemT: { fontFamily: "Tajawal_700Bold", fontSize: 13, flex: 1, textAlign: "right" },
  itemIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 380, borderRadius: 18, padding: 16 },
  modalTitle: { fontFamily: "Tajawal_700Bold", fontSize: 15, marginBottom: 10, textAlign: "right" },
  modalRow: { flexDirection: "row-reverse", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, gap: 8 },
});
