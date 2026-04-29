import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/lib/auth";

export default function Index() {
  const { session, profile, loading, profileLoaded } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("onboarded").then((v) => setOnboarded(!!v));
  }, []);

  // Wait for: auth loading, onboarded check, AND (when there is a session) for profileLoaded
  if (loading || onboarded === null || (session && !profileLoaded)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator color="#16C47F" size="large" />
      </View>
    );
  }

  if (!onboarded) return <Redirect href="/onboarding" />;

  // Logged-in: route by role (default to user/customer if profile is missing)
  if (session) {
    const role = profile?.role ?? "user";
    if (role === "provider") return <Redirect href={"/(provider)/home" as any} />;
    if (role === "admin") return <Redirect href={"/(provider)/home" as any} />;
    return <Redirect href={"/(tabs)/home" as any} />;
  }

  // Guest: show home as customer (browsing without auth allowed)
  return <Redirect href={"/(tabs)/home" as any} />;
}
