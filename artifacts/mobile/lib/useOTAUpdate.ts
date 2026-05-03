import { useEffect, useRef, useState } from "react";
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

export type OTAStatus =
  | "idle"
  | "checking"
  | "downloading"
  | "ready"
  | "error"
  | "no_update";

export function useOTAUpdate() {
  const [status, setStatus] = useState<OTAStatus>("idle");
  const checked = useRef(false);

  useEffect(() => {
    if (!Updates || checked.current) return;
    // Only run in production-like environments (not Expo Go dev client)
    if (__DEV__) return;

    checked.current = true;
    checkAndApply();
  }, []);

  return { status };
}

async function checkAndApply() {
  if (!Updates) return;
  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return;

    await Updates.fetchUpdateAsync();

    Alert.alert(
      "تحديث جديد متاح 🎉",
      "تم تنزيل تحديث جديد لتطبيق نظافة. أعد تشغيل التطبيق للحصول على أحدث الميزات والإصلاحات.",
      [
        { text: "لاحقاً", style: "cancel" },
        {
          text: "إعادة التشغيل الآن",
          onPress: () => Updates?.reloadAsync().catch(() => {}),
        },
      ],
      { cancelable: false }
    );
  } catch {
    // Silently ignore update errors — never crash the app over OTA
  }
}
