import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: Colors.background },
      }}>
      <Stack.Screen name="login" options={{ title: 'Admin login', presentation: 'modal' }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
