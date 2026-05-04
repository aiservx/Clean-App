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

// Uses Nominatim (OpenStreetMap) for rich Arabic addresses including street names.
// Falls back to the native geocoder if Nominatim times out or fails.
async function reverseGeocode(latitude: number, longitude: number) {
  // 1) Try Nominatim first — gives detailed Arabic street names
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ar&addressdetails=1`,
      { headers: { "User-Agent": "NazafahApp/1.0" }, signal: controller.signal }
    );
    clearTimeout(timeout);
    const j: any = await r.json();
    const a = j.address || {};
    const street =
      a.road || a.pedestrian || a.footway || a.cycleway || a.path ||
      a.street || a.primary || a.secondary || null;
    const district =
      a.suburb || a.neighbourhood || a.quarter || a.residential ||
      a.city_district || null;
    const city =
      a.city || a.town || a.village || a.municipality || a.county || null;
    const region = a.state || null;
    const country = a.country || null;
    // Only accept Nominatim result if it gave us something useful
    if (city || street || district) {
      return { street, district, city, region, country };
    }
  } catch {}

  // 2) Fall back to native geocoder (available on iOS/Android)
  if (Platform.OS !== "web") {
    try {
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      const p = places[0];
      if (p) {
        return {
          street: p.street || (p as any).name || null,
          district: (p as any).district || p.subregion || null,
          city: p.city || null,
          region: p.region || null,
          country: p.country || null,
        };
      }
    } catch {}
  }

  return { street: null, district: null, city: null, region: null, country: null };
}

function buildResult(
  latitude: number,
  longitude: number,
  geo: { street: string | null; district: string | null; city: string | null; region: string | null; country: string | null }
): ResolvedAddress {
  // Full address: street → district → city (most specific → least specific)
  const parts = [geo.street, geo.district, geo.city].filter(Boolean);
  // Add region if city is missing
  if (!geo.city && geo.region) parts.push(geo.region);
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
