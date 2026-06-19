import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, I18nManager } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/lib/i18n";

const TUTORIAL_URL =
  process.env.EXPO_PUBLIC_TUTORIAL_VIDEO_URL ||
  "https://c2acae83-5053-4586-a962-500e80027854-00-2yxbwa5l5z3xw.kirk.replit.dev:8081/__mockup/preview/TutorialVideo";

export default function TutorialVideoScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const rowDir = I18nManager.isRTL ? ("row" as const) : ("row-reverse" as const);

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8, flexDirection: rowDir }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.backBtn, { backgroundColor: colors.card }]}>
          <Feather name={I18nManager.isRTL ? "arrow-right" : "arrow-left"} size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.foreground }]}>{t("tutorial_video_title")}</Text>
        <TouchableOpacity
          onPress={() => webViewRef.current?.reload()}
          style={[s.backBtn, { backgroundColor: colors.card }]}
        >
          <Feather name="refresh-cw" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* WebView */}
      <View style={s.webContainer}>
        {loading && !error && (
          <View style={[s.loadingOverlay, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color="#16C47F" />
            <Text style={[s.loadingText, { color: colors.mutedForeground }]}>
              {I18nManager.isRTL ? "جارٍ تحميل الفيديو..." : "Loading video..."}
            </Text>
          </View>
        )}

        {error ? (
          <View style={[s.errorContainer, { backgroundColor: colors.background }]}>
            <Feather name="wifi-off" size={48} color={colors.mutedForeground} />
            <Text style={[s.errorTitle, { color: colors.foreground }]}>
              {I18nManager.isRTL ? "تعذّر تحميل الفيديو" : "Could not load video"}
            </Text>
            <Text style={[s.errorSub, { color: colors.mutedForeground }]}>
              {I18nManager.isRTL ? "تحقق من الاتصال وأعد المحاولة" : "Check your connection and try again"}
            </Text>
            <TouchableOpacity
              style={s.retryBtn}
              onPress={() => { setError(false); setLoading(true); webViewRef.current?.reload(); }}
            >
              <Text style={s.retryBtnText}>
                {I18nManager.isRTL ? "إعادة المحاولة" : "Retry"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri: TUTORIAL_URL }}
            style={s.webView}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => { setError(true); setLoading(false); }}
            onHttpError={() => { setError(true); setLoading(false); }}
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={["*"]}
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 18,
    flex: 1,
    textAlign: "center",
  },
  webContainer: { flex: 1, position: "relative" },
  webView: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    zIndex: 10,
  },
  loadingText: { fontFamily: "Tajawal_500Medium", fontSize: 14 },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  errorTitle: { fontFamily: "Tajawal_700Bold", fontSize: 18, textAlign: "center" },
  errorSub: { fontFamily: "Tajawal_400Regular", fontSize: 14, textAlign: "center" },
  retryBtn: {
    marginTop: 8,
    backgroundColor: "#16C47F",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 18,
  },
  retryBtnText: { fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#FFF" },
});
