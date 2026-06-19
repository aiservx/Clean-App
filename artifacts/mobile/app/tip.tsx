import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Animated, Alert, ScrollView, I18nManager, Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

const TIP_AMOUNTS = [5, 10, 15, 20];

export default function TipScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { session } = useAuth();
  const { bookingId, providerName, serviceName } = useLocalSearchParams<{
    bookingId: string;
    providerName: string;
    serviceName: string;
  }>();

  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const heartScale = useRef(new Animated.Value(1)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(heartScale, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(heartScale, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const tipAmount = custom ? parseFloat(custom) || 0 : selected ?? 0;

  const handleSubmit = async () => {
    if (tipAmount <= 0) {
      skip();
      return;
    }
    setSaving(true);
    try {
      if (bookingId) {
        await supabase.from("booking_status_log").insert({
          booking_id: bookingId,
          status: "tip_added",
          note: `إكرامية: ${tipAmount} ر.س`,
        });
      }
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.spring(successScale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 100 }),
      ]).start(() => setDone(true));
    } catch {
      Alert.alert("خطأ", "تعذر إرسال الإكرامية. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  const skip = () => router.replace("/(tabs)/home" as any);

  if (done) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Animated.View style={[styles.successContainer, { transform: [{ scale: successScale }] }]}>
          <LinearGradient colors={["#16C47F", "#059669"]} style={styles.successCircle}>
            <MaterialCommunityIcons name="heart" size={48} color="#FFF" />
          </LinearGradient>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>شكراً لك! 💚</Text>
          <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
            تم إرسال إكرامية {tipAmount} ر.س إلى {providerName || "المزود"}
          </Text>
          <Text style={[styles.successNote, { color: colors.mutedForeground }]}>
            تقديرك يصنع فرقاً كبيراً في يومه!
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={skip}>
            <LinearGradient colors={["#16C47F", "#059669"]} style={styles.doneBtnGradient}>
              <Text style={styles.doneBtnText}>العودة للرئيسية</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={skip} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>تخطي</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>إكرامية للمزود</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          {/* Provider Heart Icon */}
          <Animated.View style={[styles.heartWrap, { transform: [{ scale: heartScale }] }]}>
            <LinearGradient colors={["#FEE2E2", "#FECACA"]} style={styles.heartCircle}>
              <MaterialCommunityIcons name="heart" size={52} color="#EF4444" />
            </LinearGradient>
          </Animated.View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.foreground }]}>
            هل تريد تقدير {providerName || "المزود"}؟
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            أتمّ {providerName || "المزود"} خدمة "{serviceName || "التنظيف"}" بنجاح.{"\n"}
            الإكرامية تعني الكثير وتشجّع على الاستمرار.
          </Text>

          {/* Tip Amounts */}
          <View style={styles.amountsGrid}>
            {TIP_AMOUNTS.map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[
                  styles.amountChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  selected === amt && { borderColor: "#16C47F", backgroundColor: "#DCFCE7" },
                ]}
                onPress={() => { setSelected(amt); setCustom(""); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.amountText, { color: selected === amt ? "#059669" : colors.foreground }]}>
                  {amt} ر.س
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Amount */}
          <View style={[styles.customWrap, { backgroundColor: colors.card, borderColor: custom ? "#16C47F" : colors.border }]}>
            <Text style={[styles.customLabel, { color: colors.mutedForeground }]}>مبلغ مخصص (ر.س)</Text>
            <TextInput
              style={[styles.customInput, { color: colors.foreground }]}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              value={custom}
              onChangeText={(v) => { setCustom(v); setSelected(null); }}
              textAlign="right"
            />
          </View>

          {/* Info Note */}
          <View style={[styles.infoBox, { backgroundColor: "#F0FDF4" }]}>
            <MaterialCommunityIcons name="information-outline" size={16} color="#16C47F" />
            <Text style={styles.infoText}>
              100% من الإكرامية تصل مباشرة للمزود — لا توجد خصومات من المنصة
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, saving && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={saving}
            activeOpacity={0.85}
          >
            <LinearGradient colors={tipAmount > 0 ? ["#16C47F", "#059669"] : ["#94A3B8", "#64748B"]} style={styles.submitGradient}>
              <MaterialCommunityIcons name="heart" size={18} color="#FFF" />
              <Text style={styles.submitText}>
                {saving ? "جارٍ الإرسال..." : tipAmount > 0 ? `إرسال ${tipAmount} ر.س إكرامية` : "تخطي الإكرامية"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const rowDir = I18nManager.isRTL ? ("row" as const) : ("row-reverse" as const);

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: rowDir,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  skipBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  skipText: { fontFamily: "Tajawal_500Medium", fontSize: 14 },
  headerTitle: { fontFamily: "Tajawal_700Bold", fontSize: 18 },

  heartWrap: { alignItems: "center", marginTop: 24, marginBottom: 20 },
  heartCircle: { width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center" },

  title: { fontFamily: "Tajawal_700Bold", fontSize: 22, textAlign: "center", marginHorizontal: 24, marginBottom: 8 },
  subtitle: { fontFamily: "Tajawal_400Regular", fontSize: 14, textAlign: "center", marginHorizontal: 32, lineHeight: 22, marginBottom: 28 },

  amountsGrid: { flexDirection: rowDir, flexWrap: "wrap", paddingHorizontal: 16, gap: 10, marginBottom: 16, justifyContent: "center" },
  amountChip: {
    width: "44%",
    height: 64,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  amountText: { fontFamily: "Tajawal_700Bold", fontSize: 20 },

  customWrap: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 2,
    padding: 14,
    flexDirection: rowDir,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  customLabel: { fontFamily: "Tajawal_500Medium", fontSize: 13 },
  customInput: { fontFamily: "Tajawal_700Bold", fontSize: 22, minWidth: 60, textAlign: "right" },

  infoBox: {
    flexDirection: rowDir,
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 14,
    marginBottom: 24,
  },
  infoText: { fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#15803D", flex: 1, lineHeight: 18 },

  submitBtn: { marginHorizontal: 16 },
  submitGradient: {
    flexDirection: rowDir,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 18,
    paddingVertical: 16,
  },
  submitText: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#FFF" },

  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  successCircle: { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center", marginBottom: 28, shadowColor: "#16C47F", shadowOpacity: 0.4, shadowRadius: 20, elevation: 8 },
  successTitle: { fontFamily: "Tajawal_700Bold", fontSize: 28, textAlign: "center", marginBottom: 12 },
  successSub: { fontFamily: "Tajawal_500Medium", fontSize: 16, textAlign: "center", marginBottom: 8, lineHeight: 24 },
  successNote: { fontFamily: "Tajawal_400Regular", fontSize: 13, textAlign: "center", marginBottom: 40, lineHeight: 20 },
  doneBtn: { width: "100%" },
  doneBtnGradient: { borderRadius: 18, paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  doneBtnText: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#FFF" },
});
