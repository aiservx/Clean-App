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
        shouldPlaySound: true,
        shouldSetBadge: true,
      } as any),
    });
  } catch (e) {
    console.log("[v0] Notification handler setup skipped:", (e as Error).message);
  }
}

export async function registerForPush(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null;
  if (Platform.OS === "web") return null;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "الإشعارات الافتراضية",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#16C47F",
        sound: "default",
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== "granted") return null;

    await Notifications.setNotificationCategoryAsync("new_booking", [
      {
        identifier: "accept",
        buttonTitle: "قبول ✅",
        options: { isDestructive: false, isAuthenticationRequired: false },
      },
      {
        identifier: "reject",
        buttonTitle: "رفض ❌",
        options: { isDestructive: true, isAuthenticationRequired: false },
      },
    ]).catch(() => {});

    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: "dd03c810-2182-47e7-9a0a-823fdcc351b8",
      })
    ).data;

    if (token && userId) {
      await supabase
        .from("push_tokens")
        .upsert({ user_id: userId, token, platform: Platform.OS }, { onConflict: "token" });
    }
    return token;
  } catch (e) {
    console.log("[v0] registerForPush failed:", (e as Error).message);
    return null;
  }
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>,
  categoryIdentifier?: string
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
      ...(categoryIdentifier ? { categoryId: categoryIdentifier } : {}),
    }));
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.log("[v0] Push send failed:", (e as Error).message);
  }
}

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  try {
    await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      body,
      data: data ?? {},
      read: false,
    });
  } catch (e) {
    console.log("[v0] createNotification failed:", (e as Error).message);
  }
}

export async function notifyAvailableProviders(
  title: string,
  body: string,
  data?: Record<string, any>
) {
  try {
    const { data: provRows } = await supabase
      .from("providers")
      .select("id")
      .eq("available", true)
      .limit(30);
    if (!provRows?.length) return;
    for (const prov of provRows) {
      sendPushNotification(prov.id, title, body, data, "new_booking");
      createNotification(prov.id, "booking_created", title, body, data ?? {});
    }
  } catch (e) {
    console.log("[v0] notifyAvailableProviders failed:", (e as Error).message);
  }
}
