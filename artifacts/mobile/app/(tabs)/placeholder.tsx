import { Redirect } from "expo-router";

// This route exists only to reserve a slot in the bottom tab bar for the
// floating "احجز الآن" CTA button. The button intercepts the press in
// _layout.tsx and routes to /services, so this file should never render.
// If it does (e.g. via deep link), redirect to home.
export default function PlaceholderRoute() {
  return <Redirect href={"/(tabs)/home" as any} />;
}
