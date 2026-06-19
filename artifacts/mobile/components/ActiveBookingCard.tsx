import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, Animated, I18nManager,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";

const STATUS_AR: Record<string, { label: string; color: string; icon: string }> = {
  pending:     { label: "بانتظار التأكيد", color: "#F59E0B", icon: "clock-outline" },
  accepted:    { label: "تم القبول ✓",      color: "#3B82F6", icon: "check-circle-outline" },
  on_the_way:  { label: "المزود في الطريق 🚗", color: "#8B5CF6", icon: "car" },
  arrived:     { label: "الفني وصل 📍",     color: "#0EA5E9", icon: "map-marker-check" },
  started:     { label: "بدأت الخدمة 🧹",   color: "#16C47F", icon: "broom" },
  in_progress: { label: "جاري التنفيذ 🔧",  color: "#16C47F", icon: "cog" },
};

const ACTIVE_STATUSES = Object.keys(STATUS_AR);

type Props = {
  booking: {
    id: string;
    status: string;
    service_title?: string;
    provider_name?: string;
    provider_avatar?: string;
    total?: number;
    scheduled_at?: string | null;
  } | null;
};

export default function ActiveBookingCard({ booking }: Props) {
  const colors = useColors();
  const pulse = useRef(new Animated.Value(1)).current;
  const slideIn = useRef(new Animated.Value(-120)).current;

  const rowDir = I18nManager.isRTL ? ("row" as const) : ("row-reverse" as const);

  useEffect(() => {
    if (!booking) return;
    Animated.spring(slideIn, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }).start();
  }, [booking?.id]);

  useEffect(() => {
    if (!booking) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [booking?.status]);

  if (!booking || !ACTIVE_STATUSES.includes(booking.status)) return null;

  const info = STATUS_AR[booking.status];

  return (
    <Animated.View style={[s.wrap, { transform: [{ translateY: slideIn }] }]}>
      <TouchableOpacity
        activeOpacity={0.93}
        onPress={() => router.push({ pathname: "/tracking", params: { id: booking.id } } as any)}
      >
        <LinearGradient
          colors={["#0F1F14", "#16C47F22", "#0F1F14"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[s.card, { borderColor: info.color + "55" }]}
        >
          {/* Live pulse dot */}
          <View style={s.pulseWrap}>
            <Animated.View style={[s.pulseRing, { borderColor: info.color, transform: [{ scale: pulse }] }]} />
            <View style={[s.pulseDot, { backgroundColor: info.color }]} />
          </View>

          {/* Main content */}
          <View style={[s.content, { flexDirection: rowDir }]}>
            {/* Provider avatar */}
            <Image
              source={booking.provider_avatar
                ? { uri: booking.provider_avatar }
                : require("@/assets/images/default-avatar.png")}
              style={[s.avatar, { borderColor: info.color }]}
            />

            <View style={s.textBlock}>
              <View style={[s.statusRow, { flexDirection: rowDir }]}>
                <MaterialCommunityIcons name={info.icon as any} size={13} color={info.color} />
                <Text style={[s.statusLabel, { color: info.color }]}>{info.label}</Text>
              </View>
              <Text style={s.serviceTitle} numberOfLines={1}>{booking.service_title || "خدمة تنظيف"}</Text>
              <Text style={s.providerName} numberOfLines={1}>
                {booking.provider_name || "جاري تخصيص مزود"}
              </Text>
            </View>

            {/* Total + CTA */}
            <View style={s.rightBlock}>
              {booking.total ? (
                <Text style={s.total}>{booking.total} ر.س</Text>
              ) : null}
              <View style={[s.trackBtn, { backgroundColor: info.color }]}>
                <Feather name="navigation" size={12} color="#FFF" />
                <Text style={s.trackBtnT}>تتبع</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginBottom: 14 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    position: "relative",
    overflow: "hidden",
  },
  pulseWrap: {
    position: "absolute",
    top: 12, end: 14,
    width: 20, height: 20,
    alignItems: "center", justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 18, height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },
  pulseDot: { width: 8, height: 8, borderRadius: 4 },
  content: { alignItems: "center", gap: 12 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2,
  },
  textBlock: { flex: 1, gap: 3 },
  statusRow: { alignItems: "center", gap: 5 },
  statusLabel: {
    fontFamily: "Tajawal_700Bold", fontSize: 12,
  },
  serviceTitle: {
    fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#FFF",
  },
  providerName: {
    fontFamily: "Tajawal_400Regular", fontSize: 12, color: "rgba(255,255,255,0.65)",
  },
  rightBlock: { alignItems: "center", gap: 6 },
  total: {
    fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#16C47F",
  },
  trackBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  trackBtnT: {
    fontFamily: "Tajawal_700Bold", fontSize: 11, color: "#FFF",
  },
});
