import { useRouter } from 'expo-router';
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
import {
  addNotificationResponseListener,
  getPushPlatform,
  registerForPushNotificationsAsync,
} from '@/lib/pushNotifications';

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

    // Always keep a device token so SOS "help on the way" can reach the requester,
    // even if they turned off event update emails.
    const wantsEventUpdates = newsletter?.event_updates ?? false;
    const token = await registerForPushNotificationsAsync();
    if (!token) return;

    await api.registerPushToken(guestId, token, getPushPlatform(), wantsEventUpdates);
    lastTokenRef.current = token;
  }, [guestId, newsletter?.event_updates]);

  useEffect(() => {
    syncPushRegistration();
  }, [syncPushRegistration]);

  useEffect(() => {
    const subscription = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      const screen = data?.screen;
      const alertId = typeof data?.alertId === 'string' ? data.alertId : null;
      if (screen === 'events') {
        router.push('/(tabs)/events');
      } else if (
        (data?.type === 'emergency_help_on_way' || data?.type === 'emergency_alert') &&
        alertId
      ) {
        router.push(`/sos/${alertId}`);
      } else if (data?.type === 'emergency_alert') {
        router.push('/report/new');
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
