import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/lib/auth";

export default function Index() {
  const { session, profile, loading, profileLoaded } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("onboarded")
      .then((v) => setOnboarded(!!v))
      .catch((e) => {
        console.log("[v0] Onboarding check failed:", e);
        setOnboarded(true); // Default to true if check fails
      });
  }, []);

  // Wait for: auth loading, onboarded check, AND (when there is a session) for profileLoaded
  if (loading || onboarded === null || (session && !profileLoaded)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator color="#16C47F" size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", padding: 20 }}>
        <Text style={{ color: "#E11D48", fontSize: 14, textAlign: "center", marginBottom: 10 }}>Error loading app</Text>
        <Text style={{ color: "#64748B", fontSize: 12, textAlign: "center" }}>{error}</Text>
      </View>
    );
  }

  if (!onboarded) return <Redirect href="/onboarding" />;

  // Logged-in: route by role (default to user/customer if profile is missing)
  if (session && profile) {
    const role = profile.role;
    if (role === "provider" || role === "admin") {
      return <Redirect href={"/(provider)/home" as any} />;
    }
    return <Redirect href={"/(tabs)/home" as any} />;
  }

  // Guest: show home as customer (browsing without auth allowed)
  return <Redirect href={"/(tabs)/home" as any} />;
}
