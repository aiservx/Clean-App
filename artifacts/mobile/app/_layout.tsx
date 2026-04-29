import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
} from "@expo-google-fonts/tajawal";
import { useFonts } from "expo-font";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nManager, Text } from "react-native";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BookingProvider } from "@/store/booking";
import { AuthProvider } from "@/lib/auth";

if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack initialRouteName="onboarding" screenOptions={{ headerBackTitle: "Back", headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(provider)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="services" options={{ headerShown: false }} />
      <Stack.Screen name="booking" options={{ headerShown: false }} />
      <Stack.Screen name="tracking" options={{ headerShown: false }} />
      <Stack.Screen name="rating" options={{ headerShown: false }} />
      <Stack.Screen name="payment" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="favorites" options={{ headerShown: false }} />
      <Stack.Screen name="provider/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="address-form" options={{ headerShown: false }} />
      <Stack.Screen name="payment-methods" options={{ headerShown: false }} />
      <Stack.Screen name="payment-form" options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="help" options={{ headerShown: false }} />
      <Stack.Screen name="referrals" options={{ headerShown: false }} />
      <Stack.Screen name="chat-detail" options={{ headerShown: false }} />
      <Stack.Screen name="booking-details" options={{ headerShown: false }} />
      <Stack.Screen name="provider-edit" options={{ headerShown: false }} />
      <Stack.Screen name="provider-hours" options={{ headerShown: false }} />
      <Stack.Screen name="withdraw" options={{ headerShown: false }} />
      <Stack.Screen name="provider-notifications" options={{ headerShown: false }} />
      <Stack.Screen name="provider-referrals" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Tajawal_600SemiBold: Tajawal_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      const TextAny = Text as any;
      TextAny.defaultProps = TextAny.defaultProps || {};
      TextAny.defaultProps.style = [
        { fontFamily: "Tajawal_400Regular", writingDirection: "rtl" },
        TextAny.defaultProps.style,
      ];
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <BookingProvider>
                  <RootLayoutNav />
                </BookingProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
