import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EMERGENCY_CONTACTS } from '@/constants/emergency';
import { useEmergencyAlerts } from '@/context/EmergencyAlertContext';
import { useTaskDraft } from '@/hooks/useTaskDraft';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { formatCoords, mapsUrl, type GeoPoint } from '@/lib/location';
import { formatPhoneDisplay, normalizePhone, phoneTelUrl } from '@/lib/phone';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { townAlert } from '@/context/TownAlertContext';

type Props = {
  guestId: string | null;
  geo: GeoPoint | null;
  locating: boolean;
  locationError: string | null;
  onRefreshLocation: () => void;
};

type SafetyDraft = {
  message: string;
  phone: string;
};

const EMPTY_SAFETY_DRAFT: SafetyDraft = {
  message: '',
  phone: '',
};

export function PublicSafetySection({
  guestId,
  geo,
  locating,
  locationError,
  onRefreshLocation,
}: Props) {
  const [alerting, setAlerting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const { value: draft, setValue: setDraft, clearDraft } = useTaskDraft(
    'public-safety',
    EMPTY_SAFETY_DRAFT,
    { pause: alerting }
  );
  const { message, phone } = draft;
  const { trackingAlert, openSosTracking, refreshAlerts } = useEmergencyAlerts();

  const isRequester = Boolean(guestId && trackingAlert && trackingAlert.guest_id === guestId);
  const isResponder = Boolean(
    guestId && trackingAlert && trackingAlert.responded_by_guest_id === guestId
  );
  const hasActiveSos = Boolean(trackingAlert && (isRequester || isResponder));
  const isLive =
    Boolean(trackingAlert) &&
    trackingAlert!.status === 'responding' &&
    Boolean(trackingAlert!.responded_by_name);

  const peerName = isRequester
    ? trackingAlert?.responded_by_name || 'Volunteer'
    : trackingAlert?.citizen_name || 'Citizen';
  const peerPhone = isRequester
    ? trackingAlert?.responder_phone ?? null
    : trackingAlert?.citizen_phone ?? null;

  const callEmergency = (number: string, label: string) => {
    townAlert(`Call ${label}?`, `This will dial ${number} on your phone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Call now',
        style: 'destructive',
        onPress: () => {
          Linking.openURL(`tel:${number}`).catch(() => {
            townAlert('Cannot place call', 'Your device could not open the phone dialer.');
          });
        },
      },
    ]);
  };

  const alertVolunteers = async () => {
    if (!guestId) {
      townAlert('Please wait', 'Your device profile is still loading.');
      return;
    }

    if (!geo) {
      townAlert('Location required', 'Enable location so volunteers know where to find you.');
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      townAlert('Phone required', 'Enter your 10-digit phone number so a volunteer can call you.');
      return;
    }

    setAlerting(true);
    try {
      await api.createEmergencyAlert(guestId, {
        location_label: geo.label,
        latitude: geo.latitude,
        longitude: geo.longitude,
        phone: normalizedPhone,
        message: message.trim() || undefined,
      });
      await refreshAlerts();
      await clearDraft();
      setDraft(EMPTY_SAFETY_DRAFT);
      townAlert(
        'Volunteers alerted',
        'Your live location and phone number were shared privately with the volunteer who responds. For life-threatening emergencies, also call 112.'
      );
    } catch (error) {
      townAlert('Could not alert volunteers', getErrorMessage(error));
    } finally {
      setAlerting(false);
    }
  };

  const resolveAlert = async () => {
    if (!trackingAlert) return;

    setResolving(true);
    try {
      await api.resolveEmergencyAlert(trackingAlert.id);
      await refreshAlerts();
      townAlert('Alert cleared', 'Your emergency alert has been marked as resolved.');
    } catch (error) {
      townAlert('Could not clear alert', getErrorMessage(error));
    } finally {
      setResolving(false);
    }
  };

  const callPeer = () => {
    if (!peerPhone) return;
    Linking.openURL(phoneTelUrl(peerPhone)).catch(() => undefined);
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
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={14} color={Colors.white} />
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

      {hasActiveSos && trackingAlert ? (
        <View style={styles.activeAlertColumn}>
          {isLive ? (
            <View style={styles.liveSession}>
              <View style={styles.liveHeader}>
                <View style={styles.liveDot} />
                <Text style={styles.liveStatus}>
                  {isResponder ? 'Helping' : 'On the way'}
                </Text>
              </View>

              <Text style={styles.liveName} numberOfLines={1}>
                {peerName}
              </Text>

              {peerPhone ? (
                <Pressable style={styles.phoneRow} onPress={callPeer} hitSlop={6}>
                  <Text style={styles.livePhone}>{formatPhoneDisplay(peerPhone)}</Text>
                  <View style={styles.callIcon}>
                    <Ionicons name="call" size={14} color={Colors.white} />
                  </View>
                </Pressable>
              ) : (
                <Text style={styles.contactHint}>Phone shared when available</Text>
              )}

              <Pressable
                style={styles.trackButton}
                onPress={() => openSosTracking(trackingAlert.id)}>
                <Ionicons name="navigate-outline" size={17} color={Colors.white} />
                <Text style={styles.trackButtonText}>Live tracking</Text>
              </Pressable>

              <Pressable
                style={[styles.resolveLink, resolving && styles.resolveDisabled]}
                onPress={resolveAlert}
                disabled={resolving}
                hitSlop={8}>
                {resolving ? (
                  <ActivityIndicator size="small" color={Colors.textMuted} />
                ) : (
                  <Text style={styles.resolveLinkText}>
                    {isRequester ? "I'm safe now" : 'Mark resolved'}
                  </Text>
                )}
              </Pressable>
            </View>
          ) : (
            <>
              <View style={[styles.activeAlertBox, isResponder && styles.activeAlertBoxHelper]}>
                <Ionicons
                  name={isResponder ? 'walk-outline' : 'radio-outline'}
                  size={18}
                  color={isResponder ? Colors.primary : Colors.red}
                />
                <View style={styles.activeAlertCopy}>
                  <Text
                    style={[
                      styles.activeAlertText,
                      isResponder && styles.activeAlertTextHelper,
                    ]}>
                    Waiting for a volunteer — your number stays private until they respond
                  </Text>
                  <Text style={styles.activeAlertSub}>
                    Volunteers and admins have your SOS location
                  </Text>
                </View>
              </View>

              <Pressable
                style={[styles.resolveButton, resolving && styles.resolveDisabled]}
                onPress={resolveAlert}
                disabled={resolving}>
                {resolving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.resolveButtonText}>I'm safe now — resolve SOS</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      ) : (
        <>
          <TextInput
            style={styles.messageInput}
            placeholder="What's happening? (optional — e.g. accident, medical, unsafe area)"
            placeholderTextColor={Colors.textMuted}
            value={message}
            onChangeText={(value) => setDraft((current) => ({ ...current, message: value }))}
            multiline
          />

          <Text style={styles.phoneLabel}>Your phone number</Text>
          <TextInput
            style={styles.phoneInput}
            placeholder="10-digit mobile number"
            placeholderTextColor={Colors.textMuted}
            value={phone}
            onChangeText={(value) => setDraft((current) => ({ ...current, phone: value }))}
            keyboardType="phone-pad"
            maxLength={14}
          />
          <Text style={styles.phoneHint}>
            Shared only with the volunteer who taps “I'm on my way” — not with everyone.
          </Text>

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
        </>
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
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 4,
    shadowColor: '#1A1A1A',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primaryDark,
  },
  refreshText: {
    color: Colors.white,
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
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    minHeight: 72,
    textAlignVertical: 'top',
    shadowColor: '#1A1A1A',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  phoneLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  phoneInput: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  phoneHint: {
    marginTop: -2,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textMuted,
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.red,
    borderRadius: Radius.pill,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: '#8E2419',
    shadowColor: Colors.red,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  sosButtonDisabled: {
    opacity: 0.55,
  },
  sosButtonText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  activeAlertColumn: {
    gap: Spacing.sm,
  },
  liveSession: {
    backgroundColor: Colors.tealLight,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.md,
    gap: 10,
  },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  liveStatus: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.primary,
  },
  liveName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
    marginTop: -2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: 2,
  },
  livePhone: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  callIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactHint: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  trackButton: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 13,
  },
  trackButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  resolveLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  resolveLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  activeAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.redLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: '#F5C6C0',
  },
  activeAlertBoxHelper: {
    backgroundColor: Colors.tealLight,
    borderColor: Colors.primary,
  },
  activeAlertCopy: {
    flex: 1,
    gap: 4,
  },
  activeAlertText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.red,
  },
  activeAlertTextHelper: {
    color: Colors.primaryDark,
  },
  activeAlertSub: {
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  resolveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.red,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#8E2419',
  },
  resolveDisabled: {
    opacity: 0.55,
  },
  resolveButtonText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 14,
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
    borderWidth: 1.5,
    borderColor: '#F5C6C0',
    shadowColor: '#1A1A1A',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  emergencyChipPrimary: {
    backgroundColor: Colors.red,
    borderColor: '#8E2419',
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
