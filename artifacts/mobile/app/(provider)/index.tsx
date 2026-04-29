import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import AppMap from "@/components/AppMap";
import { useColors } from "@/hooks/useColors";

const NEARBY = [
  { id: "1", t: "تنظيف منزل", c: "خالد العتيبي", d: "1.2 كم", p: "85", time: "خلال ساعة" },
  { id: "2", t: "تنظيف عميق", c: "فاطمة السعد", d: "2.5 كم", p: "150", time: "بعد ساعتين" },
  { id: "3", t: "تنظيف مكتب", c: "شركة النور", d: "3.1 كم", p: "200", time: "غداً 9:00" },
];

export default function ProviderHome() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [online, setOnline] = useState(true);

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.push("/provider-notifications")}>
          <View style={[styles.icon, { backgroundColor: colors.card }]}>
            <Feather name="bell" size={18} color={colors.foreground} />
            <View style={[styles.notifDot, { backgroundColor: colors.danger }]} />
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.greet, { color: colors.mutedForeground }]}>صباح الخير 👋</Text>
          <Text style={[styles.name, { color: colors.foreground }]}>أحمد علي</Text>
        </View>
        <Image source={require("@/assets/images/cleaner-fatima.png")} style={styles.avatar} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={online ? [colors.primary, colors.primaryDark] : ["#94A3B8", "#64748B"]}
          style={styles.statusBox}
        >
          <View>
            <Text style={styles.statusL}>{online ? "متاح للعمل" : "غير متاح"}</Text>
            <Text style={styles.statusS}>
              {online ? "العملاء يمكنهم رؤيتك الآن" : "غيّر حالتك لاستقبال الطلبات"}
            </Text>
          </View>
          <Switch
            value={online}
            onValueChange={(v) => {
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setOnline(v);
            }}
            trackColor={{ true: "rgba(255,255,255,0.3)", false: "rgba(255,255,255,0.2)" }}
            thumbColor="#FFF"
          />
        </LinearGradient>

        <View style={styles.statsRow}>
          {[
            { v: "8", l: "طلبات اليوم", c: "#16C47F", i: "shopping-bag" },
            { v: "640", l: "أرباح اليوم", c: "#2F80ED", i: "dollar-sign" },
            { v: "4.9", l: "تقييمي", c: "#F59E0B", i: "star" },
          ].map((s) => (
            <View key={s.l} style={[styles.statC, { backgroundColor: colors.card }]}>
              <View style={[styles.statI, { backgroundColor: s.c + "22" }]}>
                <Feather name={s.i as any} size={16} color={s.c} />
              </View>
              <Text style={[styles.statV, { color: colors.foreground }]}>{s.v}</Text>
              <Text style={[styles.statL, { color: colors.mutedForeground }]}>{s.l}</Text>
            </View>
          ))}
        </View>

        <View style={styles.mapWrap}>
          <AppMap
            style={StyleSheet.absoluteFill}
            region={{ latitude: 24.7136, longitude: 46.6753, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
          />
          <View style={[styles.mapPin, { left: "30%", top: "30%" }]}>
            <View style={[styles.pinCircle, { backgroundColor: colors.primary }]}>
              <MaterialCommunityIcons name="map-marker" size={14} color="#FFF" />
            </View>
          </View>
          <View style={[styles.mapPin, { left: "60%", top: "55%" }]}>
            <View style={[styles.pinCircle, { backgroundColor: colors.accent }]}>
              <MaterialCommunityIcons name="map-marker" size={14} color="#FFF" />
            </View>
          </View>
          <View style={[styles.mapBadge, { backgroundColor: "#FFF" }]}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={[styles.mapBadgeT, { color: colors.foreground }]}>{NEARBY.length} طلبات قريبة</Text>
          </View>
        </View>

        <View style={styles.sectionH}>
          <TouchableOpacity onPress={() => router.push("/(provider)/bookings")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>عرض الكل</Text>
          </TouchableOpacity>
          <Text style={[styles.sectionT, { color: colors.foreground }]}>طلبات قريبة منك</Text>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {NEARBY.map((o) => (
            <View key={o.id} style={[styles.order, { backgroundColor: colors.card }]}>
              <View style={styles.oTop}>
                <View style={[styles.distBadge, { backgroundColor: colors.accentLight }]}>
                  <MaterialCommunityIcons name="map-marker-distance" size={10} color={colors.accent} />
                  <Text style={[styles.distT, { color: colors.accent }]}>{o.d}</Text>
                </View>
                <Text style={[styles.oTitle, { color: colors.foreground }]}>{o.t}</Text>
              </View>
              <View style={styles.oMid}>
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
                  <Feather name="user" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.oS, { color: colors.mutedForeground }]}>{o.c}</Text>
                </View>
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
                  <Feather name="clock" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.oS, { color: colors.mutedForeground }]}>{o.time}</Text>
                </View>
              </View>
              <View style={styles.oBot}>
                <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: colors.primary }]}>
                  <Text style={styles.acceptT}>قبول</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.rejectBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.rejectT, { color: colors.mutedForeground }]}>رفض</Text>
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={[styles.priceV, { color: colors.primary }]}>{o.p} ر.س</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 14, gap: 10 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  notifDot: { position: "absolute", top: 8, left: 9, width: 8, height: 8, borderRadius: 4 },
  greet: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  name: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  statusBox: { marginHorizontal: 16, padding: 16, borderRadius: 18, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  statusL: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 16 },
  statusS: { color: "rgba(255,255,255,0.85)", fontFamily: "Tajawal_500Medium", fontSize: 11, marginTop: 2 },
  statsRow: { flexDirection: "row-reverse", paddingHorizontal: 16, gap: 8, marginBottom: 14 },
  statC: { flex: 1, padding: 12, borderRadius: 14, alignItems: "center" },
  statI: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  statV: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  statL: { fontFamily: "Tajawal_500Medium", fontSize: 9, marginTop: 1, textAlign: "center" },
  mapWrap: { marginHorizontal: 16, height: 200, borderRadius: 18, overflow: "hidden", marginBottom: 14, position: "relative" },
  mapPin: { position: "absolute" },
  pinCircle: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFF" },
  mapBadge: { position: "absolute", top: 10, right: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100, flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  mapBadgeT: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  sectionH: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 10 },
  sectionT: { fontFamily: "Tajawal_700Bold", fontSize: 14 },
  seeAll: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  order: { padding: 12, borderRadius: 16, gap: 8 },
  oTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  oTitle: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  distBadge: { flexDirection: "row-reverse", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  distT: { fontFamily: "Tajawal_700Bold", fontSize: 10 },
  oMid: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  oS: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
  oBot: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  priceV: { fontFamily: "Tajawal_700Bold", fontSize: 15 },
  acceptBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 100 },
  acceptT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 11 },
  rejectBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, borderWidth: 1 },
  rejectT: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
});
