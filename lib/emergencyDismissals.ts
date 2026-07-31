import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@town_therapy_dismissed_sos:';

function storageKey(guestId: string) {
  return `${KEY_PREFIX}${guestId}`;
}

export async function loadDismissedEmergencyIds(guestId: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(guestId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

export async function persistDismissedEmergencyId(guestId: string, alertId: string) {
  const ids = await loadDismissedEmergencyIds(guestId);
  if (ids.has(alertId)) return;
  ids.add(alertId);
  await AsyncStorage.setItem(storageKey(guestId), JSON.stringify([...ids]));
}
