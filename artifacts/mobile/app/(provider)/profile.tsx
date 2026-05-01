import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getCurrentResolved } from "@/lib/location";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function ProviderProfile() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { session, profile, signOut } = useAuth();
  const [online, setOnline] = useState(false);
  const [stats, setStats] = useState({ rating: 0, jobs: 0, years: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    const uid = session.user.id;
    const [{ data: prov }, { count: jobsCount }, { data: ratingRow }] = await Promise.all([
      supabase.from("providers").select("available, rating, total_jobs, experience_years").eq("id", uid).maybeSingle(),
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("provider_id", uid).eq("status", "completed"),
      supabase.from("reviews").select("rating").eq("provider_id", uid),
    ]);
    if (prov) setOnline(!!prov.available);
    const ratings = (ratingRow ?? []).map((r: any) => Number(r.rating || 0)).filter((x: number) => x > 0);
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : Number(prov?.rating || 0);
    setStats({
      rating: Number(avg.toFixed(1)),
      jobs: jobsCount ?? prov?.total_jobs ?? 0,
      years: prov?.experience_years ?? 0,
    });
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const toggleOnline = async (v: boolean) => {
    setOnline(v);
    if (!session?.user) return;
    const uid = session.user.id;
    if (v) {
      const loc = await getCurrentResolved();
      const payload = {
        id: uid,
        available: true,
        current_lat: loc?.lat ?? null,
        current_lng: loc?.lng ?? null,
      };
      const { error } = await supabase.from("providers").upsert(payload, { onConflict: "id" });
      if (error) {
        // fallback to update
        await supabase.from("providers").update({ available: true, current_lat: loc?.lat ?? null, current_lng: loc?.lng ?? null }).eq("id", uid);
      }
    } else {
      await supabase.from("providers").update({ available: false, current_lat: null, current_lng: null }).eq("id", uid);
    }
  };

  const onSignOut = () => {
    Alert.alert("تسجيل الخروج", "هل تريد تسجيل الخروج من حسابك؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "خروج",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  const firstName = profile?.full_name || "—";

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.push("/settings")}><Feather name="settings" size={20} color={colors.foreground} /></TouchableOpacity>
          <Text style={[styles.hT, { color: colors.foreground }]}>الملف الشخصي</Text>
          <TouchableOpacity onPress={() => router.push("/provider-notifications")}>
            <Feather name="bell" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.profileCard}>
          <Image source={profile?.avatar_url ? { uri: profile.avatar_url } : require("@/assets/images/default-avatar.png")} style={styles.avatar} />
          <Text style={styles.name}>{firstName}</Text>
          {profile?.phone && <Text style={styles.phone}>{profile.phone}</Text>}
          <View style={styles.verifyRow}>
            <MaterialCommunityIcons name="check-decagram" size={14} color="#FFF" />
            <Text style={styles.verifyT}>عامل موثّق</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statB}>
              <Text style={styles.statV}>{stats.rating.toFixed(1)}</Text>
              <Text style={styles.statL}>التقييم</Text>
            </View>
            <View style={styles.sep} />
            <View style={styles.statB}>
              <Text style={styles.statV}>{stats.jobs}</Text>
              <Text style={styles.statL}>الطلبات</Text>
            </View>
            <View style={styles.sep} />
            <View style={styles.statB}>
              <Text style={styles.statV}>{stats.years}</Text>
              <Text style={styles.statL}>سنوات خبرة</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.statusBox}>
          <View style={[styles.statusItem, { backgroundColor: colors.card }]}>
            <Switch value={online} onValueChange={toggleOnline} trackColor={{ true: colors.primary, false: "#E5E7EB" }} thumbColor="#FFF" />
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <Text style={[styles.statusT, { color: colors.foreground }]}>الحالة الحالية</Text>
              <Text style={[styles.statusS, { color: online ? colors.success : colors.mutedForeground }]}>{online ? "متاح للعمل" : "غير متاح"}</Text>
            </View>
            <View style={[styles.statusIcon, { backgroundColor: online ? colors.successLight : colors.muted }]}>
              <View style={[styles.dot, { backgroundColor: online ? colors.success : colors.mutedForeground }]} />
            </View>
          </View>
        </View>

        <View style={styles.menu}>
          {[
            { i: "edit-3", l: "تعديل البروفايل المهني", p: "/provider-edit", c: "#16C47F", bg: "#D7F5E8" },
            { i: "clock", l: "مواعيد العمل", p: "/provider-hours", c: "#2F80ED", bg: "#DBEAFE" },
            { i: "credit-card", l: "المحفظة والأرباح", p: "/(provider)/wallet", c: "#F59E0B", bg: "#FEF3C7" },
            { i: "list", l: "كل طلباتي", p: "/(provider)/bookings", c: "#8B5CF6", bg: "#EDE9FE" },
            { i: "users", l: "دعوة عمال آخرين", p: "/provider-referrals", c: "#EC4899", bg: "#FCE7F3" },
            { i: "help-circle", l: "المساعدة والدعم", p: "/help", c: "#FB923C", bg: "#FFEDD5" },
            { i: "settings", l: "الإعدادات", p: "/settings", c: "#6B7280", bg: "#F3F4F6" },
          ].map((m) => (
            <TouchableOpacity key={m.l} style={[styles.menuItem, { backgroundColor: colors.card }]} onPress={() => router.push(m.p as any)}>
              <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
              <Text style={[styles.menuT, { color: colors.foreground }]}>{m.l}</Text>
              <View style={[styles.menuI, { backgroundColor: m.bg }]}>
                <Feather name={m.i as any} size={16} color={m.c} />
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.signOutBtn} onPress={onSignOut} activeOpacity={0.85}>
            <Feather name="chevron-left" size={16} color="#FCA5A5" />
            <Text style={styles.signOutText}>تسجيل الخروج</Text>
            <View style={styles.signOutIcon}>
              <Feather name="log-out" size={16} color="#EF4444" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 14 },
  hT: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  profileCard: { marginHorizontal: 16, padding: 18, borderRadius: 22, alignItems: "center", marginBottom: 14 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 4, borderColor: "#FFF" },
  name: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 18, marginTop: 10 },
  phone: { color: "rgba(255,255,255,0.9)", fontFamily: "Tajawal_500Medium", fontSize: 12, marginTop: 2 },
  verifyRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100 },
  verifyT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 11 },
  statsRow: { flexDirection: "row", marginTop: 14, backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 16, gap: 14, alignItems: "center" },
  statB: { alignItems: "center" },
  statV: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 16 },
  statL: { color: "rgba(255,255,255,0.85)", fontFamily: "Tajawal_500Medium", fontSize: 10, marginTop: 1 },
  sep: { width: 1, height: 22, backgroundColor: "rgba(255,255,255,0.3)" },
  statusBox: { paddingHorizontal: 16, marginBottom: 14 },
  statusItem: { padding: 14, borderRadius: 16, flexDirection: "row-reverse", alignItems: "center" },
  statusT: { fontFamily: "Tajawal_700Bold", fontSize: 13, textAlign: "right" },
  statusS: { fontFamily: "Tajawal_500Medium", fontSize: 11, textAlign: "right", marginTop: 2 },
  statusIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  menu: { paddingHorizontal: 16, gap: 8 },
  menuItem: { flexDirection: "row-reverse", alignItems: "center", padding: 12, borderRadius: 14 },
  menuT: { flex: 1, fontFamily: "Tajawal_700Bold", fontSize: 13, textAlign: "right", marginHorizontal: 10 },
  menuI: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  signOutBtn: { flexDirection: "row-reverse", alignItems: "center", padding: 14, borderRadius: 16, marginTop: 12, backgroundColor: "#FFF5F5", borderWidth: 1, borderColor: "#FECACA", shadowColor: "#EF4444", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 1 },
  signOutText: { flex: 1, fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#DC2626", textAlign: "right", marginHorizontal: 10 },
  signOutIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" },
});
