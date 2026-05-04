import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const replitDomain = process.env.REPLIT_DEV_DOMAIN;
  const origin = replitDomain ? `https://${replitDomain}:3002` : "https://replit.com/";

  return {
    ...config,
    name: "نظافة",
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
      bundleIdentifier: "com.aiservx.nazafa",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "نحتاج الإذن بموقعك لإيجاد مزودي الخدمة القريبين منك",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "نحتاج الإذن بموقعك لتتبع مقدم الخدمة في الوقت الفعلي",
      },
    },
    android: {
      package: "com.aiservx.nazafa",
      versionCode: 12,
      googleServicesFile: "./google-services.json",
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
        "POST_NOTIFICATIONS",
      ],
    },
    web: {
      favicon: "./assets/images/icon-light.png",
    },
    updates: {
      url: "https://u.expo.dev/09e4ce5c-f181-49b0-b379-68b832e1f292",
      fallbackToCacheTimeout: 0,
      checkAutomatically: "ON_LOAD",
      requestHeaders: {
        "expo-channel-name": "preview",
      },
    },
    runtimeVersion: {
      policy: "appVersion",
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
        {
          icon: "./assets/images/icon-light.png",
          color: "#7C3AED",
          sounds: [],
        },
      ],
      "expo-updates",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: false,
    },
    extra: {
      ...(config.extra ?? {}),
      eas: {
        projectId: "09e4ce5c-f181-49b0-b379-68b832e1f292",
      },
      router: {
        origin,
        headOrigin: origin,
      },
    },
    owner: "hadystow",
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore – Replit-specific extension field
    _replit: {
      allowedOrigins: replitDomain
        ? [
            `https://${replitDomain}`,
            `https://${replitDomain}:3002`,
            `https://${replitDomain}:3003`,
          ]
        : [],
    },
  };
};
