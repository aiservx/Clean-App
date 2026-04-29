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
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

export async function getCurrentResolved(): Promise<ResolvedAddress | null> {
  const ok = await ensurePermission();
  if (!ok) return null;
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = pos.coords;
    let street: string | null = null,
      district: string | null = null,
      city: string | null = null,
      region: string | null = null,
      country: string | null = null;

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
      // Web: use OSM Nominatim
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ar`
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

    const parts = [street, district, city, region].filter(Boolean);
    return {
      lat: latitude,
      lng: longitude,
      street,
      district,
      city,
      region,
      country,
      formatted: parts.join("، ") || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    };
  } catch {
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
