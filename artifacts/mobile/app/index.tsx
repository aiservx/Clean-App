import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/lib/auth";

export default function Index() {
  const { session, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    (async () => {
      const onboarded = await AsyncStorage.getItem("onboarded");
      if (!onboarded) {
        router.replace("/onboarding");
        return;
      }
      if (session && profile?.role === "provider") {
        router.replace("/(provider)" as any);
        return;
      }
      router.replace("/(tabs)");
    })();
  }, [loading, session, profile]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
      <ActivityIndicator color="#16C47F" size="large" />
    </View>
  );
}
