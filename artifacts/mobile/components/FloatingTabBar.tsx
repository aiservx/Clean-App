import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";

type ActiveKey = "home" | "offers" | "bookings" | "chat" | "profile" | "services" | "wallet" | null;

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

  const userItems: { key: ActiveKey; label: string; icon: string; iconLib: "feather" | "mci"; path: string }[] = [
    { key: "home", label: "الرئيسية", icon: "home", iconLib: "feather", path: "/(tabs)/home" },
    { key: "offers", label: "العروض", icon: "diamond-stone", iconLib: "mci", path: "/(tabs)/offers" },
    { key: "bookings", label: "طلباتي", icon: "calendar", iconLib: "feather", path: "/(tabs)/bookings" },
    { key: "chat", label: "المحادثات", icon: "message-circle", iconLib: "feather", path: "/(tabs)/chat" },
    { key: "profile", label: "الملف الشخصي", icon: "user", iconLib: "feather", path: "/(tabs)/profile" },
  ];

  const providerItems: { key: ActiveKey; label: string; icon: string; iconLib: "feather" | "mci"; path: string }[] = [
    { key: "home", label: "لوحة التحكم", icon: "grid", iconLib: "feather", path: "/(provider)/dashboard" },
    { key: "wallet", label: "المحفظة", icon: "credit-card", iconLib: "feather", path: "/(provider)/wallet" },
    { key: "chat", label: "الرسائل", icon: "message-circle", iconLib: "feather", path: "/(provider)/chat" },
    { key: "profile", label: "الملف الشخصي", icon: "user", iconLib: "feather", path: "/(provider)/profile" },
  ];

  const items = variant === "provider" ? providerItems : userItems;

  return (
    <View style={[s.bar, { paddingBottom: insets.bottom + 6, backgroundColor: colors.card }]}>
      {items.map((it) => {
        const isActive = active === it.key;
        const color = isActive ? colors.primary : colors.mutedForeground;
        return (
          <TouchableOpacity key={it.key} style={s.tab} onPress={() => goto(it.path)} activeOpacity={0.7}>
            {it.iconLib === "mci" ? (
              <MaterialCommunityIcons name={it.icon as any} size={22} color={color} />
            ) : (
              <Feather name={it.icon as any} size={22} color={color} />
            )}
            <Text style={[s.label, { color }]}>{it.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 10,
  },
  tab: { alignItems: "center", justifyContent: "center", flex: 1 },
  label: { fontFamily: "Tajawal_500Medium", fontSize: 10, marginTop: 4 },
});
