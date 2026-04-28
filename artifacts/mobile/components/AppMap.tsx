import React from "react";
import { View, StyleSheet, Image } from "react-native";

export type LatLng = { latitude: number; longitude: number };

type Props = {
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  style?: any;
  markers?: Array<{ id: string; coordinate: LatLng; color?: string; title?: string }>;
  polyline?: { coordinates: LatLng[]; color?: string; width?: number };
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  pointerEvents?: any;
};

// Web fallback: render a styled placeholder that resembles a map tile.
export default function AppMap({ style, polyline }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.bg}>
        {/* Subtle grid pattern */}
        <View style={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={`h${i}`} style={[styles.gridLine, { top: `${(i + 1) * 11}%`, width: "100%", height: 1 }]} />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={`v${i}`} style={[styles.gridLine, { left: `${(i + 1) * 11}%`, width: 1, height: "100%" }]} />
          ))}
        </View>
        {polyline && polyline.coordinates.length > 1 ? (
          <View style={[styles.path, { backgroundColor: polyline.color ?? "#10B981" }]} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: "#E8F0F5" },
  bg: { ...StyleSheet.absoluteFillObject, backgroundColor: "#E8F0F5" },
  grid: { ...StyleSheet.absoluteFillObject, opacity: 0.4 },
  gridLine: { position: "absolute", backgroundColor: "#C7D5E0" },
  path: {
    position: "absolute",
    top: "50%",
    left: "20%",
    right: "20%",
    height: 4,
    borderRadius: 2,
    transform: [{ rotate: "-12deg" }],
  },
});
