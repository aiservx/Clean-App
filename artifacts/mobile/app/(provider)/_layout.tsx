import { Tabs } from "expo-router";
import React from "react";

import FloatingTabBar from "@/components/FloatingTabBar";

const HIDDEN_ROUTES = new Set(["booking-details"]);

export default function ProviderTabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state }) => {
        const routeName = state.routes[state.index]?.name;
        if (HIDDEN_ROUTES.has(routeName)) return null;
        const map: Record<string, any> = {
          dashboard: "home",
          bookings: "bookings",
          profile: "profile",
          wallet: "wallet",
          chat: "chat",
        };
        return <FloatingTabBar variant="provider" active={map[routeName] ?? null} />;
      }}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="bookings" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="wallet" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="booking-details" options={{ href: null }} />
    </Tabs>
  );
}
