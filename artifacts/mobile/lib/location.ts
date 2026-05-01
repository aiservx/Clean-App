import * as Location from "expo-location";
import { Platform } from "react-native";

export type ResolvedAddress = {
  lat: number;
  lng: number;
  street: string | null;
  district: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  formatted: string;
};

export async function ensurePermission(): Promise<boolean> {
  try {
    const { status: existing } = await Location.getForegroundPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

async function reverseGeocode(latitude: number, longitude: number) {
  let street: string | null = null;
  let district: string | null = null;
  let city: string | null = null;
  let region: string | null = null;
  let country: string | null = null;

  if (Platform.OS !== "web") {
    try {
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      const p = places[0];
      if (p) {
        street = p.street || (p as any).name || null;
        district = (p as any).district || p.subregion || null;
        city = p.city || null;
        region = p.region || null;
        country = p.country || null;
      }
    } catch {}
  } else {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ar`,
        { headers: { "User-Agent": "NazafahApp/1.0" } }
      );
      const j: any = await r.json();
      const a = j.address || {};
      street = a.road || a.pedestrian || null;
      district = a.suburb || a.neighbourhood || a.quarter || null;
      city = a.city || a.town || a.village || null;
      region = a.state || null;
      country = a.country || null;
    } catch {}
  }

  return { street, district, city, region, country };
}

function buildResult(latitude: number, longitude: number, geo: { street: string | null; district: string | null; city: string | null; region: string | null; country: string | null }): ResolvedAddress {
  const parts = [geo.street, geo.district, geo.city, geo.region].filter(Boolean);
  return {
    lat: latitude,
    lng: longitude,
    ...geo,
    formatted: parts.join("، ") || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
  };
}

export async function getCurrentResolved(
  onQuickResult?: (r: ResolvedAddress) => void
): Promise<ResolvedAddress | null> {
  const ok = await ensurePermission();
  if (!ok) return null;

  try {
    if (onQuickResult) {
      Location.getLastKnownPositionAsync().then(async (last) => {
        if (!last) return;
        const { latitude, longitude } = last.coords;
        const geo = await reverseGeocode(latitude, longitude);
        onQuickResult(buildResult(latitude, longitude, geo));
      }).catch(() => {});
    }

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = pos.coords;
    const geo = await reverseGeocode(latitude, longitude);
    return buildResult(latitude, longitude, geo);
  } catch {
    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        const { latitude, longitude } = last.coords;
        const geo = await reverseGeocode(latitude, longitude);
        return buildResult(latitude, longitude, geo);
      }
    } catch {}
    return null;
  }
}

export async function watchLocation(cb: (lat: number, lng: number) => void) {
  const ok = await ensurePermission();
  if (!ok) return null;
  return Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, distanceInterval: 25, timeInterval: 5000 },
    (pos) => cb(pos.coords.latitude, pos.coords.longitude)
  );
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
