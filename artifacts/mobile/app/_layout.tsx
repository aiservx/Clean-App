import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
} from "@expo-google-fonts/tajawal";
import { useFonts, loadAsync as loadFontAsync } from "expo-font";
import { Feather, MaterialCommunityIcons, Ionicons, MaterialIcons, FontAwesome, FontAwesome5, AntDesign, Entypo } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { GestureHandlerRootView } from "react-native-gesture-handler";
// Safe KeyboardProvider wrapper — falls back to a plain wrapper if the native module crashes
let KeyboardProvider: React.ComponentType<{ children: React.ReactNode }>;
try {
  KeyboardProvider = require("react-native-keyboard-controller").KeyboardProvider;
} catch {
  // eslint-disable-next-line react/display-name
  KeyboardProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
}
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nManager, Text } from "react-native";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BookingProvider } from "@/store/booking";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { ChatBadgeProvider } from "@/lib/chatBadge";
import { NotifBadgeProvider } from "@/lib/notifBadge";
import { ProviderOrderBadgeProvider } from "@/lib/providerOrderBadge";
import { registerForPush } from "@/lib/notifications";
import { RealtimeProvider } from "@/lib/realtimeStore";
import { RatingBottomSheetController } from "@/components/RatingBottomSheet";
import { useOTAUpdate } from "@/lib/useOTAUpdate";

function OTAUpdater() {
  useOTAUpdate();
  return null;
}

function PushRegistrar() {
  const { session } = useAuth();
  const registered = useRef<string | null>(null);
  // Keep session in a ref so the notification listener always has fresh session
  const sessionRef = useRef<Session | null>(null);
  useEffect(() => { sessionRef.current = session; }, [session]);

  useEffect(() => {
    if (!session?.user?.id || registered.current === session.user.id) return;
    registered.current = session.user.id;
    registerForPush(session.user.id).catch(() => {});
  }, [session?.user?.id]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data as any;
      const bookingId = data?.bookingId || data?.booking_id;
      const type = data?.type || "";
      const actionId = response.actionIdentifier;

      // ── Provider taps Accept / Reject on a new-booking notification ──────
      if (bookingId && (actionId === "accept" || actionId === "reject")) {
        if (actionId === "reject") {
          // Reject = just dismiss — don't change booking status so other
          // providers still see the request in their dashboard.
          console.log("[push] provider rejected booking notification, dismissing");
          return;
        }

        // Accept: claim the booking for this provider
        try {
          const { supabase: sb } = await import("@/lib/supabase");
          const providerId = sessionRef.current?.user?.id;

          const updatePayload: any = { status: "accepted" };
          if (providerId) updatePayload.provider_id = providerId;

          const { error } = await sb
            .from("bookings")
            .update(updatePayload)
            .eq("id", bookingId)
            .eq("status", "pending"); // only accept if still pending (race-safe)

          if (error) {
            console.log("[push] accept booking failed:", error.message);
            return;
          }

          // Mark provider unavailable
          if (providerId) {
            await sb.from("providers").update({ available: false }).eq("id", providerId);
          }

          // Notify the customer
          const { createNotification: cn, sendPushNotification: spn } = await import("@/lib/notifications");
          const { data: bk } = await sb
            .from("bookings")
            .select("user_id, services(title_ar)")
            .eq("id", bookingId)
            .maybeSingle();
          if (bk?.user_id) {
            const svcTitle = (bk.services as any)?.title_ar || "الخدمة";
            cn(bk.user_id, "booking_accepted", "✅ تم قبول طلبك!", `مزود الخدمة قبل طلبك لـ ${svcTitle}`, { bookingId });
            spn(bk.user_id, "✅ تم قبول طلبك!", `مزود الخدمة قبل طلبك لـ ${svcTitle}`, { bookingId });
          }

          // Navigate provider to booking details
          try {
            router.push(`/(provider)/booking-details?id=${bookingId}` as any);
          } catch {}
        } catch (e) {
          console.log("[push] accept action failed:", (e as Error).message);
        }
        return;
      }

      // ── User taps the notification body (no action button) ─────────────
      try {
        if (bookingId) {
          if (type === "booking_created") {
            router.push(`/(provider)/booking-details?id=${bookingId}` as any);
          } else {
            router.push({ pathname: "/tracking", params: { id: bookingId } } as any);
          }
        }
      } catch {}
    });
    return () => sub.remove();
  }, []);

  return null;
}

// ── RTL: force Arabic RTL from the very first launch ──────────────────────
// forceRTL only takes effect on the NEXT JS reload. If the app started without
// RTL (fresh install), we apply it immediately and trigger a JS-level reload
// via expo-updates so the user never sees an LTR layout.
I18nManager.allowRTL(true);
if (!I18nManager.isRTL) {
  I18nManager.forceRTL(true);
  // Dynamically require expo-updates to avoid crashes on web/Expo Go
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Updates = require("expo-updates");
    if (typeof Updates?.reloadAsync === "function") {
      Updates.reloadAsync().catch(() => {});
    }
  } catch {
    // expo-updates unavailable (web / Expo Go) — RTL will apply on next cold start
  }
}

// Web: direction is handled by I18nProvider via DOM
if (typeof document !== "undefined") {
  document.documentElement.dir = "rtl";
  document.documentElement.lang = "ar";
}

SplashScreen.preventAutoHideAsync().catch(() => {});
const queryClient = new QueryClient();

// Hard safety net: if anything stalls (font fetch, native module),
// hide the splash after 5s no matter what so the user never sees a frozen screen.
setTimeout(() => {
  SplashScreen.hideAsync().catch(() => {});
}, 5000);

function RootLayoutNav() {
  return (
    <Stack initialRouteName="index" screenOptions={{ headerBackTitle: "Back", headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
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
      <Stack.Screen name="statement" options={{ headerShown: false }} />
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

  // Load icon fonts separately and non-blocking so they never delay the splash
  // or cause squares on Expo Go. Expo Go pre-bundles these; this is a safety net.
  useEffect(() => {
    loadFontAsync({
      ...Feather.font,
      ...MaterialCommunityIcons.font,
      ...Ionicons.font,
      ...MaterialIcons.font,
      ...FontAwesome.font,
      ...FontAwesome5.font,
      ...AntDesign.font,
      ...Entypo.font,
    }).catch(() => {});
  }, []);

  const [forceReady, setForceReady] = React.useState(false);
  useEffect(() => {
    const t = setTimeout(() => setForceReady(true), 3500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError || forceReady) {
      const TextAny = Text as any;
      TextAny.defaultProps = TextAny.defaultProps || {};
      TextAny.defaultProps.style = [
        { fontFamily: "Tajawal_400Regular" },
        TextAny.defaultProps.style,
      ];
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, forceReady]);

  if (!fontsLoaded && !fontError && !forceReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <ThemeProvider>
                <I18nProvider>
                  <AuthProvider>
                    <RealtimeProvider>
                      <OTAUpdater />
                      <PushRegistrar />
                      <ProviderOrderBadgeProvider>
                        <ChatBadgeProvider>
                          <NotifBadgeProvider>
                            <BookingProvider>
                              <RootLayoutNav />
                              <RatingBottomSheetController />
                            </BookingProvider>
                          </NotifBadgeProvider>
                        </ChatBadgeProvider>
                      </ProviderOrderBadgeProvider>
                    </RealtimeProvider>
                  </AuthProvider>
                </I18nProvider>
              </ThemeProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
