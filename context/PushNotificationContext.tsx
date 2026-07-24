import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

import { useVolunteer } from '@/context/VolunteerContext';
import { api } from '@/lib/api';
import { getPushPlatform, registerForPushNotificationsAsync } from '@/lib/pushNotifications';

type PushNotificationContextValue = {
  syncPushRegistration: () => Promise<void>;
};

const PushNotificationContext = createContext<PushNotificationContextValue | null>(null);

export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { guestId, newsletter } = useVolunteer();
  const lastTokenRef = useRef<string | null>(null);

  const syncPushRegistration = useCallback(async () => {
    if (!guestId) return;

    const wantsEventUpdates = newsletter?.event_updates ?? false;
    if (!wantsEventUpdates) {
      if (lastTokenRef.current) {
        await api.removePushToken(guestId, lastTokenRef.current);
        lastTokenRef.current = null;
      }
      return;
    }

    const token = await registerForPushNotificationsAsync();
    if (!token) return;

    await api.registerPushToken(guestId, token, getPushPlatform(), true);
    lastTokenRef.current = token;
  }, [guestId, newsletter?.event_updates]);

  useEffect(() => {
    syncPushRegistration();
  }, [syncPushRegistration]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen;
      if (screen === 'events') {
        router.push('/(tabs)/events');
      }
    });

    return () => subscription.remove();
  }, [router]);

  const value = useMemo(() => ({ syncPushRegistration }), [syncPushRegistration]);

  return (
    <PushNotificationContext.Provider value={value}>{children}</PushNotificationContext.Provider>
  );
}

export function usePushNotifications() {
  const context = useContext(PushNotificationContext);
  if (!context) {
    throw new Error('usePushNotifications must be used within PushNotificationProvider');
  }
  return context;
}
