import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const replitDomain = process.env.REPLIT_DEV_DOMAIN;
  const origin = replitDomain ? `https://${replitDomain}` : "https://replit.com/";

  return {
    ...config,
    name: "SERVX - Home Services",
    slug: "mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon-light.png",
    scheme: "mobile",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/icon-light.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.cleanbeaton.nathafa",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "نحتاج الإذن بموقعك لإيجاد مزودي الخدمة القريبين منك",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "نحتاج الإذن بموقعك لتتبع مقدم الخدمة في الوقت الفعلي",
      },
    },
    android: {
      package: "com.cleanbeaton.nathafa",
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon-light.png",
        backgroundColor: "#7C3AED",
      },
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
      ],
    },
    web: {
      favicon: "./assets/images/icon-light.png",
    },
    plugins: [
      ["expo-router", { origin }],
      "expo-font",
      "expo-web-browser",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "السماح للتطبيق باستخدام موقعك لإيجاد أقرب مزودي الخدمة.",
        },
      ],
      [
        "expo-notifications",
        { icon: "./assets/images/icon-light.png", color: "#7C3AED" },
      ],
    ],
    experiments: {
      typedRoutes: true,
      // reactCompiler off for Expo Go — it occasionally causes runtime hangs
      // on the JS bundle on real Android devices.
      reactCompiler: false,
    },
    extra: {
      ...(config.extra ?? {}),
      eas: {
        projectId: "dd03c810-2182-47e7-9a0a-823fdcc351b8",
      },
    },
    owner: "clean-beaton",
  };
};
