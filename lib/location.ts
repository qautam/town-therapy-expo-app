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
