import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "./supabase";

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
// Must be created before registering for push. Each channel controls
// sound/vibration/importance independently so different event types
// can have different behaviours.

async function createAndroidChannels() {
  if (Platform.OS !== "android") return;
  try {
    // Default channel — general notifications
    await Notifications.setNotificationChannelAsync("default", {
      name: "الإشعارات العامة",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#16C47F",
      sound: "default",
      description: "إشعارات عامة من تطبيق نظافة",
    });

    // New booking alert — MAX importance for providers
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

    // Booking status updates
    await Notifications.setNotificationChannelAsync("booking_status", {
      name: "تحديثات الطلب",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: "#8B5CF6",
      sound: "default",
      description: "تحديثات حالة الحجوزات",
    });

    // Chat messages
    await Notifications.setNotificationChannelAsync("chat", {
      name: "رسائل المحادثة",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 150, 100, 150],
      lightColor: "#F59E0B",
      sound: "default",
      description: "رسائل المحادثة بين العملاء والمزودين",
    });

    // Promotions / offers — LOW importance (non-intrusive)
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

// ── Notification Categories (iOS action buttons + Android) ─────────────────

async function registerCategories() {
  try {
    // Provider: accept/reject new booking from notification
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

    // Customer: track booking from notification
    await Notifications.setNotificationCategoryAsync("booking_update", [
      {
        identifier: "track",
        buttonTitle: "تتبع الطلب 📍",
        options: { isDestructive: false, isAuthenticationRequired: false },
      },
    ]);

    // Review prompt
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
    // Create channels first (Android-only, no-op on iOS)
    await createAndroidChannels();

    // Register action categories
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

// ── Send push via Expo Push API ────────────────────────────────────────────

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>,
  categoryIdentifier?: string,
  channelId?: string,
) {
  try {
    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", userId);

    if (!tokens?.length) {
      console.log("[notifications] sendPush: no tokens for user", userId);
      return;
    }

    // Map category to channel for Android
    const resolvedChannel =
      channelId ??
      (categoryIdentifier === "new_booking"
        ? "new_booking"
        : categoryIdentifier === "booking_update"
        ? "booking_status"
        : "default");

    const messages = tokens.map((t: any) => ({
      to: t.token,
      title,
      body,
      data: data ?? {},
      sound: "default",
      priority: "high",
      channelId: resolvedChannel,
      ...(categoryIdentifier ? { categoryId: categoryIdentifier } : {}),
    }));

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });

    const json = await res.json().catch(() => null);
    console.log(`[notifications] sendPush to ${tokens.length} device(s):`, json?.data?.[0]?.status ?? res.status);
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

    // Fetch ALL push tokens in one query
    const { data: tokenRows } = await supabase
      .from("push_tokens")
      .select("token, user_id")
      .in("user_id", providerIds);

    if (!tokenRows?.length) {
      console.log("[notifications] notifyProviders: no push tokens found");
      return;
    }

    // Build one batch of messages for Expo Push API
    const messages = tokenRows.map((t: any) => ({
      to: t.token,
      title,
      body,
      data: data ?? {},
      sound: "default",
      priority: "high",
      channelId: "new_booking",
      categoryId: "new_booking",
      ttl: 300, // 5 min — stale booking alerts are useless
    }));

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });

    const json = await res.json().catch(() => null);
    const successCount = (json?.data ?? []).filter((d: any) => d?.status === "ok").length;
    console.log(`[notifications] notifyProviders: ${successCount}/${messages.length} delivered`);

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
