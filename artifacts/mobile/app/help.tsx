import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import ScreenHeader from "@/components/ScreenHeader";
import { useColors } from "@/hooks/useColors";

const FAQ = [
  { q: "كيف أحجز خدمة تنظيف؟", a: "اضغط على زر احجز الآن، اختر الخدمة، الموعد، العامل، ثم أكد الطلب والدفع." },
  { q: "هل يمكنني إلغاء الحجز؟", a: "نعم، يمكنك إلغاء الحجز قبل بدء الخدمة بساعة على الأقل بدون رسوم." },
  { q: "كيف يتم الدفع؟", a: "يمكنك الدفع بالبطاقة، Apple Pay، STC Pay، مدى أو نقداً عند الاستلام." },
  { q: "هل العمال موثوقون؟", a: "جميع العمال موثقون ومدربون ولديهم تأمين شامل." },
  { q: "كيف أقيّم الخدمة؟", a: "بعد انتهاء الخدمة ستظهر شاشة التقييم. ساعدنا بمشاركة رأيك." },
];

const CONTACT = [
  { t: "اتصل بنا", s: "920000000", i: "phone", c: "#16C47F" },
  { t: "واتساب", s: "+966 50 000 0000", i: "message-circle", c: "#25D366" },
  { t: "البريد الإلكتروني", s: "support@nadhafa.sa", i: "mail", c: "#2F80ED" },
  { t: "الدردشة المباشرة", s: "متاحة 24/7", i: "message-square", c: "#8B5CF6" },
];

export default function Help() {
  const colors = useColors();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <ScreenHeader title="المساعدة والدعم" subtitle="نحن هنا لمساعدتك" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* AI Assistant Card */}
        <TouchableOpacity activeOpacity={0.92} onPress={() => router.push("/(tabs)/chat")} style={{ marginBottom: 18 }}>
          <LinearGradient
            colors={["#7C3AED", "#6D28D9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiCard}
          >
            <Image source={require("@/assets/images/ai-avatar-light.png")} style={styles.aiIconWrap} />
            <View style={{ flex: 1 }}>
              <Text style={styles.aiTitle}>المساعد الذكي</Text>
              <Text style={styles.aiSub}>اسأل أي سؤال عن الخدمات والحجوزات والأسعار واحصل على إجابة فورية</Text>
            </View>
            <View style={styles.aiArrow}>
              <Feather name="arrow-left" size={18} color="#FFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.label, { color: colors.foreground }]}>تواصل معنا</Text>
        <View style={styles.grid}>
          {CONTACT.map((co) => (
            <TouchableOpacity key={co.t} style={[styles.cBtn, { backgroundColor: colors.card }]}>
              <View style={[styles.cIcon, { backgroundColor: co.c + "22" }]}>
                <Feather name={co.i as any} size={20} color={co.c} />
              </View>
              <Text style={[styles.cT, { color: colors.foreground }]}>{co.t}</Text>
              <Text style={[styles.cS, { color: colors.mutedForeground }]}>{co.s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.foreground, marginTop: 18 }]}>الأسئلة الشائعة</Text>
        <View style={{ gap: 8 }}>
          {FAQ.map((f, i) => (
            <TouchableOpacity key={i} style={[styles.faq, { backgroundColor: colors.card }]} onPress={() => setOpen(open === i ? null : i)}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={[styles.faqQ, { color: colors.foreground, flex: 1 }]}>{f.q}</Text>
                <Feather name={open === i ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
              </View>
              {open === i && <Text style={[styles.faqA, { color: colors.mutedForeground }]}>{f.a}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  label: { fontFamily: "Tajawal_700Bold", fontSize: 14, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cBtn: { width: "48%", padding: 14, borderRadius: 16, alignItems: "center" },
  cIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  cT: { fontFamily: "Tajawal_700Bold", fontSize: 13, marginBottom: 2 },
  cS: { fontFamily: "Tajawal_500Medium", fontSize: 10 },
  faq: { padding: 14, borderRadius: 14 },
  faqQ: { fontFamily: "Tajawal_700Bold", fontSize: 13 },
  faqA: { fontFamily: "Tajawal_400Regular", fontSize: 12, lineHeight: 18, marginTop: 8 },
  aiCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 20,
    gap: 14,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  aiIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  aiTitle: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#FFF", marginBottom: 4 },
  aiSub: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 18 },
  aiArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
});
