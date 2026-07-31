import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export const NAV_STATE_KEY = '@town_therapy/nav_state_v1';

export type AppSessionSnapshot = {
  navigationState?: Record<string, unknown>;
};

/** Load saved navigation before the router paints its default screen. */
export async function prepareAppSession(): Promise<AppSessionSnapshot> {
  if (Platform.OS === 'web') return {};

  try {
    const [launchUrl, navRaw] = await Promise.all([
      Linking.getInitialURL(),
      AsyncStorage.getItem(NAV_STATE_KEY),
    ]);

    if (launchUrl || !navRaw) return {};

    return { navigationState: JSON.parse(navRaw) as Record<string, unknown> };
  } catch {
    return {};
  }
}

export async function saveNavigationState(state: Record<string, unknown>) {
  if (Platform.OS === 'web') return;

  try {
    await AsyncStorage.setItem(NAV_STATE_KEY, JSON.stringify(state));
  } catch {
    // Best-effort only.
  }
}

export async function clearNavigationState() {
  try {
    await AsyncStorage.removeItem(NAV_STATE_KEY);
  } catch {
    // ignore
  }
}
