import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Animated, PanResponder, Dimensions, I18nManager,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

const { height: SCREEN_H } = Dimensions.get("window");
const SHEET_H = 320;

interface Provider {
  id: string;
  rating?: number | null;
  experience_years?: number | null;
  hourly_rate?: number | null;
  available?: boolean | null;
  current_lat?: number | null;
  current_lng?: number | null;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
}

interface Props {
  provider: Provider | null;
  distKm?: number | null;
  onClose: () => void;
  onBook: (providerId: string) => void;
}

function StarRow({ rating }: { rating: number }) {
  const stars = Math.round(rating);
  return (
    <View style={{ flexDirection: I18nManager.isRTL ? "row" : "row-reverse", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <MaterialCommunityIcons
          key={i}
          name={i <= stars ? "star" : "star-outline"}
          size={14}
          color={i <= stars ? "#F59E0B" : "#D1D5DB"}
        />
      ))}
    </View>
  );
}

export default function ProviderQuickView({ provider, distKm, onClose, onBook }: Props) {
  const translateY = useRef(new Animated.Value(SHEET_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (provider) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 80 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SHEET_H, duration: 250, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [provider]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 60 || g.vy > 0.5) {
          onClose();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
        }
      },
    })
  ).current;

  if (!provider) return null;

  const name = provider.profiles?.full_name || "مزود خدمة";
  const avatar = provider.profiles?.avatar_url;
  const rating = provider.rating ?? 4.5;
  const exp = provider.experience_years ?? 1;
  const rate = provider.hourly_rate ?? 80;

  const getBadge = () => {
    if (rating >= 4.8) return { label: "الأعلى تقييماً", color: "#F59E0B", bg: "#FFFBEB" };
    if (exp >= 5) return { label: "خبير", color: "#8B5CF6", bg: "#EDE9FE" };
    if (exp <= 1) return { label: "جديد", color: "#3B82F6", bg: "#DBEAFE" };
    return { label: "موثّق ✓", color: "#16C47F", bg: "#DCFCE7" };
  };
  const badge = getBadge();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]} {...panResponder.panHandlers}>
        {/* Drag Handle */}
        <View style={styles.dragHandle} />

        {/* Provider Info */}
        <View style={styles.providerRow}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <LinearGradient colors={["#16C47F", "#059669"]} style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{name.charAt(0)}</Text>
            </LinearGradient>
          )}

          <View style={styles.providerInfo}>
            <View style={[styles.badgeChip, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
            <Text style={styles.providerName} numberOfLines={1}>{name}</Text>
            <StarRow rating={rating} />
            <Text style={styles.ratingText}>{rating.toFixed(1)} · {exp} سنة خبرة</Text>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Feather name="x" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="clock-outline" size={22} color="#16C47F" />
            <Text style={styles.statVal}>~{distKm ? Math.ceil(distKm * 3) : 15} د</Text>
            <Text style={styles.statLabel}>وقت الوصول</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="map-marker-distance" size={22} color="#3B82F6" />
            <Text style={styles.statVal}>{distKm ? distKm.toFixed(1) : "?"} كم</Text>
            <Text style={styles.statLabel}>المسافة</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="cash" size={22} color="#F59E0B" />
            <Text style={styles.statVal}>{rate} ر.س</Text>
            <Text style={styles.statLabel}>/ ساعة</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => { onClose(); router.push(`/provider/${provider.id}` as any); }}
          >
            <Feather name="user" size={18} color="#64748B" />
            <Text style={styles.profileBtnText}>الملف الشخصي</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => onBook(provider.id)}
            activeOpacity={0.85}
          >
            <LinearGradient colors={["#16C47F", "#059669"]} style={styles.bookBtnGradient}>
              <Feather name="calendar" size={18} color="#FFF" />
              <Text style={styles.bookBtnText}>احجز الآن</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const rowDir = I18nManager.isRTL ? ("row" as const) : ("row-reverse" as const);

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_H,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  providerRow: {
    flexDirection: rowDir,
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  avatar: { width: 66, height: 66, borderRadius: 22 },
  avatarFallback: { width: 66, height: 66, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontFamily: "Tajawal_700Bold", fontSize: 28, color: "#FFF" },
  providerInfo: { flex: 1, gap: 4, alignItems: I18nManager.isRTL ? "flex-start" : "flex-end" },
  badgeChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, alignSelf: I18nManager.isRTL ? "flex-start" : "flex-end" },
  badgeText: { fontFamily: "Tajawal_600SemiBold", fontSize: 10 },
  providerName: { fontFamily: "Tajawal_700Bold", fontSize: 17, color: "#0F172A" },
  ratingText: { fontFamily: "Tajawal_500Medium", fontSize: 11, color: "#64748B" },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },

  statsRow: {
    flexDirection: rowDir,
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, backgroundColor: "#E2E8F0", marginVertical: 4 },
  statVal: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#0F172A" },
  statLabel: { fontFamily: "Tajawal_400Regular", fontSize: 10, color: "#94A3B8" },

  actions: { flexDirection: rowDir, gap: 10 },
  profileBtn: {
    flex: 1,
    flexDirection: rowDir,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingVertical: 13,
    backgroundColor: "#F8FAFC",
  },
  profileBtnText: { fontFamily: "Tajawal_600SemiBold", fontSize: 14, color: "#475569" },
  bookBtn: { flex: 2 },
  bookBtnGradient: {
    flexDirection: rowDir,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 13,
  },
  bookBtnText: { fontFamily: "Tajawal_700Bold", fontSize: 15, color: "#FFF" },
});
