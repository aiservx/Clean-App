import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Share, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { REFERRAL_PROGRAM } from "@/lib/promotions";

type ReferredFriend = {
  id: string;
  full_name: string;
  status: "active" | "pending";
  created_at: string;
};

function generateCode(name: string, uid: string): string {
  const nameSlug = (name ?? "USER").replace(/\s+/g, "").substring(0, 6).toUpperCase();
  const suffix = uid.replace(/-/g, "").substring(0, 4).toUpperCase();
  return `${nameSlug}${suffix}`;
}

export default function Referrals() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { session } = useAuth();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("NAZAFA0000");
  const [friends, setFriends] = useState<ReferredFriend[]>([]);
  const [stats, setStats] = useState({ invited: 0, active: 0, earned: 0 });

  useEffect(() => {
    if (!session?.user) { setLoading(false); return; }
    (async () => {
      try {
        const uid = session.user.id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, referral_code")
          .eq("id", uid)
          .maybeSingle();

        let myCode = profile?.referral_code;
        if (!myCode) {
          myCode = generateCode(profile?.full_name ?? "USER", uid);
          await supabase.from("profiles").update({ referral_code: myCode }).eq("id", uid);
        }
        setCode(myCode);

        const { data: refs } = await supabase
          .from("profiles")
          .select("id, full_name, created_at")
          .eq("referred_by", myCode)
          .order("created_at", { ascending: false })
          .limit(20);

        const refList = refs ?? [];

        const activeIds = refList.map((r: any) => r.id);
        let activeSet = new Set<string>();
        if (activeIds.length > 0) {
          const { data: bookingCheck } = await supabase
            .from("bookings")
            .select("user_id")
            .in("user_id", activeIds)
            .eq("status", "completed")
            .limit(100);
          (bookingCheck ?? []).forEach((b: any) => activeSet.add(b.user_id));
        }

        const mapped: ReferredFriend[] = refList.map((r: any) => ({
          id: r.id,
          full_name: r.full_name ?? "مستخدم",
          status: activeSet.has(r.id) ? "active" : "pending",
          created_at: r.created_at,
        }));

        setFriends(mapped);
        const active = mapped.filter((f) => f.status === "active").length;
        setStats({ invited: mapped.length, active, earned: active * REFERRAL_PROGRAM.rewardPerFriend });
      } catch (e) {
        console.warn("[Referrals] error", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  const onShare = () => {
    Share.share({
      message: `انضم لتطبيق نظافة باستخدام كودي ${code} واحصل على خصم ${REFERRAL_PROGRAM.friendDiscount} ر.س على أول طلب! 🏠✨`,
    });
  };

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="دعوة الأصدقاء" subtitle={`اكسب ${REFERRAL_PROGRAM.rewardPerFriend} ر.س لكل صديق`} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80 }} showsVerticalScrollIndicator={false}>

        {/* Banner hero */}
        <View style={styles.hero}>
          <Image source={require("@/assets/images/invite_friends_banner.png")} style={styles.heroImg} resizeMode="cover" />
          <LinearGradient
            colors={["rgba(0,0,0,0.32)", "rgba(0,0,0,0.05)", "rgba(0,0,0,0)"]}
            start={{ x: 0, y: 0.5 }} end={{ x: 0.7, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <MaterialCommunityIcons name="gift" size={12} color="#FFFFFF" />
              <Text style={styles.heroBadgeT}>دعوة صديق</Text>
            </View>
            <Text style={styles.heroT}>اكسب {REFERRAL_PROGRAM.rewardPerFriend} ر.س لكل صديق</Text>
            <Text style={styles.heroS}>شارك كودك وكسب مكافأة فورية</Text>
            <TouchableOpacity style={styles.heroCta} activeOpacity={0.85} onPress={onShare} disabled={Platform.OS === "web"}>
              <Feather name="share-2" size={13} color="#0F172A" />
              <Text style={styles.heroCtaT}>شارك الآن</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Code Box */}
        <View style={[styles.codeBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>كود الدعوة الخاص بك</Text>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 8 }} />
          ) : (
            <View style={styles.codeRow}>
              <Text style={[styles.code, { color: colors.foreground }]}>{code}</Text>
              <TouchableOpacity
                style={[styles.copyBtn, { backgroundColor: copied ? "#DCFCE7" : colors.primaryLight }]}
                onPress={async () => {
                  await Clipboard.setStringAsync(code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                <Feather name={copied ? "check" : "copy"} size={16} color={copied ? "#16C47F" : colors.primary} />
                <Text style={[styles.copyT, { color: copied ? "#16C47F" : colors.primary }]}>{copied ? "تم النسخ!" : "نسخ"}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            { v: String(stats.invited), l: "أصدقاء دُعوا", c: "#16C47F" },
            { v: String(stats.active), l: "نشطين", c: "#2F80ED" },
            { v: String(stats.earned), l: "ر.س مكتسبة", c: "#F59E0B" },
          ].map((s) => (
            <View key={s.l} style={[styles.statC, { backgroundColor: colors.card }]}>
              <Text style={[styles.statV, { color: s.c }]}>{s.v}</Text>
              <Text style={[styles.statL, { color: colors.mutedForeground }]}>{s.l}</Text>
            </View>
          ))}
        </View>

        {/* How it works */}
        <Text style={[styles.label, { color: colors.foreground }]}>كيف تعمل؟</Text>
        <View style={[styles.steps, { backgroundColor: colors.card }]}>
          {[
            { i: "share-2", t: "شارك كود الدعوة", c: "#16C47F" },
            { i: "user-plus", t: "صديقك يسجل بالكود", c: "#2F80ED" },
            { i: "shopping-bag", t: "يطلب أول خدمة", c: "#F59E0B" },
            { i: "gift", t: `تستلم ${REFERRAL_PROGRAM.rewardPerFriend} ر.س فوراً`, c: "#EC4899" },
          ].map((s, i) => (
            <View key={s.t} style={styles.step}>
              <View style={[styles.stepIcon, { backgroundColor: s.c + "22" }]}>
                <Feather name={s.i as any} size={18} color={s.c} />
              </View>
              <Text style={[styles.stepT, { color: colors.foreground }]}>{s.t}</Text>
              <Text style={[styles.stepN, { color: colors.mutedForeground }]}>{i + 1}</Text>
            </View>
          ))}
        </View>

        {/* Referred Friends */}
        <Text style={[styles.label, { color: colors.foreground, marginTop: 16 }]}>
          أصدقاء دُعوا {friends.length > 0 ? `(${friends.length})` : ""}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : friends.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card }]}>
            <Feather name="users" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyT, { color: colors.mutedForeground }]}>
              لم تدعُ أحداً بعد — شارك كودك الآن!
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {friends.map((f) => (
              <View key={f.id} style={[styles.friend, { backgroundColor: colors.card }]}>
                <View style={[styles.fAv, { backgroundColor: colors.primaryLight }]}>
                  <Feather name="user" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={[styles.fN, { color: colors.foreground }]}>{f.full_name}</Text>
                  <Text style={[styles.fS, { color: colors.mutedForeground }]}>
                    {f.status === "active" ? "نشط ✅" : "بانتظار أول طلب ⏳"}
                  </Text>
                </View>
                <Text style={[styles.fReward, {
                  color: f.status === "active" ? colors.success : colors.mutedForeground,
                  fontFamily: "Tajawal_700Bold",
                }]}>
                  {f.status === "active" ? `${REFERRAL_PROGRAM.rewardPerFriend} ر.س` : "—"}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={[styles.shareBtn, { backgroundColor: "#F59E0B" }]} onPress={onShare} disabled={Platform.OS === "web"}>
          <Feather name="share-2" size={18} color="#FFF" />
          <Text style={styles.shareT}>شارك الكود الآن</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  hero: {
    borderRadius: 22, overflow: "hidden", marginBottom: 14, height: 180, position: "relative",
  },
  heroImg: { width: "100%", height: "100%" },
  heroContent: {
    position: "absolute", top: 0, bottom: 0, right: 0, left: "20%",
    justifyContent: "center", paddingLeft: 16,
  },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 6,
  },
  heroBadgeT: { fontFamily: "Tajawal_600SemiBold", fontSize: 11, color: "#FFF" },
  heroT: { fontFamily: "Tajawal_700Bold", fontSize: 18, color: "#FFF", marginBottom: 2 },
  heroS: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "rgba(255,255,255,0.85)", marginBottom: 12 },
  heroCta: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF",
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, alignSelf: "flex-start",
  },
  heroCtaT: { fontFamily: "Tajawal_700Bold", fontSize: 13, color: "#0F172A" },
  codeBox: { borderRadius: 16, padding: 16, marginBottom: 14 },
  codeLabel: { fontFamily: "Tajawal_400Regular", fontSize: 12, marginBottom: 10, textAlign: "center" },
  codeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  code: { fontFamily: "Tajawal_700Bold", fontSize: 26, letterSpacing: 3 },
  copyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  copyT: { fontFamily: "Tajawal_600SemiBold", fontSize: 13 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  statC: { flex: 1, borderRadius: 14, padding: 12, alignItems: "center" },
  statV: { fontFamily: "Tajawal_700Bold", fontSize: 22 },
  statL: { fontFamily: "Tajawal_400Regular", fontSize: 10, marginTop: 2, textAlign: "center" },
  label: { fontFamily: "Tajawal_700Bold", fontSize: 15, marginBottom: 10 },
  steps: { borderRadius: 16, overflow: "hidden", marginBottom: 8 },
  step: {
    flexDirection: "row", alignItems: "center", padding: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)",
  },
  stepIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginLeft: 12 },
  stepT: { flex: 1, fontFamily: "Tajawal_500Medium", fontSize: 14 },
  stepN: { fontFamily: "Tajawal_700Bold", fontSize: 22, opacity: 0.2 },
  friend: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 16 },
  fAv: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  fN: { fontFamily: "Tajawal_600SemiBold", fontSize: 14 },
  fS: { fontFamily: "Tajawal_400Regular", fontSize: 12, marginTop: 2 },
  fReward: { fontSize: 13 },
  emptyBox: {
    borderRadius: 16, padding: 28, alignItems: "center", gap: 10,
  },
  emptyT: { fontFamily: "Tajawal_400Regular", fontSize: 13, textAlign: "center" },
  bottom: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 6,
  },
  shareBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 15, borderRadius: 16,
  },
  shareT: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#FFF" },
});
