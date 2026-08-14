import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import 'react-native-reanimated';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WelcomeSplash } from '@/components/WelcomeSplash';
import { NavigationPersistence } from '@/components/NavigationPersistence';
import { prepareAppSession } from '@/lib/appSession';
import { AdminAuthProvider } from '@/context/AdminAuthContext';
import { EmergencyAlertProvider } from '@/context/EmergencyAlertContext';
import { LevelUpProvider } from '@/context/LevelUpContext';
import { PushNotificationProvider } from '@/context/PushNotificationContext';
import { TownAlertProvider } from '@/context/TownAlertContext';
import { VolunteerProvider } from '@/context/VolunteerContext';
import { Colors } from '@/constants/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

const SPLASH_DAY_KEY = '@town_therapy_splash_day';

// Dismiss the native splash immediately so our green welcome screen takes over.
SplashScreen.hideAsync().catch(() => undefined);

export default function RootLayout() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [splashReady, setSplashReady] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [initialNavigationState, setInitialNavigationState] = useState<
    Record<string, unknown> | undefined
  >();
  const finishWelcome = useCallback(() => setShowWelcome(false), []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [session, last] = await Promise.all([
          prepareAppSession(),
          AsyncStorage.getItem(SPLASH_DAY_KEY),
        ]);
        if (!active) return;

        setInitialNavigationState(session.navigationState);
        if (last === today) {
          setShowWelcome(false);
        } else {
          await AsyncStorage.setItem(SPLASH_DAY_KEY, today);
          setShowWelcome(true);
        }
      } catch {
        if (active) setShowWelcome(true);
      } finally {
        if (active) {
          setSplashReady(true);
          setSessionReady(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!sessionReady) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: Colors.primary }} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <TownAlertProvider>
      <VolunteerProvider>
        <PushNotificationProvider>
          <LevelUpProvider>
            <AdminAuthProvider>
              <EmergencyAlertProvider>
              <View style={{ flex: 1, backgroundColor: Colors.primary }}>
                <Stack
                  screenOptions={{
                    contentStyle: { backgroundColor: Colors.background },
                    animation: 'slide_from_right',
                    gestureEnabled: true,
                    fullScreenGestureEnabled: true,
                  }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
                  <Stack.Screen
                    name="report/new"
                    options={{ title: 'Quick Report', presentation: 'modal', animation: 'slide_from_bottom' }}
                  />
                  <Stack.Screen
                    name="post/new"
                    options={{ title: 'Share a story', presentation: 'modal', animation: 'slide_from_bottom' }}
                  />
                  <Stack.Screen
                    name="newsletter/index"
                    options={{ title: 'Sign up', presentation: 'modal', animation: 'slide_from_bottom' }}
                  />
                  <Stack.Screen name="event/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
                  <Stack.Screen
                    name="assistant/index"
                    options={{ headerShown: false, presentation: 'card', animation: 'slide_from_right' }}
                  />
                  <Stack.Screen
                    name="sos/[id]"
                    options={{ headerShown: false, presentation: 'card', animation: 'slide_from_right' }}
                  />
                  <Stack.Screen name="admin" options={{ headerShown: false }} />
                </Stack>
                <NavigationPersistence initialNavigationState={initialNavigationState} />
                <StatusBar style="light" />
                {splashReady && showWelcome ? <WelcomeSplash onFinish={finishWelcome} /> : null}
              </View>
              </EmergencyAlertProvider>
            </AdminAuthProvider>
          </LevelUpProvider>
        </PushNotificationProvider>
      </VolunteerProvider>
      </TownAlertProvider>
    </SafeAreaProvider>
  );
}
