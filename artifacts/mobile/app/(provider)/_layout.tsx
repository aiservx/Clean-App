import { Tabs } from "expo-router";
import React from "react";

import FloatingTabBar from "@/components/FloatingTabBar";

export default function ProviderTabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state }) => {
        const routeName = state.routes[state.index]?.name;
        const map: Record<string, any> = {
          index: "home",
          profile: "profile",
          wallet: "wallet",
          chat: "chat",
        };
        return <FloatingTabBar variant="provider" active={map[routeName] ?? null} />;
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="wallet" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="bookings" options={{ href: null }} />
    </Tabs>
  );
}
