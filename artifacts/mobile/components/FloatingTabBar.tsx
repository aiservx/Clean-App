import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";

type ActiveKey =
  | "home"
  | "profile"
  | "bookings"
  | "chat"
  | "services"
  | "offers"
  | null;

type Props = {
  active?: ActiveKey;
  variant?: "user" | "provider";
};

export default function FloatingTabBar({ active = null, variant = "user" }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const goto = (path: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    router.push(path as any);
  };

  const userItems: { key: any; label: string; icon: any; path: string }[] = [
    { key: "profile", label: "الملف الشخصي", icon: "user", path: "/(tabs)/profile" },
    { key: "bookings", label: "حجوزاتي", icon: "calendar", path: "/(tabs)/bookings" },
    { key: "chat", label: "الرسائل", icon: "message-circle", path: "/(tabs)/chat" },
    { key: "home", label: "الرئيسية", icon: "home", path: "/(tabs)" },
  ];

  const providerItems: { key: any; label: string; icon: any; path: string }[] = [
    { key: "profile", label: "الملف الشخصي", icon: "user", path: "/(provider)/profile" },
    { key: "wallet", label: "المحفظة", icon: "credit-card", path: "/(provider)/wallet" },
    { key: "chat", label: "الرسائل", icon: "message-circle", path: "/(provider)/chat" },
    { key: "home", label: "طلباتي", icon: "home", path: "/(provider)" },
  ];

  const items = variant === "provider" ? providerItems : userItems;
  const ctaPath = variant === "provider" ? "/(provider)/bookings" : "/services";
  const ctaLabel = variant === "provider" ? "الطلبات" : "احجز الآن";

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom + 8, backgroundColor: colors.card },
      ]}
    >
      {items.slice(0, 2).map((it) => (
        <TouchableOpacity key={it.key} style={styles.tabItem} onPress={() => goto(it.path)} activeOpacity={0.7}>
          <Feather name={it.icon} size={20} color={active === it.key ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.tabLabel, { color: active === it.key ? colors.primary : colors.mutedForeground }]}>
            {it.label}
          </Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={styles.floatingBtnWrap}
        activeOpacity={0.9}
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push(ctaPath as any);
        }}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.floatingBtn}
        >
          <MaterialCommunityIcons
            name={variant === "provider" ? "briefcase-check" : "broom"}
            size={26}
            color="#FFFFFF"
          />
        </LinearGradient>
        <Text
          style={[
            styles.floatingLabel,
            { color: active === "services" || active === "bookings" ? colors.primary : colors.mutedForeground },
          ]}
        >
          {ctaLabel}
        </Text>
      </TouchableOpacity>

      {items.slice(2, 4).map((it) => (
        <TouchableOpacity key={it.key} style={styles.tabItem} onPress={() => goto(it.path)} activeOpacity={0.7}>
          <Feather name={it.icon} size={20} color={active === it.key ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.tabLabel, { color: active === it.key ? colors.primary : colors.mutedForeground }]}>
            {it.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    borderTopWidth: 0,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 10,
  },
  tabItem: { alignItems: "center", justifyContent: "center", flex: 1 },
  tabLabel: { fontFamily: "Tajawal_500Medium", fontSize: 9.5, marginTop: 3 },
  floatingBtnWrap: { alignItems: "center", justifyContent: "center", width: 80, top: -22 },
  floatingBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#16C47F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  floatingLabel: { fontFamily: "Tajawal_700Bold", fontSize: 9.5, marginTop: 5 },
});
