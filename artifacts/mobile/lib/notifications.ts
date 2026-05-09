import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabase";

const PUSH_API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

// ── Foreground handler: suppress OS banner (InAppBanner handles it) ────────
// shouldShowAlert/shouldShowBanner = false so the OS does NOT show its own
// system banner while the app is in the foreground — InAppBanner shows a
// custom slide-in card instead.  Background/killed-state push notifications
// are always shown by the OS regardless of this handler.
if (Platform.OS !== "web") {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: false,
        shouldShowBanner: false,
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
    await Notifications.setNotificationChannelAsync("payment", {
      name: "المدفوعات والأرباح",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 100, 300],
      lightColor: "#16C47F",
      sound: "default",
      description: "إشعارات المدفوعات ووصول الأرباح",
      enableVibrate: true,
      showBadge: true,
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

// Store current device's push token for cleanup on signOut
let _currentDeviceToken: string | null = null;
export function getCurrentPushToken(): string | null { return _currentDeviceToken; }

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

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      "c1d243e2-193e-4a27-ad30-87468c74e92b";

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    console.log("[notifications] push token:", token.slice(0, 30) + "…");
    _currentDeviceToken = token;

    if (token && userId) {
      // Remove stale tokens for this user (from old APK/project installs) before saving the current one.
      // This prevents PUSH_TOO_MANY_EXPERIENCE_IDS errors when Expo receives tokens from multiple projects.
      await supabase.from("push_tokens").delete().eq("user_id", userId).neq("token", token);
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
  if (!PUSH_API_URL) {
    console.warn("[notifications] EXPO_PUBLIC_API_URL not set — push skipped. Set it in eas.json and rebuild.");
    return;
  }

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.warn("[notifications] sendPush: no session token — skipping");
      return;
    }

    // Timeout after 10 seconds so a dead API URL fails fast instead of hanging
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(`${PUSH_API_URL}/api/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ userId, title, body, data, categoryIdentifier, channelId }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[notifications] sendPush server error ${res.status}: ${errText}`);
      return;
    }

    const json = await res.json().catch(() => null);
    console.log(`[notifications] sendPush ✓ sent=${json?.sent ?? "?"}/${json?.total ?? "?"}`);
  } catch (e: any) {
    if (e?.name === "AbortError") {
      console.warn(`[notifications] sendPush TIMEOUT — API URL unreachable: ${PUSH_API_URL}`);
    } else {
      console.warn("[notifications] sendPush failed:", (e as Error).message, "API_URL:", PUSH_API_URL);
    }
  }
}

// ── Create in-app notification record AND send push ────────────────────────
// This is the single source of truth — calling this always inserts a DB row
// AND sends a push notification (if the user has a registered token).
// The DB-level trigger (push_notification_trigger.sql) acts as a backup
// when the API server is unreachable.
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  data?: Record<string, any>,
  skipPush = false,
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

  // Also fire push notification so the user gets it on their device
  if (!skipPush) {
    const channelId =
      type === "booking_created"                       ? "new_booking"
      : type === "booking_accepted"
        || type === "booking_on_way"
        || type === "booking_started"
        || type === "booking_completed"
        || type === "booking_update"
        || type === "booking_cancelled"
        || type === "booking_rejected"                ? "booking_status"
      : type === "message" || type === "chat_message" ? "chat"
      : type === "payment"
        || type === "payment_received"
        || type === "withdrawal"
        || type === "withdrawal_approved"             ? "payment"
      : type === "review_received" || type === "review_request" ? "default"
      : type === "refund_requested"
        || type === "refund_approved"
        || type === "refund_rejected"
        || type === "refund_result"                   ? "payment"
      : type === "offer"  || type === "promo"         ? "promotions"
      : "default";
    // Embed type in data so InAppBanner + deep-link handler can read it
    await sendPushNotification(userId, title, body, { ...(data ?? {}), type }, type, channelId);
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
        console.warn("[notifications] notifyProviders: no session token — skipping");
        return;
      }
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10_000);
        const res = await fetch(`${PUSH_API_URL}/api/push/batch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            userIds: providerIds,
            title,
            body,
            // isProvider: true ensures cold-start / background tap routes to
            // provider dashboard, not the user-facing tracking screen.
            data: { ...(data ?? {}), isProvider: true },
            categoryIdentifier: "new_booking",
            channelId: "new_booking",
            ...(bookingId ? { bookingId } : {}),
          }),
          signal: controller.signal,
        }).finally(() => clearTimeout(timer));
        const json = await res?.json().catch(() => null);
        console.log(`[notifications] notifyProviders batch ✓ sent=${json?.sent ?? "?"}/${json?.total ?? "?"}`);
      } catch (e: any) {
        if (e?.name === "AbortError") {
          console.warn(`[notifications] notifyProviders TIMEOUT — API URL unreachable: ${PUSH_API_URL}`);
        } else {
          console.warn("[notifications] notifyProviders batch failed:", (e as Error).message);
        }
      }
    } else {
      console.warn("[notifications] notifyAvailableProviders: EXPO_PUBLIC_API_URL not set — push skipped. Set it in eas.json and rebuild.");
    }

    // Save in-app notification records for all providers (skip push — batch already handled it)
    // isProvider: true ensures deep-link routes to provider dashboard, not user tracking
    Promise.all(
      providerIds.map((id: string) =>
        createNotification(id, "booking_created", title, body, { ...(data ?? {}), isProvider: true }, true),
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

// ── Schedule a local reminder before a booking ────────────────────────────
// Schedules a device-local notification X minutes before scheduled_at.
// Call this when a scheduled (non-instant) booking is confirmed.
// Safe to call for instant bookings — if triggerDate is in the past, no-op.
export async function scheduleBookingReminder(
  scheduledAt: string,
  title: string,
  body: string,
  data?: Record<string, any>,
  minutesBefore = 30,
): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const triggerDate = new Date(new Date(scheduledAt).getTime() - minutesBefore * 60 * 1000);
    if (triggerDate <= new Date()) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { ...(data ?? {}), type: "booking_update" },
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      } as any,
    });
    console.log(`[notifications] reminder scheduled for ${triggerDate.toISOString()}`);
  } catch (e) {
    console.log("[notifications] scheduleBookingReminder failed:", (e as Error).message);
  }
}
