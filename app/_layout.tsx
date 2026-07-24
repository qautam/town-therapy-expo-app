import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import 'react-native-reanimated';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WelcomeSplash } from '@/components/WelcomeSplash';
import { AdminAuthProvider } from '@/context/AdminAuthContext';
import { EmergencyAlertProvider } from '@/context/EmergencyAlertContext';
import { LevelUpProvider } from '@/context/LevelUpContext';
import { PushNotificationProvider } from '@/context/PushNotificationContext';
import { VolunteerProvider } from '@/context/VolunteerContext';
import { Colors } from '@/constants/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Dismiss the native splash immediately so our green welcome screen takes over.
SplashScreen.hideAsync().catch(() => undefined);

export default function RootLayout() {
  const [showWelcome, setShowWelcome] = useState(true);
  const finishWelcome = useCallback(() => setShowWelcome(false), []);

  return (
    <SafeAreaProvider>
      <VolunteerProvider>
        <PushNotificationProvider>
          <LevelUpProvider>
            <AdminAuthProvider>
              <EmergencyAlertProvider>
              <View style={{ flex: 1, backgroundColor: Colors.primary }}>
                <Stack
                  screenOptions={{
                    contentStyle: { backgroundColor: Colors.background },
                  }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="report/new"
                    options={{ title: 'Quick Report', presentation: 'modal' }}
                  />
                  <Stack.Screen
                    name="post/new"
                    options={{ title: 'Share a story', presentation: 'modal' }}
                  />
                  <Stack.Screen
                    name="newsletter/index"
                    options={{ title: 'Email updates', presentation: 'modal' }}
                  />
                  <Stack.Screen name="impact/index" options={{ title: 'Your impact', presentation: 'modal' }} />
                  <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
                  <Stack.Screen name="admin" options={{ headerShown: false }} />
                </Stack>
                <StatusBar style={showWelcome ? 'light' : 'dark'} />
                {showWelcome ? <WelcomeSplash onFinish={finishWelcome} /> : null}
              </View>
              </EmergencyAlertProvider>
            </AdminAuthProvider>
          </LevelUpProvider>
        </PushNotificationProvider>
      </VolunteerProvider>
    </SafeAreaProvider>
  );
}
