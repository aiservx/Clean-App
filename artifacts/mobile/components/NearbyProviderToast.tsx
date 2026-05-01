import React, { useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export type ToastProvider = {
  id: string;
  name: string;
  distanceKm: number;
};

type Props = {
  provider: ToastProvider | null;
  onDismiss: () => void;
  onPress?: () => void;
};

export default function NearbyProviderToast({ provider, onDismiss, onPress }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const slideY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!provider) return;

    Animated.parallel([
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      dismiss();
    }, 4500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [provider?.id]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideY, {
        toValue: -120,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  if (!provider) return null;

  const distText =
    provider.distanceKm < 1
      ? `${Math.round(provider.distanceKm * 1000)} م`
      : `${provider.distanceKm.toFixed(1)} كم`;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 8,
          backgroundColor: colors.card,
          shadowColor: colors.primary,
          transform: [{ translateY: slideY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.92}
        style={styles.inner}
        onPress={() => {
          dismiss();
          onPress?.();
        }}
      >
        <TouchableOpacity onPress={dismiss} style={styles.closeBtn} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Feather name="x" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>

        <MaterialCommunityIcons name="account-tie-outline" size={28} color={colors.primary} style={styles.icon} />

        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          مزود قريب منك 📍
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]} numberOfLines={1}>
          {provider.name} على بعد {distText} منك الآن
        </Text>

        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.primaryLight }]}
          onPress={() => {
            dismiss();
            onPress?.();
          }}
        >
          <Text style={[styles.ctaText, { color: colors.primary }]}>عرض</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 100,
  },
  inner: {
    padding: 14,
    paddingRight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "nowrap",
  },
  closeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
  },
  icon: {
    flexShrink: 0,
  },
  title: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 13,
    flexShrink: 1,
  },
  sub: {
    fontFamily: "Tajawal_500Medium",
    fontSize: 11,
    flex: 1,
  },
  cta: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    flexShrink: 0,
  },
  ctaText: {
    fontFamily: "Tajawal_700Bold",
    fontSize: 12,
  },
});
