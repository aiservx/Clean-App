import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useAuth, type Role } from "@/lib/auth";

export default function AuthGate({ children, require = "any" as Role | "any" }: { children: React.ReactNode; require?: Role | "any" }) {
  const { session, profile, loading } = useAuth();
  
  useEffect(() => {
    if (loading || !profile) return;
    
    // No auth required - allow access
    if (require === "any") return;
    
    // Check if user has required role (admin can access everything)
    const isAuthorized = profile.role === require || profile.role === "admin";
    
    if (!isAuthorized) {
      // User doesn't have required role - redirect to their home
      if (profile.role === "provider" || profile.role === "admin") {
        router.replace("/(provider)/dashboard" as any);
      } else {
        router.replace("/(tabs)/home" as any);
      }
    }
    // If authorized, let the page render normally
  }, [loading, profile, require]);
  
  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
    }
  }, [loading, session]);
  
  if (loading || !session) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  
  return <>{children}</>;
}
