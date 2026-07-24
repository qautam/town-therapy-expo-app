import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EMERGENCY_CONTACTS } from '@/constants/emergency';
import { api } from '@/lib/api';
import { formatCoords, mapsUrl, type GeoPoint } from '@/lib/location';
import { Colors, Radius, Spacing } from '@/constants/theme';

type Props = {
  guestId: string | null;
  geo: GeoPoint | null;
  locating: boolean;
  locationError: string | null;
  onRefreshLocation: () => void;
};

export function PublicSafetySection({
  guestId,
  geo,
  locating,
  locationError,
  onRefreshLocation,
}: Props) {
  const [message, setMessage] = useState('');
  const [alerting, setAlerting] = useState(false);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);

  const callEmergency = (number: string, label: string) => {
    Alert.alert(`Call ${label}?`, `This will dial ${number} on your phone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Call now',
        style: 'destructive',
        onPress: () => {
          Linking.openURL(`tel:${number}`).catch(() => {
            Alert.alert('Cannot place call', 'Your device could not open the phone dialer.');
          });
        },
      },
    ]);
  };

  const alertVolunteers = async () => {
    if (!guestId) {
      Alert.alert('Please wait', 'Your device profile is still loading.');
      return;
    }

    if (!geo) {
      Alert.alert('Location required', 'Enable location so volunteers know where to find you.');
      return;
    }

    setAlerting(true);
    try {
      const alert = await api.createEmergencyAlert(guestId, {
        location_label: geo.label,
        latitude: geo.latitude,
        longitude: geo.longitude,
        message: message.trim() || undefined,
      });
      setActiveAlertId(alert.id);
      Alert.alert(
        'Volunteers alerted',
        'Your live location was shared with Town Therapy volunteers and admins. Someone should reach out soon. For life-threatening emergencies, also call 112.'
      );
    } catch (error) {
      Alert.alert('Could not alert volunteers', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setAlerting(false);
    }
  };

  const resolveAlert = async () => {
    if (!activeAlertId) return;

    try {
      await api.resolveEmergencyAlert(activeAlertId);
      setActiveAlertId(null);
      Alert.alert('Alert cleared', 'Your emergency alert has been marked as resolved.');
    } catch (error) {
      Alert.alert('Could not clear alert', error instanceof Error ? error.message : 'Try again.');
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <Ionicons name="shield" size={24} color={Colors.white} />
        </View>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>Public Safety</Text>
          <Text style={styles.bannerSubtitle}>
            Alert nearby volunteers & admins, or call emergency services directly.
          </Text>
        </View>
      </View>

      <View style={styles.locationCard}>
        <View style={styles.locationHeader}>
          <Text style={styles.locationTitle}>Your live location</Text>
          <Pressable style={styles.refreshButton} onPress={onRefreshLocation} disabled={locating}>
            {locating ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={14} color={Colors.primary} />
                <Text style={styles.refreshText}>Refresh</Text>
              </>
            )}
          </Pressable>
        </View>

        {geo ? (
          <>
            <Text style={styles.locationAddress}>{geo.label}</Text>
            <Text style={styles.coords}>{formatCoords(geo.latitude, geo.longitude)}</Text>
            <Pressable
              style={styles.mapLink}
              onPress={() => Linking.openURL(mapsUrl(geo.latitude, geo.longitude))}>
              <Text style={styles.mapLinkText}>Preview on map</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.locationError}>{locationError ?? 'Detecting location…'}</Text>
        )}
      </View>

      <TextInput
        style={styles.messageInput}
        placeholder="What's happening? (optional — e.g. accident, medical, unsafe area)"
        placeholderTextColor={Colors.textMuted}
        value={message}
        onChangeText={setMessage}
        multiline
      />

      {activeAlertId ? (
        <View style={styles.activeAlertBox}>
          <Ionicons name="radio-outline" size={18} color={Colors.red} />
          <Text style={styles.activeAlertText}>Volunteers & admins have your location</Text>
          <Pressable onPress={resolveAlert}>
            <Text style={styles.clearAlertText}>I'm safe now</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={[styles.sosButton, (!geo || alerting) && styles.sosButtonDisabled]}
          onPress={alertVolunteers}
          disabled={!geo || alerting}>
          {alerting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="alert-circle" size={20} color={Colors.white} />
              <Text style={styles.sosButtonText}>Alert volunteers & admins</Text>
            </>
          )}
        </Pressable>
      )}

      <Text style={styles.emergencyLabel}>Emergency numbers (India)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emergencyRow}>
        {EMERGENCY_CONTACTS.map((contact) => (
          <Pressable
            key={contact.id}
            style={[styles.emergencyChip, contact.primary && styles.emergencyChipPrimary]}
            onPress={() => callEmergency(contact.number, contact.label)}>
            <Ionicons
              name={contact.icon}
              size={16}
              color={contact.primary ? Colors.white : Colors.red}
            />
            <Text style={[styles.emergencyChipNumber, contact.primary && styles.emergencyChipNumberPrimary]}>
              {contact.number}
            </Text>
            <Text
              style={[styles.emergencyChipLabel, contact.primary && styles.emergencyChipLabelPrimary]}
              numberOfLines={1}>
              {contact.label.split(' ')[0]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  banner: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.red,
    borderRadius: Radius.xl,
    padding: Spacing.md,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  bannerSubtitle: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    lineHeight: 17,
  },
  locationCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 4,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.greenLight,
  },
  refreshText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  locationAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 20,
  },
  coords: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  mapLink: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  mapLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  locationError: {
    fontSize: 13,
    color: Colors.red,
    lineHeight: 18,
  },
  messageInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.red,
    borderRadius: Radius.pill,
    paddingVertical: 15,
  },
  sosButtonDisabled: {
    opacity: 0.55,
  },
  sosButtonText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  activeAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.redLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  activeAlertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.red,
  },
  clearAlertText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  emergencyLabel: {
    marginTop: Spacing.xs,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emergencyRow: {
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  emergencyChip: {
    width: 88,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#F5C6C0',
  },
  emergencyChipPrimary: {
    backgroundColor: Colors.red,
    borderColor: Colors.red,
  },
  emergencyChipNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.red,
  },
  emergencyChipNumberPrimary: {
    color: Colors.white,
  },
  emergencyChipLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emergencyChipLabelPrimary: {
    color: 'rgba(255,255,255,0.9)',
  },
});
