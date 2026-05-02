import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";

const DAYS = [
  { id: "sun", l: "الأحد" },
  { id: "mon", l: "الاثنين" },
  { id: "tue", l: "الثلاثاء" },
  { id: "wed", l: "الأربعاء" },
  { id: "thu", l: "الخميس" },
  { id: "fri", l: "الجمعة" },
  { id: "sat", l: "السبت" },
];

export default function ProviderHours() {
  const colors = useColors();
  const [schedule, setSchedule] = useState<Record<string, { active: boolean; from: string; to: string }>>({
    sun: { active: true, from: "08:00", to: "20:00" },
    mon: { active: true, from: "08:00", to: "20:00" },
    tue: { active: true, from: "08:00", to: "20:00" },
    wed: { active: true, from: "08:00", to: "20:00" },
    thu: { active: true, from: "08:00", to: "20:00" },
    fri: { active: false, from: "—", to: "—" },
    sat: { active: true, from: "10:00", to: "18:00" },
  });

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="مواعيد العمل" subtitle="حدد ساعات استقبال الطلبات" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.tipBox, { backgroundColor: colors.accentLight }]}>
          <Feather name="info" size={16} color={colors.accent} />
          <Text style={[styles.tipT, { color: colors.accent }]}>سيتمكن العملاء من الحجز فقط خلال هذه الأوقات</Text>
        </View>

        <View style={{ gap: 8 }}>
          {DAYS.map((d) => {
            const s = schedule[d.id];
            return (
              <View key={d.id} style={[styles.dayRow, { backgroundColor: colors.card }]}>
                <Switch
                  value={s.active}
                  onValueChange={(v) => setSchedule({ ...schedule, [d.id]: { ...s, active: v, from: v ? "08:00" : "—", to: v ? "20:00" : "—" } })}
                  trackColor={{ true: colors.primary, false: "#E5E7EB" }}
                  thumbColor="#FFF"
                />
                <View style={{ flex: 1, alignItems: "center", flexDirection: "row-reverse", justifyContent: "center", gap: 8 }}>
                  {s.active ? (
                    <>
                      <View style={[styles.timeBox, { backgroundColor: colors.muted }]}>
                        <Text style={[styles.timeT, { color: colors.foreground }]}>{s.to}</Text>
                      </View>
                      <Text style={[styles.dash, { color: colors.mutedForeground }]}>إلى</Text>
                      <View style={[styles.timeBox, { backgroundColor: colors.muted }]}>
                        <Text style={[styles.timeT, { color: colors.foreground }]}>{s.from}</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={{ fontFamily: "Tajawal_500Medium", fontSize: 12, color: colors.mutedForeground }}>مغلق</Text>
                  )}
                </View>
                <Text style={[styles.dayL, { color: colors.foreground }]}>{d.l}</Text>
              </View>
            );
          })}
        </View>

        <View style={[styles.summaryBox, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.sumL, { color: colors.primary }]}>ملخص الأسبوع</Text>
          <Text style={[styles.sumV, { color: colors.foreground }]}>
            متاح {Object.values(schedule).filter((s) => s.active).length} أيام · إجمالي {
              Object.values(schedule)
                .filter((s) => s.active)
                .reduce((acc, s) => acc + (parseInt(s.to) - parseInt(s.from)), 0)
            } ساعة أسبوعياً
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={styles.saveT}>حفظ المواعيد</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  tipBox: { padding: 12, borderRadius: 12, flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 14 },
  tipT: { fontFamily: "Tajawal_500Medium", fontSize: 11, flex: 1, textAlign: "right" },
  dayRow: { padding: 12, borderRadius: 14, flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  dayL: { fontFamily: "Tajawal_700Bold", fontSize: 13, width: 70, textAlign: "right" },
  timeBox: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  timeT: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  dash: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  summaryBox: { marginTop: 14, padding: 14, borderRadius: 14, alignItems: "flex-end" },
  sumL: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  sumV: { fontFamily: "Tajawal_700Bold", fontSize: 13, marginTop: 4 },
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 14, paddingBottom: 24 },
  saveBtn: { height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  saveT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 14 },
});
