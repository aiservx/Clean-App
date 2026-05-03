import React from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

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
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  style?: any;
  markers?: MapMarker[];
  polyline?: { coordinates: LatLng[]; color?: string; width?: number };
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  pointerEvents?: any;
  onMarkerPress?: (id: string) => void;
  animateTrigger?: number;
};

export default function AppMap({
  region,
  style,
  markers = [],
  polyline,
  scrollEnabled = true,
  zoomEnabled = true,
  pointerEvents,
  onMarkerPress,
}: Props) {
  const markersJson = JSON.stringify(
    markers.map((m) => ({
      id: m.id,
      lat: m.coordinate.latitude,
      lng: m.coordinate.longitude,
      color: m.color ?? "#16C47F",
      title: m.title ?? "",
    }))
  );
  const polylineJson = polyline
    ? JSON.stringify(polyline.coordinates.map((c) => [c.latitude, c.longitude]))
    : "[]";
  const polylineColor = polyline?.color ?? "#3B82F6";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin=""/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html,body,#map { width:100%; height:100%; font-family:sans-serif; }
.leaflet-control-attribution { font-size:8px !important; }
</style>
</head>
<body>
<div id="map"></div>
<script>
try {
  var map = L.map('map', {
    dragging: ${scrollEnabled},
    scrollWheelZoom: false,
    doubleClickZoom: ${zoomEnabled},
    touchZoom: ${zoomEnabled},
    zoomControl: true,
    attributionControl: true,
  }).setView([${region.latitude}, ${region.longitude}], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  var markers = ${markersJson};
  markers.forEach(function(m) {
    var circle = L.circleMarker([m.lat, m.lng], {
      radius: 11,
      fillColor: m.color,
      color: '#ffffff',
      weight: 2.5,
      opacity: 1,
      fillOpacity: 1,
    }).addTo(map);
    if (m.title) circle.bindPopup('<b style="font-size:13px">' + m.title + '</b>');
    circle.on('click', function() {
      try { window.ReactNativeWebView.postMessage(JSON.stringify({type:'markerPress',id:m.id})); } catch(e){}
    });
  });

  var polyCoords = ${polylineJson};
  if (polyCoords.length > 1) {
    L.polyline(polyCoords, { color: '${polylineColor}', weight: 4, opacity: 0.85 }).addTo(map);
  }

  // User location dot (blue)
  var userDot = L.circleMarker([${region.latitude}, ${region.longitude}], {
    radius: 8,
    fillColor: '#3B82F6',
    color: '#ffffff',
    weight: 3,
    fillOpacity: 1,
  }).addTo(map);
  userDot.bindPopup('<b>موقعك</b>');
} catch(e) {
  document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#e8f4ea;flex-direction:column;gap:12px"><div style="font-size:36px">📍</div><div style="font-size:14px;color:#16C47F;font-weight:bold">الخريطة</div></div>';
}
</script>
</body>
</html>`;

  return (
    <View style={[styles.container, style]} pointerEvents={pointerEvents}>
      <WebView
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === "markerPress" && onMarkerPress) {
              onMarkerPress(msg.id);
            }
          } catch {}
        }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        startInLoadingState={false}
        onError={() => {}}
        onHttpError={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: "hidden" },
  webview: { flex: 1, backgroundColor: "#e8f4ea" },
});
