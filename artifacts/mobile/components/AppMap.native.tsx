import React, { useRef, useEffect, Component } from "react";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, AnimatedRegion } from "react-native-maps";
import { StyleSheet, View, Image, Animated } from "react-native";

// ── Map ErrorBoundary: catches any render error from MapView ───────────────
class MapErrorBoundary extends Component<
  { children: React.ReactNode; style?: any },
  { crashed: boolean }
> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  render() {
    if (this.state.crashed) {
      return (
        <View style={[this.props.style, styles.mapFallback]}>
          <View style={styles.mapFallbackInner} />
        </View>
      );
    }
    return this.props.children;
  }
}

export type LatLng = { latitude: number; longitude: number };

export type MapMarker = {
  id: string;
  coordinate: LatLng;
  color?: string;
  title?: string;
  avatarUrl?: string | null;
  /** If true, animates smoothly when coordinate changes (for live tracking) */
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
  /** Increment this number to force the map to animate to `region` even if lat/lng didn't change */
  animateTrigger?: number;
};

// ── Animated marker that smoothly moves to new coordinates ─────────────────
function AnimatedMarker({
  marker,
  onPress,
}: {
  marker: MapMarker;
  onPress?: (id: string) => void;
}) {
  const animCoord = useRef(
    new AnimatedRegion({
      latitude: marker.coordinate.latitude,
      longitude: marker.coordinate.longitude,
      latitudeDelta: 0,
      longitudeDelta: 0,
    }),
  ).current;

  const markerRef = useRef<any>(null);

  useEffect(() => {
    // Animate to the new coordinate using the native driver for smoothness
    if (markerRef.current?.animateMarkerToCoordinate) {
      markerRef.current.animateMarkerToCoordinate(marker.coordinate, 600);
    } else {
      (animCoord as any)
        .timing({
          latitude: marker.coordinate.latitude,
          longitude: marker.coordinate.longitude,
          latitudeDelta: 0,
          longitudeDelta: 0,
          duration: 600,
          useNativeDriver: false,
        })
        .start();
    }
  }, [marker.coordinate.latitude, marker.coordinate.longitude]);

  return (
    <Marker.Animated
      ref={markerRef}
      coordinate={animCoord as any}
      pinColor={marker.avatarUrl ? undefined : (marker.color ?? "#10B981")}
      title={marker.title}
      onPress={() => onPress?.(marker.id)}
    >
      {marker.avatarUrl ? (
        <View style={[styles.avatarMarker, { borderColor: marker.color ?? "#10B981" }]}>
          <Image source={{ uri: marker.avatarUrl }} style={styles.avatarImg} />
        </View>
      ) : (
        <View style={styles.providerDot}>
          <View style={[styles.providerDotInner, { backgroundColor: marker.color ?? "#10B981" }]} />
          {/* Pulse ring */}
          <View style={[styles.pulseRing, { borderColor: (marker.color ?? "#10B981") + "50" }]} />
        </View>
      )}
    </Marker.Animated>
  );
}

// ── Static marker ──────────────────────────────────────────────────────────
function StaticMarker({
  marker,
  onPress,
}: {
  marker: MapMarker;
  onPress?: (id: string) => void;
}) {
  return (
    <Marker
      coordinate={marker.coordinate}
      pinColor={marker.avatarUrl ? undefined : (marker.color ?? "#3B82F6")}
      title={marker.title}
      onPress={() => onPress?.(marker.id)}
    >
      {marker.avatarUrl ? (
        <View style={[styles.avatarMarker, { borderColor: marker.color ?? "#3B82F6" }]}>
          <Image source={{ uri: marker.avatarUrl }} style={styles.avatarImg} />
        </View>
      ) : null}
    </Marker>
  );
}

// ── Main AppMap ────────────────────────────────────────────────────────────
export default function AppMap({
  region,
  style,
  markers,
  polyline,
  scrollEnabled = true,
  zoomEnabled = true,
  pointerEvents,
  onMarkerPress,
  animateTrigger,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mapRef.current?.animateToRegion(region, 600);
  }, [region.latitude, region.longitude, animateTrigger]);

  return (
    <MapErrorBoundary style={[styles.wrap, style]}>
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
          {/* Route polyline */}
          {polyline && polyline.coordinates.length > 1 && (
            <Polyline
              coordinates={polyline.coordinates}
              strokeColor={polyline.color ?? "#10B981"}
              strokeWidth={polyline.width ?? 5}
              lineDashPattern={undefined}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {/* Markers */}
          {markers?.map((m) =>
            m.animated ? (
              <AnimatedMarker key={m.id} marker={m} onPress={onMarkerPress} />
            ) : (
              <StaticMarker key={m.id} marker={m} onPress={onMarkerPress} />
            ),
          )}
        </MapView>
      </View>
    </MapErrorBoundary>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden" },
  mapFallback: { backgroundColor: "#E8F5E9", alignItems: "center", justifyContent: "center" },
  mapFallbackInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#16C47F40" },
  avatarMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  avatarImg: { width: "100%", height: "100%", borderRadius: 19 },
  providerDot: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  providerDotInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  pulseRing: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
  },
});
