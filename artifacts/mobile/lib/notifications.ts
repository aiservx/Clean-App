import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "./supabase";

// Safely configure notification handler without triggering remote push errors
if (Platform.OS !== "web") {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: true,
      } as any),
    });
  } catch (e) {
    console.log("[v0] Notification handler setup skipped:", (e as Error).message);
  }
}

export async function registerForPush(userId: string) {
  if (!Device.isDevice) return null;
  if (Platform.OS === "web") return null;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== "granted") return null;
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (token && userId) {
      await supabase.from("push_tokens").upsert({ user_id: userId, token, platform: Platform.OS }, { onConflict: "token" });
    }
    return token;
  } catch {
    return null;
  }
}
