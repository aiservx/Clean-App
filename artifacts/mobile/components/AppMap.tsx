import React from "react";
import { View, StyleSheet, Platform } from "react-native";

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

function deltaToZoom(delta: number) {
  if (delta <= 0.005) return 16;
  if (delta <= 0.01) return 15;
  if (delta <= 0.02) return 14;
  if (delta <= 0.05) return 13;
  if (delta <= 0.1) return 12;
  if (delta <= 0.25) return 11;
  return 10;
}

function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

function tileToLatLng(tx: number, ty: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const lng = (tx / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / n)));
  const lat = (latRad * 180) / Math.PI;
  return { lat, lng };
}

const TILE_SIZE = 256;
const c = React.createElement as any;

type WebMapProps = Props;

function WebMap({ region, style, markers, polyline, scrollEnabled = true, zoomEnabled = true, onMarkerPress }: WebMapProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [size, setSize] = React.useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = React.useState(() => deltaToZoom(region.latitudeDelta));
  const [center, setCenter] = React.useState(() => ({ lat: region.latitude, lng: region.longitude }));
  const dragState = React.useRef<{ active: boolean; startX: number; startY: number; startLat: number; startLng: number } | null>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    };
    update();
    const ro = new (window as any).ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    setCenter({ lat: region.latitude, lng: region.longitude });
    setZoom(deltaToZoom(region.latitudeDelta));
  }, [region.latitude, region.longitude, region.latitudeDelta]);

  const flatten = (s: any): any => {
    if (!s) return {};
    if (Array.isArray(s)) return s.reduce((acc, cur) => ({ ...acc, ...flatten(cur) }), {});
    return s;
  };
  const flatStyle = flatten(style);

  const centerTile = latLngToTile(center.lat, center.lng, zoom);
  const tilesX = size ? Math.ceil(size.w / TILE_SIZE) + 2 : 4;
  const tilesY = size ? Math.ceil(size.h / TILE_SIZE) + 2 : 3;
  const halfX = Math.floor(tilesX / 2);
  const halfY = Math.floor(tilesY / 2);
  const centerTileX = Math.floor(centerTile.x);
  const centerTileY = Math.floor(centerTile.y);
  const offsetXInCenterTile = (centerTile.x - centerTileX) * TILE_SIZE;
  const offsetYInCenterTile = (centerTile.y - centerTileY) * TILE_SIZE;
  const containerW = size?.w ?? 0;
  const containerH = size?.h ?? 0;

  const tiles: any[] = [];
  if (size) {
    const n = Math.pow(2, zoom);
    for (let dx = -halfX; dx <= halfX; dx++) {
      for (let dy = -halfY; dy <= halfY; dy++) {
        const tx = centerTileX + dx;
        const ty = centerTileY + dy;
        if (ty < 0 || ty >= n) continue;
        const wrappedX = ((tx % n) + n) % n;
        const left = containerW / 2 - offsetXInCenterTile + dx * TILE_SIZE;
        const top = containerH / 2 - offsetYInCenterTile + dy * TILE_SIZE;
        tiles.push(
          c("img", {
            key: `${zoom}-${tx}-${ty}`,
            src: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${ty}.png`,
            alt: "",
            crossOrigin: "anonymous",
            style: {
              position: "absolute",
              left,
              top,
              width: TILE_SIZE,
              height: TILE_SIZE,
              userSelect: "none",
              pointerEvents: "none",
              draggable: false,
            },
          }),
        );
      }
    }
  }

  const llToPixel = (coord: LatLng) => {
    const t = latLngToTile(coord.latitude, coord.longitude, zoom);
    const px = containerW / 2 + (t.x - centerTile.x) * TILE_SIZE;
    const py = containerH / 2 + (t.y - centerTile.y) * TILE_SIZE;
    return { px, py };
  };

  const polylineEl =
    polyline && polyline.coordinates.length >= 2 && size
      ? c(
          "svg",
          {
            style: {
              position: "absolute",
              top: 0,
              start: 0,
              width: containerW,
              height: containerH,
              pointerEvents: "none",
            },
          },
          c("polyline", {
            points: polyline.coordinates
              .map((coord) => {
                const p = llToPixel(coord);
                return `${p.px.toFixed(1)},${p.py.toFixed(1)}`;
              })
              .join(" "),
            fill: "none",
            stroke: polyline.color ?? "#3B82F6",
            strokeWidth: polyline.width ?? 4,
            strokeLinecap: "round",
            strokeLinejoin: "round",
          }),
        )
      : null;

  const markerEls = (markers ?? []).map((m) => {
    if (!size) return null;
    const p = llToPixel(m.coordinate);
    const color = m.color ?? "#3B82F6";
    const hasAvatar = !!m.avatarUrl;
    const sz = hasAvatar ? 36 : 18;
    const half = sz / 2;
    return c("div", {
      key: m.id,
      onClick: onMarkerPress ? (e: any) => { e.stopPropagation(); onMarkerPress(m.id); } : undefined,
      style: {
        position: "absolute",
        left: p.px - half,
        top: p.py - half,
        width: sz,
        height: sz,
        borderRadius: half,
        background: hasAvatar ? "transparent" : color,
        border: `3px solid ${color}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        overflow: "hidden",
        cursor: onMarkerPress ? "pointer" : "default",
        pointerEvents: onMarkerPress ? "auto" : "none",
      },
    }, hasAvatar
      ? c("img", { src: m.avatarUrl, alt: "", style: { width: "100%", height: "100%", objectFit: "cover", borderRadius: half } })
      : null,
    );
  });

  const getClientXY = (e: any) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const onPointerDown = scrollEnabled ? (e: any) => {
    const { x, y } = getClientXY(e);
    dragState.current = { active: true, startX: x, startY: y, startLat: center.lat, startLng: center.lng };
    e.preventDefault?.();
  } : undefined;

  const onPointerMove = scrollEnabled ? (e: any) => {
    if (!dragState.current?.active || !size) return;
    const { x, y } = getClientXY(e);
    const dx = x - dragState.current.startX;
    const dy = y - dragState.current.startY;
    const startTile = latLngToTile(dragState.current.startLat, dragState.current.startLng, zoom);
    const newTileX = startTile.x - dx / TILE_SIZE;
    const newTileY = startTile.y - dy / TILE_SIZE;
    const { lat, lng } = tileToLatLng(newTileX, newTileY, zoom);
    setCenter({ lat: Math.max(-85, Math.min(85, lat)), lng });
    e.preventDefault?.();
  } : undefined;

  const onPointerUp = scrollEnabled ? () => {
    if (dragState.current) dragState.current.active = false;
  } : undefined;

  const onWheel = zoomEnabled ? (e: any) => {
    e.preventDefault?.();
    setZoom((z) => {
      const delta = e.deltaY > 0 ? -1 : 1;
      return Math.max(2, Math.min(19, z + delta));
    });
  } : undefined;

  return c(
    "div",
    {
      ref: containerRef,
      onMouseDown: onPointerDown,
      onMouseMove: onPointerMove,
      onMouseUp: onPointerUp,
      onMouseLeave: onPointerUp,
      onTouchStart: onPointerDown,
      onTouchMove: onPointerMove,
      onTouchEnd: onPointerUp,
      onWheel,
      style: {
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#E8F0F5",
        cursor: scrollEnabled ? "grab" : "default",
        ...flatStyle,
      },
    },
    ...tiles,
    polylineEl,
    ...markerEls,
  );
}

export default function AppMap(props: Props) {
  if (Platform.OS === "web") {
    return <WebMap {...props} />;
  }
  return (
    <View style={[styles.wrap, props.style]}>
      <View style={StyleSheet.absoluteFillObject} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: "#E8F0F5" },
});
