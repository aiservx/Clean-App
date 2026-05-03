import { useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";

// expo-updates is a native module — guard against web/simulator gracefully
let Updates: typeof import("expo-updates") | null = null;
try {
  if (Platform.OS !== "web") {
    Updates = require("expo-updates");
  }
} catch {
  Updates = null;
}

type OTAConfig = {
  force_update?: boolean;
  update_message?: string;
};

const DEFAULT_MESSAGE =
  "تم تنزيل تحديث جديد لتطبيق نظافة. أعد تشغيل التطبيق للحصول على أحدث الميزات.";

export function useOTAUpdate() {
  const checked = useRef(false);

  useEffect(() => {
    if (!Updates || checked.current) return;
    if (__DEV__) return;

    checked.current = true;
    checkAndApply();
  }, []);
}

async function fetchOTAConfig(): Promise<OTAConfig> {
  try {
    // Lazy-import supabase to avoid circular dependency
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "ota_config")
      .maybeSingle();
    return (data?.value as OTAConfig) ?? {};
  } catch {
    return {};
  }
}

async function checkAndApply() {
  if (!Updates) return;
  try {
    const [updateResult, config] = await Promise.all([
      Updates.checkForUpdateAsync(),
      fetchOTAConfig(),
    ]);

    if (!updateResult.isAvailable) return;

    await Updates.fetchUpdateAsync();

    const message = config.update_message || DEFAULT_MESSAGE;
    const forceUpdate = config.force_update === true;

    if (forceUpdate) {
      // Blocking alert — no "لاحقاً" option
      Alert.alert(
        "تحديث إجباري 🔔",
        message,
        [
          {
            text: "تحديث الآن",
            onPress: () => Updates?.reloadAsync().catch(() => {}),
          },
        ],
        { cancelable: false }
      );
    } else {
      Alert.alert(
        "تحديث جديد متاح 🎉",
        message,
        [
          { text: "لاحقاً", style: "cancel" },
          {
            text: "إعادة التشغيل الآن",
            onPress: () => Updates?.reloadAsync().catch(() => {}),
          },
        ],
        { cancelable: false }
      );
    }
  } catch {
    // Never crash the app over OTA errors
  }
}
