import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useAuth, type Role } from "@/lib/auth";

export default function AuthGate({ children, require = "user" as Role | "any" }: { children: React.ReactNode; require?: Role | "any" }) {
  const { session, profile, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (require !== "any" && profile && profile.role !== require && profile.role !== "admin") {
      router.replace((profile.role === "provider" ? "/(provider)/home" : "/(tabs)/home") as any);
    }
  }, [loading, session, profile, require]);
  if (loading || !session) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  return <>{children}</>;
}
