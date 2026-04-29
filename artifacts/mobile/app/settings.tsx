import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";

export default function Settings() {
  const colors = useColors();
  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(false);
  const [sms, setSms] = useState(true);
  const [biometric, setBiometric] = useState(true);
  const [location, setLocation] = useState(true);

  const Section = ({ title, children }: any) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={[styles.sT, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={[styles.section, { backgroundColor: colors.card }]}>{children}</View>
    </View>
  );

  const Item = ({ icon, label, value, onPress, switchVal, onSwitch, iconBg, iconColor, danger }: any) => (
    <TouchableOpacity onPress={onPress} disabled={onSwitch !== undefined} style={styles.item}>
      {onSwitch !== undefined ? (
        <Switch value={switchVal} onValueChange={onSwitch} trackColor={{ true: colors.primary, false: "#E5E7EB" }} thumbColor="#FFF" />
      ) : (
        <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
      )}
      <Text style={[styles.itemT, { color: danger ? colors.danger : colors.foreground }]}>{label}</Text>
      <View style={[styles.itemIcon, { backgroundColor: (iconBg || colors.primaryLight) }]}>
        <Feather name={icon} size={16} color={iconColor || colors.primary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="الإعدادات" subtitle="تخصيص التطبيق وحسابك" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Section title="الحساب">
          <Item icon="user" label="تعديل الملف الشخصي" onPress={() => router.push("/edit-profile")} />
          <Item icon="lock" label="تغيير كلمة المرور" onPress={() => {}} iconBg={colors.accentLight} iconColor={colors.accent} />
          <Item icon="shield" label="الخصوصية والأمان" onPress={() => {}} iconBg="#EDE9FE" iconColor="#8B5CF6" />
        </Section>

        <Section title="الإشعارات">
          <Item icon="bell" label="الإشعارات الفورية" switchVal={push} onSwitch={setPush} iconBg="#FEF3C7" iconColor="#F59E0B" />
          <Item icon="mail" label="إشعارات البريد" switchVal={email} onSwitch={setEmail} iconBg={colors.accentLight} iconColor={colors.accent} />
          <Item icon="message-square" label="رسائل SMS" switchVal={sms} onSwitch={setSms} />
        </Section>

        <Section title="الأمان">
          <Item icon="smartphone" label="تسجيل الدخول بالبصمة" switchVal={biometric} onSwitch={setBiometric} iconBg="#EDE9FE" iconColor="#8B5CF6" />
          <Item icon="map-pin" label="مشاركة الموقع" switchVal={location} onSwitch={setLocation} />
        </Section>

        <Section title="التطبيق">
          <Item icon="globe" label="اللغة (العربية)" onPress={() => {}} />
          <Item icon="moon" label="المظهر (فاتح)" onPress={() => {}} iconBg="#1F2937" iconColor="#FFF" />
          <Item icon="info" label="عن التطبيق" onPress={() => {}} iconBg={colors.accentLight} iconColor={colors.accent} />
        </Section>

        <Section title="الحساب">
          <Item icon="log-out" label="تسجيل الخروج" onPress={() => router.replace("/onboarding")} iconBg={colors.dangerLight} iconColor={colors.danger} danger />
          <Item icon="trash-2" label="حذف الحساب" onPress={() => {}} iconBg={colors.dangerLight} iconColor={colors.danger} danger />
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  sT: { fontFamily: "Tajawal_700Bold", fontSize: 11, textAlign: "right", marginBottom: 6, marginRight: 4 },
  section: { borderRadius: 16, paddingHorizontal: 14 },
  item: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 10 },
  itemT: { fontFamily: "Tajawal_700Bold", fontSize: 13, flex: 1, textAlign: "right" },
  itemIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
