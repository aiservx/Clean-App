import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useChatBadge } from "@/lib/chatBadge";
import { useProviderOrderBadge } from "@/lib/providerOrderBadge";

type ActiveKey = "home" | "offers" | "bookings" | "chat" | "profile" | "services" | "wallet" | null;

type Props = {
  active?: ActiveKey;
  variant?: "user" | "provider";
};

export default function FloatingTabBar({ active = null, variant = "user" }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useChatBadge();
  const { pendingCount } = useProviderOrderBadge();

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
    { key: "bookings", label: "طلباتي", icon: "calendar", iconLib: "feather", path: "/(provider)/bookings" },
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

        const showChatBadge = it.key === "chat" && unreadCount > 0 && !isActive;
        const showOrderBadge =
          it.key === "bookings" && variant === "provider" && pendingCount > 0 && !isActive;
        const badgeNum = showChatBadge ? unreadCount : showOrderBadge ? pendingCount : 0;
        const showBadge = showChatBadge || showOrderBadge;

        return (
          <TouchableOpacity key={it.key} style={s.tab} onPress={() => goto(it.path)} activeOpacity={0.7}>
            <View style={[s.iconWrap, isActive && { backgroundColor: colors.primary + "14" }]}>
              {it.iconLib === "mci" ? (
                <MaterialCommunityIcons name={it.icon as any} size={21} color={color} />
              ) : (
                <Feather name={it.icon as any} size={21} color={color} />
              )}
              {showBadge && (
                <View style={[s.badge, { backgroundColor: colors.destructive ?? "#EF4444" }]}>
                  <Text style={s.badgeText}>
                    {badgeNum > 99 ? "99+" : String(badgeNum)}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[s.label, { color, fontFamily: isActive ? "Tajawal_700Bold" : "Tajawal_500Medium" }]}>{it.label}</Text>
            {isActive && <View style={[s.activeDot, { backgroundColor: colors.primary }]} />}
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
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    borderTopWidth: 0.5,
    borderTopColor: "rgba(0,0,0,0.04)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  tab: { alignItems: "center", justifyContent: "center", flex: 1, gap: 2 },
  iconWrap: { width: 36, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 10, marginTop: 1 },
  activeDot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Tajawal_700Bold",
    lineHeight: 12,
  },
});
