import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  ScrollView, I18nManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

interface Confetti {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  opacity: Animated.Value;
  color: string;
  size: number;
}

const COLORS = ["#16C47F", "#F59E0B", "#3B82F6", "#EC4899", "#8B5CF6", "#EF4444", "#06B6D4"];

function useConfetti() {
  const confetti = useRef<Confetti[]>(
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: new Animated.Value(Math.random() * 350 - 175),
      y: new Animated.Value(-60),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 8,
    }))
  ).current;

  const launch = () => {
    confetti.forEach((c, i) => {
      const delay = i * 40;
      Animated.parallel([
        Animated.timing(c.y, { toValue: 600 + Math.random() * 200, duration: 1800 + Math.random() * 600, delay, useNativeDriver: true }),
        Animated.timing(c.rotate, { toValue: 720 + Math.random() * 360, duration: 1800, delay, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(delay + 1200),
          Animated.timing(c.opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ]).start();
    });
  };

  return { confetti, launch };
}

export default function BookingSuccessScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    bookingId: string;
    serviceName: string;
    providerName: string;
    scheduledAt: string;
    total: string;
  }>();

  const checkScale = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(60)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const { confetti, launch } = useConfetti();

  useEffect(() => {
    Animated.sequence([
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 120, delay: 100 }),
    ]).start();

    Animated.parallel([
      Animated.timing(cardSlide, { toValue: 0, duration: 500, delay: 400, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 500, delay: 400, useNativeDriver: true }),
    ]).start();

    setTimeout(() => launch(), 400);
  }, []);

  const eta = params.scheduledAt
    ? new Date(params.scheduledAt).toLocaleString("ar-SA", { hour: "2-digit", minute: "2-digit", weekday: "short" })
    : "قريباً";

  const total = params.total ? parseFloat(params.total) : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Confetti */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {confetti.map((c) => (
          <Animated.View
            key={c.id}
            style={[
              styles.confettiPiece,
              {
                width: c.size,
                height: c.size,
                backgroundColor: c.color,
                borderRadius: c.size / 4,
                left: "50%",
                opacity: c.opacity,
                transform: [
                  { translateX: c.x },
                  { translateY: c.y },
                  { rotate: c.rotate.interpolate({ inputRange: [0, 720], outputRange: ["0deg", "720deg"] }) },
                ],
              },
            ]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Check Circle */}
        <Animated.View style={[styles.checkWrap, { transform: [{ scale: checkScale }] }]}>
          <LinearGradient colors={["#16C47F", "#059669"]} style={styles.checkCircle}>
            <Feather name="check" size={52} color="#FFF" strokeWidth={3} />
          </LinearGradient>
          {/* Glow rings */}
          <View style={[styles.ring, { width: 140, height: 140, opacity: 0.15 }]} />
          <View style={[styles.ring, { width: 170, height: 170, opacity: 0.08 }]} />
        </Animated.View>

        <Text style={styles.title}>تم تأكيد حجزك! 🎉</Text>
        <Text style={styles.subtitle}>
          مزود الخدمة في طريقه إليك. ستصلك إشعارات بكل تحديث.
        </Text>

        {/* Booking Card */}
        <Animated.View style={[styles.card, { transform: [{ translateY: cardSlide }], opacity: cardOpacity }]}>
          {/* Service */}
          <View style={styles.cardRow}>
            <View style={[styles.cardIcon, { backgroundColor: "#DCFCE7" }]}>
              <MaterialCommunityIcons name="spray-bottle" size={22} color="#16C47F" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>الخدمة</Text>
              <Text style={styles.cardValue}>{params.serviceName || "خدمة تنظيف"}</Text>
            </View>
          </View>
          <View style={styles.separator} />

          {/* Provider */}
          <View style={styles.cardRow}>
            <View style={[styles.cardIcon, { backgroundColor: "#DBEAFE" }]}>
              <MaterialCommunityIcons name="account-check" size={22} color="#3B82F6" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>المزود</Text>
              <Text style={styles.cardValue}>{params.providerName || "جارٍ التعيين..."}</Text>
            </View>
          </View>
          <View style={styles.separator} />

          {/* ETA */}
          <View style={styles.cardRow}>
            <View style={[styles.cardIcon, { backgroundColor: "#FEF3C7" }]}>
              <MaterialCommunityIcons name="clock-outline" size={22} color="#F59E0B" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>موعد الوصول</Text>
              <Text style={styles.cardValue}>{eta}</Text>
            </View>
          </View>

          {total != null && (
            <>
              <View style={styles.separator} />
              <View style={styles.cardRow}>
                <View style={[styles.cardIcon, { backgroundColor: "#EDE9FE" }]}>
                  <MaterialCommunityIcons name="cash" size={22} color="#7C3AED" />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardLabel}>إجمالي الطلب</Text>
                  <Text style={[styles.cardValue, { color: "#7C3AED" }]}>{total.toFixed(0)} ر.س</Text>
                </View>
              </View>
            </>
          )}
        </Animated.View>

        {/* Booking ID */}
        {params.bookingId && (
          <View style={styles.idRow}>
            <MaterialCommunityIcons name="barcode" size={14} color="#94A3B8" />
            <Text style={styles.idText}>رقم الطلب: {params.bookingId.slice(0, 8).toUpperCase()}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.trackBtn}
            activeOpacity={0.85}
            onPress={() => router.replace(`/tracking?id=${params.bookingId}` as any)}
          >
            <LinearGradient colors={["#16C47F", "#059669"]} style={styles.trackBtnGradient}>
              <MaterialCommunityIcons name="map-marker-radius" size={20} color="#FFF" />
              <Text style={styles.trackBtnText}>تتبع الطلب مباشرة</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => router.replace("/(tabs)/home" as any)}
          >
            <Text style={styles.homeBtnText}>العودة للرئيسية</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const rowDir = I18nManager.isRTL ? ("row" as const) : ("row-reverse" as const);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 48 },

  confettiPiece: { position: "absolute", top: 0 },

  checkWrap: { alignItems: "center", justifyContent: "center", marginTop: 48, marginBottom: 28 },
  checkCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#16C47F",
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
  },
  ring: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#16C47F",
  },

  title: { fontFamily: "Tajawal_700Bold", fontSize: 26, color: "#0F172A", textAlign: "center", marginBottom: 10 },
  subtitle: { fontFamily: "Tajawal_400Regular", fontSize: 14, color: "#64748B", textAlign: "center", lineHeight: 22, marginBottom: 28 },

  card: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardRow: { flexDirection: rowDir, alignItems: "center", gap: 14, paddingVertical: 10 },
  cardIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1, alignItems: I18nManager.isRTL ? "flex-start" : "flex-end" },
  cardLabel: { fontFamily: "Tajawal_400Regular", fontSize: 11, color: "#94A3B8", marginBottom: 2 },
  cardValue: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#0F172A" },
  separator: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 2 },

  idRow: { flexDirection: rowDir, alignItems: "center", gap: 6, marginBottom: 28 },
  idText: { fontFamily: "Tajawal_500Medium", fontSize: 12, color: "#94A3B8" },

  actions: { width: "100%", gap: 12 },
  trackBtn: { width: "100%" },
  trackBtnGradient: {
    flexDirection: rowDir,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 20,
    paddingVertical: 16,
  },
  trackBtnText: { fontFamily: "Tajawal_700Bold", fontSize: 16, color: "#FFF" },
  homeBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  homeBtnText: { fontFamily: "Tajawal_600SemiBold", fontSize: 15, color: "#475569" },
});
