import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useBooking } from "@/store/booking";

const PROVIDERS: any = {
  "1": { n: "أحمد علي", title: "عامل نظافة محترف", r: "4.9", reviews: 234, exp: "5", price: 85, img: require("@/assets/images/cleaner-fatima.png") },
  "2": { n: "سعد عبدالله", title: "خبير تنظيف عميق", r: "4.8", reviews: 187, exp: "3", price: 95, img: require("@/assets/images/cleaner-sara.png") },
  "3": { n: "محمد حسين", title: "متخصص تنظيف فلل", r: "4.7", reviews: 156, exp: "4", price: 110, img: require("@/assets/images/cleaner-noura.png") },
};

const SKILLS = ["تنظيف منازل", "تنظيف عميق", "تنظيف كنب", "تنظيف سجاد", "تنظيف مطابخ"];
const REVIEWS = [
  { n: "خالد م.", r: 5, t: "ممتاز جداً، عمل دقيق ونظيف" },
  { n: "سارة ع.", r: 5, t: "محترم وسريع، أنصح به بشدة" },
  { n: "فهد س.", r: 4, t: "خدمة جيدة وفي الوقت" },
];

export default function ProviderDetail() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = PROVIDERS[id || "1"] || PROVIDERS["1"];
  const [fav, setFav] = useState(false);
  const booking = useBooking();

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[colors.primary + "30", "transparent"]} style={[styles.heroBg, { paddingTop: insets.top + 10 }]}>
          <View style={styles.topRow}>
            <TouchableOpacity style={[styles.icon, { backgroundColor: "#FFF" }]} onPress={() => setFav(!fav)}>
              <MaterialCommunityIcons name={fav ? "heart" : "heart-outline"} size={18} color={fav ? colors.danger : colors.foreground} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.icon, { backgroundColor: "#FFF" }]}>
              <Feather name="share-2" size={16} color={colors.foreground} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={[styles.icon, { backgroundColor: "#FFF" }]} onPress={() => router.back()}>
              <Feather name="chevron-right" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroContent}>
            <Image source={p.img} style={styles.avatar} />
            <View style={styles.verifyBadge}>
              <MaterialCommunityIcons name="check-decagram" size={20} color="#FFF" />
            </View>
            <Text style={[styles.n, { color: colors.foreground }]}>{p.n}</Text>
            <Text style={[styles.title, { color: colors.mutedForeground }]}>{p.title}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[styles.statV, { color: colors.foreground }]}>{p.r}</Text>
                <Text style={[styles.statL, { color: colors.mutedForeground }]}>التقييم</Text>
              </View>
              <View style={[styles.statSep, { backgroundColor: colors.border }]} />
              <View style={styles.statBox}>
                <Text style={[styles.statV, { color: colors.foreground }]}>{p.reviews}</Text>
                <Text style={[styles.statL, { color: colors.mutedForeground }]}>التقييمات</Text>
              </View>
              <View style={[styles.statSep, { backgroundColor: colors.border }]} />
              <View style={styles.statBox}>
                <Text style={[styles.statV, { color: colors.foreground }]}>{p.exp}</Text>
                <Text style={[styles.statL, { color: colors.mutedForeground }]}>سنوات خبرة</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.row, { gap: 10, paddingHorizontal: 16, marginTop: 14 }]}>
          <TouchableOpacity style={[styles.actBtn, { backgroundColor: colors.card, flex: 1 }]}>
            <Feather name="message-circle" size={18} color={colors.foreground} />
            <Text style={[styles.actT, { color: colors.foreground }]}>دردشة</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actBtn, { backgroundColor: colors.card, flex: 1 }]}>
            <Feather name="phone" size={18} color={colors.foreground} />
            <Text style={[styles.actT, { color: colors.foreground }]}>اتصال</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actBtn, { backgroundColor: colors.card, flex: 1 }]}>
            <Feather name="share-2" size={18} color={colors.foreground} />
            <Text style={[styles.actT, { color: colors.foreground }]}>مشاركة الموقع</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sT, { color: colors.foreground }]}>نبذة عني</Text>
          <Text style={[styles.about, { color: colors.mutedForeground }]}>
            عامل نظافة محترف بخبرة {p.exp} سنوات في تقديم خدمات تنظيف عالية الجودة للمنازل والمكاتب. ملتزم بالمواعيد ودقيق في العمل.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sT, { color: colors.foreground }]}>الخدمات المقدمة</Text>
          <View style={styles.skills}>
            {SKILLS.map((s) => (
              <View key={s} style={[styles.skill, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.skillT, { color: colors.primary }]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={[styles.sT, { color: colors.foreground, marginBottom: 0 }]}>التقييمات</Text>
            <TouchableOpacity><Text style={{ fontFamily: "Tajawal_700Bold", color: colors.primary, fontSize: 12 }}>عرض الكل</Text></TouchableOpacity>
          </View>
          {REVIEWS.map((rv, i) => (
            <View key={i} style={[styles.review, { backgroundColor: colors.card }]}>
              <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={[styles.rN, { color: colors.foreground }]}>{rv.n}</Text>
                <View style={{ flexDirection: "row" }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Feather key={s} name="star" size={11} color={s <= rv.r ? colors.warning : colors.border} />
                  ))}
                </View>
              </View>
              <Text style={[styles.rT, { color: colors.mutedForeground }]}>{rv.t}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 14, backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[styles.bookBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            booking.setCleanerId(id || "1");
            router.push("/booking");
          }}
        >
          <Feather name="arrow-left" size={18} color="#FFF" />
          <Text style={styles.bookBtnT}>احجز الآن</Text>
        </TouchableOpacity>
        <View style={styles.priceWrap}>
          <Text style={[styles.priceL, { color: colors.mutedForeground }]}>ابتداءً من</Text>
          <Text style={[styles.priceV, { color: colors.foreground }]}>{p.price} <Text style={{ fontSize: 12, color: colors.mutedForeground }}>ر.س</Text></Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  heroBg: { paddingHorizontal: 16, paddingBottom: 18 },
  topRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 10 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  heroContent: { alignItems: "center", marginTop: 6 },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: "#FFFFFF" },
  verifyBadge: { position: "absolute", bottom: 70, right: "33%", backgroundColor: "#16C47F", borderRadius: 12, padding: 2 },
  n: { fontFamily: "Tajawal_700Bold", fontSize: 20, marginTop: 10 },
  title: { fontFamily: "Tajawal_500Medium", fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: "row-reverse", alignItems: "center", gap: 14, marginTop: 12, backgroundColor: "#FFF", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 18 },
  statBox: { alignItems: "center" },
  statV: { fontFamily: "Tajawal_700Bold", fontSize: 16 },
  statL: { fontFamily: "Tajawal_500Medium", fontSize: 10, marginTop: 1 },
  statSep: { width: 1, height: 22 },
  row: { flexDirection: "row-reverse" },
  actBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", padding: 11, borderRadius: 14, gap: 6 },
  actT: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sT: { fontFamily: "Tajawal_700Bold", fontSize: 14, textAlign: "right", marginBottom: 8 },
  about: { fontFamily: "Tajawal_400Regular", fontSize: 12, textAlign: "right", lineHeight: 18 },
  skills: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6 },
  skill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  skillT: { fontFamily: "Tajawal_700Bold", fontSize: 11 },
  review: { padding: 12, borderRadius: 14, marginBottom: 8 },
  rN: { fontFamily: "Tajawal_700Bold", fontSize: 12 },
  rT: { fontFamily: "Tajawal_400Regular", fontSize: 11, textAlign: "right", marginTop: 6, lineHeight: 16 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 14, flexDirection: "row-reverse", alignItems: "center", gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 10 },
  priceWrap: { alignItems: "flex-end" },
  priceL: { fontFamily: "Tajawal_500Medium", fontSize: 10 },
  priceV: { fontFamily: "Tajawal_700Bold", fontSize: 18 },
  bookBtn: { flex: 1, height: 50, borderRadius: 16, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8 },
  bookBtnT: { color: "#FFF", fontFamily: "Tajawal_700Bold", fontSize: 14 },
});
