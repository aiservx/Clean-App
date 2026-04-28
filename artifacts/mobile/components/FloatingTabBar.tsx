import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";

type ActiveKey = "home" | "profile" | "bookings" | "chat" | "services" | "offers" | null;

type Props = {
  active?: ActiveKey;
};

export default function FloatingTabBar({ active = null }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const goto = (path: string) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    router.push(path as any);
  };

  const items: { key: Exclude<ActiveKey, null | "services" | "offers">; label: string; icon: any; path: string }[] = [
    { key: "profile", label: "الملف الشخصي", icon: "user", path: "/(tabs)/profile" },
    { key: "bookings", label: "حجوزاتي", icon: "calendar", path: "/(tabs)/bookings" },
    { key: "chat", label: "الرسائل", icon: "message-circle", path: "/(tabs)/chat" },
    { key: "home", label: "الرئيسية", icon: "home", path: "/(tabs)" },
  ];

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom + 10, backgroundColor: colors.card },
      ]}
    >
      {/* Profile + Bookings (RTL: rightmost two) */}
      {items.slice(0, 2).map((it) => (
        <TouchableOpacity key={it.key} style={styles.tabItem} onPress={() => goto(it.path)} activeOpacity={0.7}>
          <Feather
            name={it.icon}
            size={22}
            color={active === it.key ? colors.primary : colors.mutedForeground}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: active === it.key ? colors.primary : colors.mutedForeground },
            ]}
          >
            {it.label}
          </Text>
        </TouchableOpacity>
      ))}

      {/* Floating central CTA */}
      <TouchableOpacity
        style={styles.floatingBtnWrap}
        activeOpacity={0.9}
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/services");
        }}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.floatingBtn}
        >
          <MaterialCommunityIcons name="broom" size={28} color="#FFFFFF" />
        </LinearGradient>
        <Text style={[styles.floatingLabel, { color: active === "services" ? colors.primary : colors.mutedForeground }]}>
          احجز الآن
        </Text>
      </TouchableOpacity>

      {/* Chat + Home (RTL: leftmost two) */}
      {items.slice(2, 4).map((it) => (
        <TouchableOpacity key={it.key} style={styles.tabItem} onPress={() => goto(it.path)} activeOpacity={0.7}>
          <Feather
            name={it.icon}
            size={22}
            color={active === it.key ? colors.primary : colors.mutedForeground}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: active === it.key ? colors.primary : colors.mutedForeground },
            ]}
          >
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
    paddingTop: 12,
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
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  tabLabel: {
    fontFamily: "Cairo_500Medium",
    fontSize: 10,
    marginTop: 4,
  },
  floatingBtnWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 80,
    top: -20,
  },
  floatingBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#16C47F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  floatingLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 10,
    marginTop: 6,
  },
});
