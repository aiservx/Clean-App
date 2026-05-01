import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "./supabase";

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
    const token = (await Notifications.getExpoPushTokenAsync({ projectId: "dd03c810-2182-47e7-9a0a-823fdcc351b8" })).data;
    if (token && userId) {
      await supabase.from("push_tokens").upsert({ user_id: userId, token, platform: Platform.OS }, { onConflict: "token" });
    }
    return token;
  } catch {
    return null;
  }
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  try {
    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", userId);
    if (!tokens?.length) return;
    const messages = tokens.map((t: any) => ({
      to: t.token,
      title,
      body,
      data: data ?? {},
      sound: "default",
      priority: "high",
      channelId: "default",
    }));
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.log("[v0] Push send failed:", (e as Error).message);
  }
}
