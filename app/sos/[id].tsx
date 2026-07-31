import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SaviourTrackingMap } from '@/components/SaviourTrackingMap';
import { useVolunteer } from '@/context/VolunteerContext';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { getCurrentCoordinates, googleMapsDirectionsUrl, mapsUrl } from '@/lib/location';
import { formatPhoneDisplay, phoneTelUrl } from '@/lib/phone';
import type { EmergencyAlert } from '@/types/database';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { townAlert } from '@/context/TownAlertContext';

const POLL_MS = 5_000;
const LOCATION_PUSH_MS = 8_000;

export default function SosTrackingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { guestId } = useVolunteer();
  const [alert, setAlert] = useState<EmergencyAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alertId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';

  const isRequester = Boolean(guestId && alert && alert.guest_id === guestId);
  const isResponder = Boolean(
    guestId && alert && alert.responded_by_guest_id === guestId
  );
  const isParty = isRequester || isResponder;

  const refresh = useCallback(async () => {
    if (!alertId || !guestId) return;
    try {
      const next = await api.getEmergencyAlert(alertId, guestId);
      if (!next) {
        setError('This SOS alert was not found.');
        setAlert(null);
        return;
      }
      setAlert(next);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load SOS tracking.'));
    } finally {
      setLoading(false);
    }
  }, [alertId, guestId]);

  useEffect(() => {
    setLoading(true);
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  // Saviour keeps sharing live location while this page (or app) is open.
  useEffect(() => {
    if (!guestId || !alertId || !isResponder || alert?.status !== 'responding') {
      return undefined;
    }

    let cancelled = false;
    const pushLocation = async () => {
      const here = await getCurrentCoordinates();
      if (cancelled || !here) return;
      try {
        const updated = await api.updateEmergencyResponderLocation(alertId, guestId, here);
        setAlert(updated);
      } catch {
        // Best-effort.
      }
    };

    pushLocation();
    const interval = setInterval(pushLocation, LOCATION_PUSH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [alert?.status, alertId, guestId, isResponder]);

  const peerName = isRequester
    ? alert?.responded_by_name || 'Volunteer'
    : alert?.citizen_name || 'Citizen';
  const peerPhone = isRequester ? alert?.responder_phone : alert?.citizen_phone;

  const callPeer = () => {
    if (!peerPhone) return;
    Linking.openURL(phoneTelUrl(peerPhone)).catch(() => undefined);
  };

  const openGoogleMaps = () => {
    if (!alert) return;
    const responderLocation =
      typeof alert.responder_latitude === 'number' &&
      typeof alert.responder_longitude === 'number'
        ? {
            latitude: alert.responder_latitude,
            longitude: alert.responder_longitude,
          }
        : null;

    const url = responderLocation
      ? googleMapsDirectionsUrl(responderLocation, {
          latitude: alert.latitude,
          longitude: alert.longitude,
        })
      : mapsUrl(alert.latitude, alert.longitude);

    Linking.openURL(url).catch(() => undefined);
  };

  const resolveSos = () => {
    if (!alert) return;
    townAlert(
      'Resolve SOS?',
      'This marks the emergency as resolved for everyone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          style: 'destructive',
          onPress: async () => {
            setResolving(true);
            try {
              await api.resolveEmergencyAlert(alert.id);
              townAlert('SOS cleared', 'This emergency is marked as resolved.');
              if (router.canGoBack()) router.back();
              else router.replace('/report/new');
            } catch (err) {
              townAlert('Could not resolve', getErrorMessage(err));
            } finally {
              setResolving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.muted}>Loading SOS tracking…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !alert) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SOS Tracking</Text>
          <Pressable style={styles.closeButton} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? 'SOS not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isParty) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SOS Tracking</Text>
          <Pressable style={styles.closeButton} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            Only the requester and assigned helper can open this tracking page.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (alert.status === 'resolved') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SOS Resolved</Text>
          <Pressable style={styles.closeButton} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.centered}>
          <Ionicons name="checkmark-circle" size={48} color={Colors.primary} />
          <Text style={styles.resolvedTitle}>This SOS is resolved</Text>
          <Text style={styles.muted}>Live tracking has ended.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const responderLocation =
    typeof alert.responder_latitude === 'number' &&
    typeof alert.responder_longitude === 'number'
      ? {
          latitude: alert.responder_latitude,
          longitude: alert.responder_longitude,
        }
      : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerKicker}>
            {isRequester ? 'HELP IS COMING' : 'YOU ARE RESPONDING'}
          </Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isRequester ? `${peerName} is on the way` : `Helping ${peerName}`}
          </Text>
        </View>
        <Pressable style={styles.closeButton} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={22} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.mapPane}>
        <SaviourTrackingMap
          expanded
          requester={{
            latitude: alert.latitude,
            longitude: alert.longitude,
            label: alert.location_label,
          }}
          requesterName={alert.citizen_name || 'Requester'}
          responder={responderLocation}
          responderName={alert.responded_by_name || 'Helper'}
        />
      </View>

      <View style={styles.panel}>
        <Text style={styles.locationLabel}>{alert.location_label}</Text>
        {alert.message ? <Text style={styles.message}>"{alert.message}"</Text> : null}

        <View style={styles.contactCard}>
          <Text style={styles.contactKicker}>{isRequester ? 'Helper contact' : 'Requester contact'}</Text>
          <Text style={styles.contactName}>{peerName}</Text>
          {peerPhone ? (
            <>
              <Text style={styles.contactPhone}>{formatPhoneDisplay(peerPhone)}</Text>
              <Text style={styles.contactHint}>Shared only between you two until this SOS is resolved</Text>
              <Pressable style={styles.callButton} onPress={callPeer}>
                <Ionicons name="call" size={18} color={Colors.white} />
                <Text style={styles.callButtonText}>Call {peerName.split(/\s+/)[0]}</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.contactHint}>Phone number not available yet</Text>
          )}
        </View>

        <Pressable style={styles.mapsButton} onPress={openGoogleMaps}>
          <Ionicons name="map-outline" size={18} color={Colors.white} />
          <Text style={styles.mapsButtonText}>Open in Google Maps</Text>
        </Pressable>

        <Pressable
          style={[styles.resolveButton, resolving && styles.resolveDisabled]}
          onPress={resolveSos}
          disabled={resolving}>
          {resolving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.resolveButtonText}>
              {isRequester ? "I'm safe now — resolve SOS" : 'Mark SOS resolved'}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F2',
  },
  headerCopy: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  headerKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: Colors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  mapPane: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    minHeight: 280,
  },
  panel: {
    padding: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 20,
  },
  message: {
    fontSize: 13,
    fontStyle: 'italic',
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  contactCard: {
    marginTop: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.greenLight,
    gap: 4,
  },
  contactKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  contactName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  contactPhone: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  contactHint: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  callButton: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  callButtonText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  mapsButtonText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  resolveButton: {
    marginTop: Spacing.sm,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.red,
    alignItems: 'center',
  },
  resolveDisabled: {
    opacity: 0.6,
  },
  resolveButtonText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  muted: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  errorText: {
    color: Colors.red,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  resolvedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
});
