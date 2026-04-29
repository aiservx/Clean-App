import { Tabs } from "expo-router";
import React from "react";

import FloatingTabBar from "@/components/FloatingTabBar";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state }) => {
        const routeName = state.routes[state.index]?.name;
        const map: Record<string, any> = {
          home: "home",
          profile: "profile",
          bookings: "bookings",
          chat: "chat",
        };
        return <FloatingTabBar active={map[routeName] ?? null} />;
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="bookings" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="placeholder" options={{ href: null }} />
      <Tabs.Screen name="offers" options={{ href: null }} />
    </Tabs>
  );
}
