import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  } as any),
});

export async function registerForPush(userId: string) {
  if (!Device.isDevice) return null;
  if (Platform.OS === "web") return null;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== "granted") return null;
  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (token && userId) {
      await supabase.from("push_tokens").upsert({ user_id: userId, token, platform: Platform.OS }, { onConflict: "token" });
    }
    return token;
  } catch {
    return null;
  }
}
