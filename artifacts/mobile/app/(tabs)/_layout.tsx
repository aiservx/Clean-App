import { BlurView } from "expo-blur";
import { Tabs, router } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme, TouchableOpacity, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarLabelStyle: {
          fontFamily: "Cairo_500Medium",
          fontSize: 11,
          marginBottom: 4,
        },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: 0,
          elevation: 10,
          height: isWeb ? 84 : 84,
          paddingBottom: isWeb ? 20 : 20,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 16,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.card },
              ]}
            />
          ),
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: "الملف الشخصي",
          tabBarIcon: ({ color, focused }) => (
            <Feather name="user" size={24} color={color} style={{ fontWeight: focused ? "bold" : "normal" }} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "حجوزاتي",
          tabBarIcon: ({ color, focused }) => (
            <Feather name="calendar" size={24} color={color} style={{ fontWeight: focused ? "bold" : "normal" }} />
          ),
        }}
      />
      <Tabs.Screen
        name="placeholder"
        options={{
          title: "",
          tabBarButton: () => (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/services");
              }}
              style={styles.floatingButtonContainer}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.floatingButton}
              >
                <MaterialCommunityIcons name="broom" size={28} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.floatingButtonLabel, { color: colors.mutedForeground }]}>احجز الآن</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "الرسائل",
          tabBarIcon: ({ color, focused }) => (
            <Feather name="message-circle" size={24} color={color} style={{ fontWeight: focused ? "bold" : "normal" }} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ color, focused }) => (
            <Feather name="home" size={24} color={color} style={{ fontWeight: focused ? "bold" : "normal" }} />
          ),
        }}
      />
      <Tabs.Screen
        name="offers"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  floatingButtonContainer: {
    top: -20,
    alignItems: "center",
    justifyContent: "center",
    width: 80,
  },
  floatingButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#16C47F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingButtonLabel: {
    fontFamily: "Cairo_500Medium",
    fontSize: 11,
    marginTop: 4,
  },
});
