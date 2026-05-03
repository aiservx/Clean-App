import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "./supabase";

const PUSH_API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

// ── Foreground handler: always show alert + sound + badge ──────────────────
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
    console.log("[notifications] handler setup skipped:", (e as Error).message);
  }
}

// ── Android Notification Channels ─────────────────────────────────────────
async function createAndroidChannels() {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync("default", {
      name: "الإشعارات العامة",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#16C47F",
      sound: "default",
      description: "إشعارات عامة من تطبيق نظافة",
    });
    await Notifications.setNotificationChannelAsync("new_booking", {
      name: "طلبات جديدة",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 100, 400],
      lightColor: "#2F80ED",
      sound: "default",
      description: "طلبات حجز جديدة وردت للمزود",
      enableVibrate: true,
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync("booking_status", {
      name: "تحديثات الطلب",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: "#8B5CF6",
      sound: "default",
      description: "تحديثات حالة الحجوزات",
    });
    await Notifications.setNotificationChannelAsync("chat", {
      name: "رسائل المحادثة",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 150, 100, 150],
      lightColor: "#F59E0B",
      sound: "default",
      description: "رسائل المحادثة بين العملاء والمزودين",
    });
    await Notifications.setNotificationChannelAsync("promotions", {
      name: "العروض والتخفيضات",
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: [0, 100],
      lightColor: "#EC4899",
      description: "عروض خاصة وتخفيضات",
    });
    console.log("[notifications] Android channels created ✓");
  } catch (e) {
    console.log("[notifications] createAndroidChannels error:", (e as Error).message);
  }
}

// ── Notification Categories ────────────────────────────────────────────────
async function registerCategories() {
  try {
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
    ]);
    await Notifications.setNotificationCategoryAsync("booking_update", [
      {
        identifier: "track",
        buttonTitle: "تتبع الطلب 📍",
        options: { isDestructive: false, isAuthenticationRequired: false },
      },
    ]);
    await Notifications.setNotificationCategoryAsync("review_request", [
      {
        identifier: "rate",
        buttonTitle: "تقييم الآن ⭐",
        options: { isDestructive: false, isAuthenticationRequired: false },
      },
      {
        identifier: "dismiss",
        buttonTitle: "لاحقاً",
        options: { isDestructive: false, isAuthenticationRequired: false },
      },
    ]);
    console.log("[notifications] categories registered ✓");
  } catch (e) {
    console.log("[notifications] registerCategories error:", (e as Error).message);
  }
}

// ── Token registration ─────────────────────────────────────────────────────
export async function registerForPush(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("[notifications] registerForPush: not a physical device, skipping");
    return null;
  }
  if (Platform.OS === "web") return null;

  try {
    await createAndroidChannels();
    await registerCategories();

    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }

    if (final !== "granted") {
      console.log("[notifications] permission not granted:", final);
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "dd03c810-2182-47e7-9a0a-823fdcc351b8",
    });
    const token = tokenData.data;

    console.log("[notifications] push token:", token.slice(0, 30) + "…");

    if (token && userId) {
      await supabase
        .from("push_tokens")
        .upsert({ user_id: userId, token, platform: Platform.OS }, { onConflict: "token" });
      console.log("[notifications] token saved to DB ✓");
    }

    return token;
  } catch (e) {
    console.log("[notifications] registerForPush failed:", (e as Error).message);
    return null;
  }
}

// ── Send push via API server (bypasses Supabase RLS) ──────────────────────
//
// EXPO_PUBLIC_API_URL must point to the deployed API server, e.g.:
//   https://your-repl.username.repl.co
//
// Set it in eas.json → build → preview/production → env, then rebuild the APK.
//
// If not configured, falls back to direct Supabase query (may fail due to RLS
// if push_tokens has row-level security enabled — which is the default).

async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>,
  categoryIdentifier?: string,
  channelId?: string,
) {
  try {
    // ── Preferred: route through API server (bypasses RLS) ──────────────
    if (PUSH_API_URL) {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        console.log("[notifications] sendPush: no session token — skipping server route");
        return;
      }
      const res = await fetch(`${PUSH_API_URL}/api/push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId, title, body, data, categoryIdentifier, channelId }),
      });
      const json = await res.json().catch(() => null);
      console.log(
        `[notifications] sendPush via server → sent=${json?.sent ?? "?"}/${json?.total ?? "?"}`,
      );
      return;
    }

    // No API URL configured — push cannot be sent without server relay
    console.warn("[notifications] EXPO_PUBLIC_API_URL not set — push skipped. Set it in eas.json and rebuild.");
  } catch (e) {
    console.log("[notifications] sendPush failed:", (e as Error).message);
  }
}

// ── Create in-app notification record ─────────────────────────────────────
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  data?: Record<string, any>,
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
    console.log(`[notifications] createNotification type=${type} for user=${userId} ✓`);
  } catch (e) {
    console.log("[notifications] createNotification failed:", (e as Error).message);
  }
}

// ── Notify all available providers — batched single API call ───────────────
export async function notifyAvailableProviders(
  title: string,
  body: string,
  data?: Record<string, any>,
  bookingId?: string,
) {
  try {
    const { data: provRows } = await supabase
      .from("providers")
      .select("id")
      .eq("available", true)
      .limit(50);

    if (!provRows?.length) {
      console.log("[notifications] notifyProviders: no available providers");
      return;
    }

    const providerIds = provRows.map((p: any) => p.id);
    console.log(`[notifications] notifying ${providerIds.length} available providers`);

    if (PUSH_API_URL) {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        console.log("[notifications] notifyProviders: no session token — skipping server route");
        return;
      }
      await Promise.all(
        providerIds.map((id: string) =>
          fetch(`${PUSH_API_URL}/api/push`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              userId: id,
              title,
              body,
              data: data ?? {},
              categoryIdentifier: "new_booking",
              ...(bookingId ? { bookingId } : {}),
            }),
          }).catch(() => {}),
        ),
      );
    } else {
      console.warn("[notifications] notifyAvailableProviders: EXPO_PUBLIC_API_URL not set — push skipped. Set it in eas.json and rebuild.");
    }

    // Save in-app notification records for all providers (non-blocking)
    Promise.all(
      providerIds.map((id: string) =>
        createNotification(id, "booking_created", title, body, data ?? {}),
      ),
    ).catch(() => {});
  } catch (e) {
    console.log("[notifications] notifyAvailableProviders failed:", (e as Error).message);
  }
}

// ── Badge sync ─────────────────────────────────────────────────────────────
export async function syncBadge(count: number) {
  if (Platform.OS === "web") return;
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch {}
}
