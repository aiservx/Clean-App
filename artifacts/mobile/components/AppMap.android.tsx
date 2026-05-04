import React, { useEffect, useRef } from "react";
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

function buildHtml(
  region: Props["region"],
  markers: MapMarker[],
  polyline: Props["polyline"],
  scrollEnabled: boolean,
  zoomEnabled: boolean,
): string {
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

  return `<!DOCTYPE html>
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
var map, userDot, markerMap = {}, polyLayer;
try {
  map = L.map('map', {
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

  var initialMarkers = ${markersJson};
  initialMarkers.forEach(function(m) {
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
    markerMap[m.id] = circle;
  });

  var polyCoords = ${polylineJson};
  if (polyCoords.length > 1) {
    polyLayer = L.polyline(polyCoords, { color: '${polylineColor}', weight: 4, opacity: 0.85 }).addTo(map);
  }

  userDot = L.circleMarker([${region.latitude}, ${region.longitude}], {
    radius: 8,
    fillColor: '#3B82F6',
    color: '#ffffff',
    weight: 3,
    fillOpacity: 1,
  }).addTo(map);
  userDot.bindPopup('<b>موقعك</b>');

  // Notify React Native that map is ready
  try { window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'})); } catch(e){}
} catch(e) {
  document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#e8f4ea;flex-direction:column;gap:12px"><div style="font-size:36px">📍</div><div style="font-size:14px;color:#16C47F;font-weight:bold">الخريطة</div></div>';
}
</script>
</body>
</html>`;
}

export default function AppMap({
  region,
  style,
  markers = [],
  polyline,
  scrollEnabled = true,
  zoomEnabled = true,
  pointerEvents,
  onMarkerPress,
  animateTrigger,
}: Props) {
  const webViewRef = useRef<any>(null);
  const isReady = useRef(false);
  const prevLat = useRef(region.latitude);
  const prevLng = useRef(region.longitude);
  const prevTrigger = useRef(animateTrigger);

  // Build HTML only once on mount
  const initialHtml = useRef(
    buildHtml(region, markers, polyline, scrollEnabled, zoomEnabled)
  ).current;

  // Fly map to new region when region or animateTrigger changes
  useEffect(() => {
    const latChanged = region.latitude !== prevLat.current;
    const lngChanged = region.longitude !== prevLng.current;
    const triggerChanged = animateTrigger !== prevTrigger.current;

    if (!isReady.current) {
      prevLat.current = region.latitude;
      prevLng.current = region.longitude;
      prevTrigger.current = animateTrigger;
      return;
    }

    if (latChanged || lngChanged || triggerChanged) {
      prevLat.current = region.latitude;
      prevLng.current = region.longitude;
      prevTrigger.current = animateTrigger;
      webViewRef.current?.injectJavaScript(`
        try {
          map.flyTo([${region.latitude}, ${region.longitude}], 14, { animate: true, duration: 0.8 });
          if (userDot) userDot.setLatLng([${region.latitude}, ${region.longitude}]);
        } catch(e) {}
        true;
      `);
    }
  }, [region.latitude, region.longitude, animateTrigger]);

  // Update markers dynamically without reloading WebView
  const markersKey = JSON.stringify(
    markers.map((m) => ({ id: m.id, lat: m.coordinate.latitude, lng: m.coordinate.longitude, color: m.color }))
  );
  useEffect(() => {
    if (!isReady.current) return;
    const markersJson = JSON.stringify(
      markers.map((m) => ({
        id: m.id,
        lat: m.coordinate.latitude,
        lng: m.coordinate.longitude,
        color: m.color ?? "#16C47F",
        title: m.title ?? "",
      }))
    );
    webViewRef.current?.injectJavaScript(`
      try {
        for (var _id in markerMap) { map.removeLayer(markerMap[_id]); }
        markerMap = {};
        var updatedMarkers = ${markersJson};
        updatedMarkers.forEach(function(m) {
          var circle = L.circleMarker([m.lat, m.lng], {
            radius: 11, fillColor: m.color, color: '#ffffff',
            weight: 2.5, opacity: 1, fillOpacity: 1,
          }).addTo(map);
          if (m.title) circle.bindPopup('<b style="font-size:13px">' + m.title + '</b>');
          circle.on('click', function() {
            try { window.ReactNativeWebView.postMessage(JSON.stringify({type:'markerPress',id:m.id})); } catch(e){}
          });
          markerMap[m.id] = circle;
        });
      } catch(e) {}
      true;
    `);
  }, [markersKey]);

  return (
    <View style={[styles.container, style]} pointerEvents={pointerEvents}>
      <WebView
        ref={webViewRef}
        source={{ html: initialHtml }}
        style={styles.webview}
        scrollEnabled={false}
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === "ready") {
              isReady.current = true;
            } else if (msg.type === "markerPress" && onMarkerPress) {
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
