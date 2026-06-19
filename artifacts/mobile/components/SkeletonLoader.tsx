import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle, I18nManager } from "react-native";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({ width = "100%", height = 16, borderRadius = 8, style }: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: "#E2E8F0", opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[sk.card, style]}>
      <View style={sk.cardRow}>
        <SkeletonBox width={52} height={52} borderRadius={14} />
        <View style={sk.cardLines}>
          <SkeletonBox width="60%" height={14} borderRadius={7} style={{ marginBottom: 8 }} />
          <SkeletonBox width="40%" height={11} borderRadius={6} />
        </View>
      </View>
      <SkeletonBox width="100%" height={11} borderRadius={6} style={{ marginTop: 12 }} />
      <SkeletonBox width="75%" height={11} borderRadius={6} style={{ marginTop: 8 }} />
    </View>
  );
}

export function SkeletonProviderCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[sk.providerCard, style]}>
      <SkeletonBox width={70} height={70} borderRadius={20} style={{ alignSelf: "center", marginBottom: 10 }} />
      <SkeletonBox width="80%" height={12} borderRadius={6} style={{ alignSelf: "center", marginBottom: 6 }} />
      <SkeletonBox width="50%" height={10} borderRadius={5} style={{ alignSelf: "center", marginBottom: 8 }} />
      <SkeletonBox width="60%" height={28} borderRadius={14} style={{ alignSelf: "center" }} />
    </View>
  );
}

export function SkeletonBookingCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[sk.bookingCard, style]}>
      <View style={{ flexDirection: I18nManager.isRTL ? "row" : "row-reverse", gap: 12, marginBottom: 12 }}>
        <SkeletonBox width={44} height={44} borderRadius={14} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBox width="55%" height={13} borderRadius={7} />
          <SkeletonBox width="35%" height={10} borderRadius={6} />
        </View>
        <SkeletonBox width={70} height={26} borderRadius={13} />
      </View>
      <SkeletonBox width="100%" height={1} borderRadius={1} style={{ marginBottom: 12, opacity: 0.3 }} />
      <View style={{ flexDirection: I18nManager.isRTL ? "row" : "row-reverse", justifyContent: "space-between" }}>
        <SkeletonBox width="30%" height={10} borderRadius={5} />
        <SkeletonBox width="25%" height={10} borderRadius={5} />
        <SkeletonBox width="20%" height={10} borderRadius={5} />
      </View>
    </View>
  );
}

export function SkeletonServiceCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[sk.serviceCard, style]}>
      <SkeletonBox width="100%" height={90} borderRadius={16} style={{ marginBottom: 8 }} />
      <SkeletonBox width="70%" height={12} borderRadius={6} style={{ alignSelf: "center" }} />
    </View>
  );
}

export function SkeletonProfileHeader() {
  return (
    <View style={sk.profileHeader}>
      <SkeletonBox width={90} height={90} borderRadius={45} />
      <View style={{ flex: 1, marginStart: 16, gap: 8 }}>
        <SkeletonBox width="60%" height={16} borderRadius={8} />
        <SkeletonBox width="45%" height={12} borderRadius={6} />
        <SkeletonBox width="35%" height={12} borderRadius={6} />
      </View>
    </View>
  );
}

const sk = StyleSheet.create({
  card: {
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: I18nManager.isRTL ? "row" : "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  cardLines: {
    flex: 1,
  },
  providerCard: {
    width: 140,
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 14,
    marginEnd: 10,
  },
  bookingCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  serviceCard: {
    width: 110,
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 12,
    marginEnd: 10,
  },
  profileHeader: {
    flexDirection: I18nManager.isRTL ? "row" : "row-reverse",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
});
