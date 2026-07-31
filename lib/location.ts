import * as Location from 'expo-location';

export type GeoPoint = {
  latitude: number;
  longitude: number;
  label: string;
};

export function formatCoords(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export function mapsUrl(latitude: number, longitude: number) {
  return `https://maps.google.com/?q=${latitude},${longitude}`;
}

/** Google Maps directions between two points (distance + Start navigation). */
export function googleMapsDirectionsUrl(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
) {
  return (
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${origin.latitude},${origin.longitude}` +
    `&destination=${destination.latitude},${destination.longitude}` +
    `&travelmode=driving`
  );
}

/** Great-circle distance in kilometers. */
export function distanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

/** Human-readable proximity, e.g. "850 m away" or "1.2 km away". */
export function formatDistanceAway(km: number) {
  if (!Number.isFinite(km) || km < 0) return null;
  if (km < 0.05) return 'Nearby';
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} m away`;
  }
  const rounded = km < 10 ? km.toFixed(1) : Math.round(km).toString();
  return `${rounded} km away`;
}

export async function resolveLocationLabel(latitude: number, longitude: number) {
  const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
  if (!place) return formatCoords(latitude, longitude);

  const parts = [place.name, place.street, place.district, place.city, place.region]
    .filter(Boolean)
    .map((part) => String(part).trim());

  return [...new Set(parts)].join(', ') || formatCoords(latitude, longitude);
}

export async function getCurrentLocation(): Promise<GeoPoint> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission is required.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const { latitude, longitude } = position.coords;
  const label = await resolveLocationLabel(latitude, longitude);

  return { latitude, longitude, label };
}

/** Fast coords-only read for SOS proximity (skips reverse geocode). */
export async function getCurrentCoordinates(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return null;
  }
}
