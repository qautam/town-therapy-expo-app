import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import 'react-native-reanimated';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LanguagePicker } from '@/components/LanguagePicker';
import { WelcomeSplash } from '@/components/WelcomeSplash';
import { NavigationPersistence } from '@/components/NavigationPersistence';
import { prepareAppSession } from '@/lib/appSession';
import { AdminAuthProvider } from '@/context/AdminAuthContext';
import { AppBootProvider, useAppBoot } from '@/context/AppBootContext';
import { EmergencyAlertProvider } from '@/context/EmergencyAlertContext';
import { LevelUpProvider } from '@/context/LevelUpContext';
import { LocaleProvider, useLocale } from '@/context/LocaleContext';
import { PushNotificationProvider } from '@/context/PushNotificationContext';
import { TownAlertProvider } from '@/context/TownAlertContext';
import { VolunteerProvider } from '@/context/VolunteerContext';
import { Colors } from '@/constants/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Dismiss the native splash immediately so our green welcome screen takes over.
SplashScreen.hideAsync().catch(() => undefined);

function RootLayoutNav({
  initialNavigationState,
}: {
  initialNavigationState?: Record<string, unknown>;
}) {
  const { ready, needsLanguagePick, t } = useLocale();
  const { markSplashComplete } = useAppBoot();
  const [showWelcome, setShowWelcome] = useState(true);
  const [showLanguage, setShowLanguage] = useState(false);

  const finishWelcome = useCallback(() => {
    setShowWelcome(false);
    markSplashComplete();
    if (needsLanguagePick) {
      setShowLanguage(true);
    }
  }, [markSplashComplete, needsLanguagePick]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: Colors.primary }} />;
  }

  return (
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
                      options={{
                        title: t('reportNew.header'),
                        presentation: 'modal',
                        animation: 'slide_from_bottom',
                      }}
                    />
                    <Stack.Screen
                      name="newsletter/index"
                      options={{
                        title: t('signup.title'),
                        presentation: 'modal',
                        animation: 'slide_from_bottom',
                      }}
                    />
                    <Stack.Screen
                      name="event/[id]"
                      options={{ headerShown: false, animation: 'slide_from_right' }}
                    />
                    <Stack.Screen
                      name="assistant/index"
                      options={{
                        headerShown: false,
                        presentation: 'card',
                        animation: 'slide_from_right',
                      }}
                    />
                    <Stack.Screen
                      name="sos/[id]"
                      options={{
                        headerShown: false,
                        presentation: 'card',
                        animation: 'slide_from_right',
                      }}
                    />
                    <Stack.Screen name="admin" options={{ headerShown: false }} />
                  </Stack>
                  <NavigationPersistence initialNavigationState={initialNavigationState} />
                  <StatusBar style="light" />
                  {showWelcome ? <WelcomeSplash onFinish={finishWelcome} /> : null}
                  {!showWelcome && (showLanguage || needsLanguagePick) ? (
                    <LanguagePicker onDone={() => setShowLanguage(false)} />
                  ) : null}
                </View>
              </EmergencyAlertProvider>
            </AdminAuthProvider>
          </LevelUpProvider>
        </PushNotificationProvider>
      </VolunteerProvider>
    </TownAlertProvider>
  );
}

export default function RootLayout() {
  const [sessionReady, setSessionReady] = useState(false);
  const [initialNavigationState, setInitialNavigationState] = useState<
    Record<string, unknown> | undefined
  >();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await prepareAppSession();
        if (!active) return;
        setInitialNavigationState(session.navigationState);
      } catch {
        // Continue without restored nav state.
      } finally {
        if (active) setSessionReady(true);
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
      <LocaleProvider>
        <AppBootProvider>
          <RootLayoutNav initialNavigationState={initialNavigationState} />
        </AppBootProvider>
      </LocaleProvider>
    </SafeAreaProvider>
  );
}
