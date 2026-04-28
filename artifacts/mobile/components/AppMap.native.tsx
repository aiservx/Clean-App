import React from "react";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { StyleSheet, View } from "react-native";

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

export default function AppMap({ region, style, markers, polyline, scrollEnabled = true, zoomEnabled = true, pointerEvents }: Props) {
  return (
    <View style={[styles.wrap, style]} pointerEvents={pointerEvents}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        scrollEnabled={scrollEnabled}
        zoomEnabled={zoomEnabled}
      >
        {polyline && polyline.coordinates.length > 1 ? (
          <Polyline coordinates={polyline.coordinates} strokeColor={polyline.color ?? "#10B981"} strokeWidth={polyline.width ?? 4} />
        ) : null}
        {markers?.map((m) => (
          <Marker key={m.id} coordinate={m.coordinate} pinColor={m.color ?? "#3B82F6"} title={m.title} />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden" },
});
