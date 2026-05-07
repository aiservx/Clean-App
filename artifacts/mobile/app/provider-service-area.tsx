import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, ActivityIndicator, Alert, TextInput, I18nManager,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const RADIUS_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100];

const DAYS = [
  { key: "0", label: "الأحد" },
  { key: "1", label: "الإثنين" },
  { key: "2", label: "الثلاثاء" },
  { key: "3", label: "الأربعاء" },
  { key: "4", label: "الخميس" },
  { key: "5", label: "الجمعة" },
  { key: "6", label: "السبت" },
];

const HOUR_OPTIONS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "00:00",
];

function formatHour(h: string) {
  const hour = parseInt(h.split(":")[0], 10);
  if (hour === 0)  return "12:00 ص";
  if (hour < 12)   return `${hour}:00 ص`;
  if (hour === 12) return "12:00 ظ";
  return `${hour - 12}:00 م`;
}

type DayHours  = { enabled: boolean; open: string; close: string };
type WorkingHours = Record<string, DayHours>;

const DEFAULT_HOURS: WorkingHours = {
  "0": { enabled: true,  open: "08:00", close: "22:00" },
  "1": { enabled: true,  open: "08:00", close: "22:00" },
  "2": { enabled: true,  open: "08:00", close: "22:00" },
  "3": { enabled: true,  open: "08:00", close: "22:00" },
  "4": { enabled: true,  open: "08:00", close: "22:00" },
  "5": { enabled: false, open: "12:00", close: "22:00" },
  "6": { enabled: true,  open: "08:00", close: "22:00" },
};

export default function ProviderServiceArea() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { session } = useAuth();

  const [radius, setRadius]           = useState(20);
  const [hours,  setHours]            = useState<WorkingHours>(DEFAULT_HOURS);
  const [city,   setCity]             = useState("");
  const [district, setDistrict]       = useState("");
  const [loading, setLoading]         = useState(true);
  const [saving,  setSaving]          = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    const { data } = await supabase
      .from("providers")
      .select("service_radius_km, working_hours, service_city, service_district")
      .eq("id", session.user.id)
      .maybeSingle();
    if (data) {
      if (data.service_radius_km) setRadius(data.service_radius_km);
      if (data.working_hours)     setHours(data.working_hours as WorkingHours);
      if ((data as any).service_city)     setCity((data as any).service_city);
      if ((data as any).service_district) setDistrict((data as any).service_district);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const toggleDay = (key: string) =>
    setHours((h) => ({ ...h, [key]: { ...h[key], enabled: !h[key].enabled } }));

  const setHourField = (key: string, field: "open" | "close", value: string) =>
    setHours((h) => ({ ...h, [key]: { ...h[key], [field]: value } }));

  const save = async () => {
    if (!session?.user) return;
    setSaving(true);
    const { error } = await supabase
      .from("providers")
      .update({
        service_radius_km: radius,
        working_hours: hours,
        service_city: city.trim() || null,
        service_district: district.trim() || null,
      })
      .eq("id", session.user.id);
    setSaving(false);
    if (error) {
      Alert.alert("خطأ", "فشل الحفظ: " + error.message);
    } else {
      Alert.alert("✓ تم الحفظ", "تم تحديث منطقة الخدمة ومواعيد العمل بنجاح", [
        { text: "حسناً", onPress: () => router.back() },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={[styles.c, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="منطقة الخدمة" subtitle="نطاق التنقل ومواعيد العمل" />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ── Primary service location ──────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHead}>
            <MaterialCommunityIcons name="map-marker" size={22} color={colors.primary} />
            <View style={{ flex: 1, marginStart: 10 }}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>منطقة الخدمة الأساسية</Text>
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>المدينة والحي الذي تعمل فيه بالدرجة الأولى</Text>
            </View>
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.fieldWrap, { backgroundColor: colors.background, flex: 1 }]}>
              <Feather name="home" size={14} color={colors.mutedForeground} />
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground }]}
                value={city}
                onChangeText={setCity}
                placeholder="المدينة (مثال: الرياض)"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={[styles.fieldWrap, { backgroundColor: colors.background, flex: 1 }]}>
              <Feather name="map-pin" size={14} color={colors.mutedForeground} />
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground }]}
                value={district}
                onChangeText={setDistrict}
                placeholder="الحي (مثال: العليا)"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>
        </View>

        {/* ── Radius picker ─────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHead}>
            <MaterialCommunityIcons name="map-marker-radius" size={22} color={colors.primary} />
            <View style={{ flex: 1, marginStart: 10 }}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>نطاق التنقل</Text>
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>أقصى مسافة تتنقل إليها لتنفيذ الخدمة</Text>
            </View>
            <View style={[styles.radiusBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.radiusBadgeT, { color: colors.primary }]}>{radius} كم</Text>
            </View>
          </View>

          <View style={styles.chipGrid}>
            {RADIUS_OPTIONS.map((r) => {
              const active = radius === r;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRadius(r)}
                  activeOpacity={0.8}
                  style={[
                    styles.chip,
                    { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primaryLight : colors.background },
                  ]}
                >
                  <Text style={[styles.chipT, { color: active ? colors.primary : colors.mutedForeground }]}>{r} كم</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.infoBox, { backgroundColor: colors.background }]}>
            <Feather name="info" size={13} color={colors.mutedForeground} />
            <Text style={[styles.infoT, { color: colors.mutedForeground }]}>
              العملاء خارج هذا النطاق لن يظهر لهم اسمك في قائمة الحجز الفوري
            </Text>
          </View>
        </View>

        {/* ── Working hours ─────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>مواعيد العمل الأسبوعية</Text>

        {DAYS.map((d) => {
          const dh      = hours[d.key] ?? { enabled: true, open: "08:00", close: "22:00" };
          const expanded = expandedDay === d.key;

          return (
            <View key={d.key} style={[styles.dayCard, { backgroundColor: colors.card }]}>
              <TouchableOpacity
                style={styles.dayRow}
                onPress={() => dh.enabled && setExpandedDay(expanded ? null : d.key)}
                activeOpacity={0.8}
              >
                <Switch
                  value={dh.enabled}
                  onValueChange={() => { toggleDay(d.key); if (!dh.enabled) setExpandedDay(d.key); }}
                  trackColor={{ true: colors.primary, false: "#E5E7EB" }}
                  thumbColor="#FFF"
                />
                <Text style={[styles.dayLabel, { color: dh.enabled ? colors.foreground : colors.mutedForeground }]}>
                  {d.label}
                </Text>
                {dh.enabled ? (
                  <Text style={[styles.dayHoursT, { color: colors.primary }]}>{dh.open} — {dh.close}</Text>
                ) : (
                  <Text style={[styles.dayOffT, { color: colors.mutedForeground }]}>إجازة</Text>
                )}
                {dh.enabled && (
                  <Feather name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
                )}
              </TouchableOpacity>

              {expanded && dh.enabled && (
                <View style={[styles.hoursEditor, { borderTopColor: colors.border }]}>
                  {(["open", "close"] as const).map((field) => (
                    <View key={field} style={styles.timeRow}>
                      <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>
                        {field === "open" ? "من" : "حتى"}
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 4 }}>
                        {HOUR_OPTIONS.map((hv) => {
                          const active = dh[field] === hv;
                          return (
                            <TouchableOpacity
                              key={hv}
                              onPress={() => setHourField(d.key, field, hv)}
                              activeOpacity={0.8}
                              style={[
                                styles.hourChip,
                                { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primaryLight : colors.background },
                              ]}
                            >
                              <Text style={[styles.hourChipT, { color: active ? colors.primary : colors.mutedForeground }]}>
                                {formatHour(hv)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: colors.card, paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={save}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Feather name="save" size={16} color="#FFF" />
              <Text style={styles.saveBtnT}>حفظ الإعدادات</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },

  section:     { padding: 16, borderRadius: 18, marginBottom: 16 },
  sectionHead: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  sectionSub:   { fontFamily: "Tajawal_500Medium", fontSize: 11, marginTop: 2 },
  radiusBadge:  { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100 },
  radiusBadgeT: { fontFamily: "Tajawal_700Bold", fontSize: 15 },

  fieldRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  fieldWrap: { flexDirection: "row", alignItems: "center", gap: 8, height: 44, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  fieldInput: { flex: 1, fontFamily: "Tajawal_500Medium", fontSize: 13 },

  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip:     { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 100, borderWidth: 1.5 },
  chipT:    { fontFamily: "Tajawal_700Bold", fontSize: 12 },

  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 10 },
  infoT:   { fontFamily: "Tajawal_500Medium", fontSize: 11, flex: 1, lineHeight: 18 },

  sectionLabel: { fontFamily: "Tajawal_700Bold", fontSize: 14, marginBottom: 10, marginTop: 4 },

  dayCard: { borderRadius: 16, marginBottom: 8, overflow: "hidden" },
  dayRow:  { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  dayLabel:   { flex: 1, fontFamily: "Tajawal_700Bold", fontSize: 13 },
  dayHoursT:  { fontFamily: "Tajawal_500Medium", fontSize: 12 },
  dayOffT:    { fontFamily: "Tajawal_500Medium", fontSize: 12 },

  hoursEditor: { borderTopWidth: 1, padding: 12, gap: 14 },
  timeRow:     { flexDirection: "row", alignItems: "center", gap: 10 },
  timeLabel:   { fontFamily: "Tajawal_700Bold", fontSize: 12, width: 36 },
  hourChip:    { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 100, borderWidth: 1 },
  hourChipT:   { fontFamily: "Tajawal_500Medium", fontSize: 11 },

  bottom:   { position: "absolute", bottom: 0, start: 0, end: 0, padding: 16 },
  saveBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 16 },
  saveBtnT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 14 },
});
