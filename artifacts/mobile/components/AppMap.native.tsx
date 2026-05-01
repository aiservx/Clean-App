import React, { useRef, useEffect } from "react";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, Callout } from "react-native-maps";
import { StyleSheet, View, Image, Text } from "react-native";

export type LatLng = { latitude: number; longitude: number };

export type MapMarker = {
  id: string;
  coordinate: LatLng;
  color?: string;
  title?: string;
  avatarUrl?: string | null;
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
};

export default function AppMap({ region, style, markers, polyline, scrollEnabled = true, zoomEnabled = true, pointerEvents, onMarkerPress }: Props) {
  const mapRef = useRef<MapView>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mapRef.current?.animateToRegion(region, 600);
  }, [region.latitude, region.longitude]);

  return (
    <View style={[styles.wrap, style]} pointerEvents={pointerEvents}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        scrollEnabled={scrollEnabled}
        zoomEnabled={zoomEnabled}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {polyline && polyline.coordinates.length > 1 ? (
          <Polyline coordinates={polyline.coordinates} strokeColor={polyline.color ?? "#10B981"} strokeWidth={polyline.width ?? 4} />
        ) : null}
        {markers?.map((m) => (
          <Marker
            key={m.id}
            coordinate={m.coordinate}
            pinColor={m.avatarUrl ? undefined : (m.color ?? "#3B82F6")}
            title={m.title}
            onPress={() => onMarkerPress?.(m.id)}
          >
            {m.avatarUrl ? (
              <View style={[styles.avatarMarker, { borderColor: m.color ?? "#3B82F6" }]}>
                <Image source={{ uri: m.avatarUrl }} style={styles.avatarImg} />
              </View>
            ) : null}
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden" },
  avatarMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 17,
  },
});
