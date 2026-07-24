import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Event, EmergencyAlert } from '@/types/database';
import { Colors } from '@/constants/theme';

export type PushPlatform = 'ios' | 'android' | 'web';

function formatEventWhen(startsAt: string) {
  const date = new Date(startsAt);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${date.getDate()} ${months[date.getMonth()]} at ${hour12}:${minutes} ${ampm}`;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function getPushPlatform(): PushPlatform {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

export function buildNewEventNotification(
  event: Pick<Event, 'id' | 'title' | 'starts_at' | 'location_label'>
) {
  return {
    title: 'New Town Therapy event',
    body: `${event.title} · ${formatEventWhen(event.starts_at)} · ${event.location_label}`,
    data: {
      type: 'new_event',
      eventId: event.id,
      screen: 'events',
    },
  };
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('events', {
      name: 'Event updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: Colors.primary,
    });
    await Notifications.setNotificationChannelAsync('emergency', {
      name: 'Emergency alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#C0392B',
      bypassDnd: true,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;

  try {
    const token = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}

export async function presentLocalNewEventNotification(
  event: Pick<Event, 'id' | 'title' | 'starts_at' | 'location_label'>
) {
  const content = buildNewEventNotification(event);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      data: content.data,
      sound: 'default',
    },
    trigger: null,
  });
}

export function buildEmergencyNotification(alert: Pick<EmergencyAlert, 'id' | 'citizen_name' | 'location_label'>) {
  return {
    title: '🚨 Citizen needs help',
    body: `${alert.citizen_name} shared their location · ${alert.location_label}`,
    data: {
      type: 'emergency_alert',
      alertId: alert.id,
      screen: 'report/new',
    },
  };
}

export async function presentLocalEmergencyNotification(
  alert: Pick<EmergencyAlert, 'id' | 'citizen_name' | 'location_label'>
) {
  const content = buildEmergencyNotification(alert);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      data: content.data,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      ...(Platform.OS === 'android' ? { channelId: 'emergency' } : {}),
    },
    trigger: null,
  });
}
