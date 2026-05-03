import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { Feather } from "@expo/vector-icons";

export type LatLng = { latitude: number; longitude: number };

export type MapMarker = {
  id: string;
  coordinate: LatLng;
  color?: string;
  title?: string;
  avatarUrl?: string | null;
  animated?: boolean;
};

type Props = {
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  style?: any;
  markers?: MapMarker[];
  polyline?: { coordinates: LatLng[]; color?: string; width?: number };
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  pointerEvents?: any;
  onMarkerPress?: (id: string) => void;
  animateTrigger?: number;
};

export default function AppMap({ style, markers, pointerEvents }: Props) {
  return (
    <View style={[styles.container, style]} pointerEvents={pointerEvents}>
      <View style={styles.grid}>
        {Array.from({ length: 40 }).map((_, i) => (
          <View key={i} style={styles.cell} />
        ))}
      </View>
      <View style={styles.centerPin}>
        <Feather name="map-pin" size={28} color="#16C47F" />
      </View>
      {markers?.map((m) => (
        <View
          key={m.id}
          style={[
            styles.markerDot,
            { backgroundColor: m.color ?? "#3B82F6" },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#E8F4EA",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    flexWrap: "wrap",
    opacity: 0.25,
  },
  cell: {
    width: "10%",
    height: 40,
    borderWidth: 0.5,
    borderColor: "#16C47F",
  },
  centerPin: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  markerDot: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 3,
  },
});
