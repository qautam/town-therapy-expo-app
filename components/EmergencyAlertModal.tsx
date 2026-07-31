import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  distanceKm,
  formatCoords,
  formatDistanceAway,
  getCurrentCoordinates,
  mapsUrl,
} from '@/lib/location';
import { formatPhoneDisplay, normalizePhone, phoneTelUrl } from '@/lib/phone';
import type { EmergencyAlert } from '@/types/database';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { townAlert } from '@/context/TownAlertContext';

type Props = {
  visible: boolean;
  alert: EmergencyAlert | null;
  onRespond: (phone: string) => void;
  onDismiss: () => void;
  onResolve?: () => void;
  showResolve?: boolean;
  responding?: boolean;
  /** When set, this viewer may see/call the citizen phone (they are the assigned responder). */
  canSeeCitizenPhone?: boolean;
};

function timeAgo(iso: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hr ago`;
}

export function EmergencyAlertModal({
  visible,
  alert,
  onRespond,
  onDismiss,
  onResolve,
  showResolve = false,
  responding = false,
  canSeeCitizenPhone = false,
}: Props) {
  const pulse = useSharedValue(0);
  const flash = useSharedValue(0);
  const [phone, setPhone] = useState('');
  const [distanceLabel, setDistanceLabel] = useState<string | null>(null);
  const [distanceLoading, setDistanceLoading] = useState(false);

  useEffect(() => {
    if (!visible || !alert || alert.status !== 'active') {
      pulse.value = 0;
      flash.value = 0;
      Vibration.cancel();
      return;
    }

    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.15, { duration: 500 })
      ),
      -1,
      true
    );
    flash.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 450, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 450 })
      ),
      -1,
      false
    );

    Vibration.vibrate(500);
    const vibe = setInterval(() => Vibration.vibrate(400), 1600);

    return () => {
      clearInterval(vibe);
      Vibration.cancel();
    };
  }, [visible, alert?.status, alert?.id, pulse, flash]);

  useEffect(() => {
    if (!visible) setPhone('');
  }, [visible, alert?.id]);

  useEffect(() => {
    let cancelled = false;

    if (!visible || !alert) {
      setDistanceLabel(null);
      setDistanceLoading(false);
      return undefined;
    }

    setDistanceLoading(true);
    setDistanceLabel(null);

    (async () => {
      const here = await getCurrentCoordinates();
      if (cancelled) return;

      if (!here) {
        setDistanceLabel(null);
        setDistanceLoading(false);
        return;
      }

      const km = distanceKm(here, {
        latitude: alert.latitude,
        longitude: alert.longitude,
      });
      setDistanceLabel(formatDistanceAway(km));
      setDistanceLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, alert?.id, alert?.latitude, alert?.longitude]);

  const isUrgent = alert?.status === 'active';

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: isUrgent ? 0.35 + pulse.value * 0.55 : 1,
    transform: [{ scale: isUrgent ? 0.9 + pulse.value * 0.35 : 1 }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    backgroundColor: isUrgent
      ? interpolateColor(
          flash.value,
          [0, 1],
          ['rgba(26, 26, 26, 0.78)', 'rgba(176, 28, 28, 0.88)']
        )
      : 'rgba(26, 26, 26, 0.72)',
  }));

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: isUrgent
      ? interpolateColor(flash.value, [0, 1], [Colors.red, '#FF6B5A'])
      : Colors.primary,
  }));

  if (!alert) return null;

  const openMaps = () => {
    Linking.openURL(mapsUrl(alert.latitude, alert.longitude)).catch(() => undefined);
  };

  const handleRespond = () => {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      townAlert('Phone required', 'Enter your 10-digit phone number so the requester can call you.');
      return;
    }
    onRespond(normalized);
  };

  const callCitizen = () => {
    if (!alert.citizen_phone) return;
    Linking.openURL(phoneTelUrl(alert.citizen_phone)).catch(() => undefined);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Animated.View style={[styles.backdrop, flashStyle]}>
        <KeyboardAvoidingView
          style={styles.avoid}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            bounces={false}>
            <Animated.View style={[styles.card, borderStyle]}>
              <Pressable
                style={styles.closeButton}
                onPress={onDismiss}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </Pressable>

              <View style={styles.header}>
                <Animated.View style={[styles.pulseDot, pulseStyle]} />
                <Text style={styles.kicker}>EMERGENCY ALERT</Text>
              </View>

              <Text style={styles.title}>{alert.citizen_name} needs help</Text>
              <View style={styles.metaRow}>
                <Text style={styles.time}>{timeAgo(alert.created_at)}</Text>
                {distanceLoading ? (
                  <View style={styles.distanceChip}>
                    <ActivityIndicator size="small" color={Colors.red} />
                    <Text style={styles.distanceChipText}>Locating…</Text>
                  </View>
                ) : distanceLabel ? (
                  <View style={styles.distanceChip}>
                    <Ionicons name="navigate" size={14} color={Colors.red} />
                    <Text style={styles.distanceChipText}>{distanceLabel}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.locationBox}>
                <Ionicons name="location" size={18} color={Colors.red} />
                <View style={styles.locationText}>
                  <Text style={styles.locationLabel}>{alert.location_label}</Text>
                  <Text style={styles.coords}>{formatCoords(alert.latitude, alert.longitude)}</Text>
                  {distanceLabel ? (
                    <Text style={styles.distanceHint}>About {distanceLabel} from you</Text>
                  ) : null}
                </View>
              </View>

              {alert.message ? <Text style={styles.message}>"{alert.message}"</Text> : null}

              {alert.status === 'responding' && alert.responded_by_name ? (
                <View style={styles.respondingBanner}>
                  <Ionicons name="walk-outline" size={16} color={Colors.primary} />
                  <Text style={styles.respondingText}>{alert.responded_by_name} is on the way</Text>
                </View>
              ) : null}

              {canSeeCitizenPhone && alert.citizen_phone ? (
                <View style={styles.phoneReveal}>
                  <Text style={styles.phoneRevealLabel}>Requester phone</Text>
                  <Text style={styles.phoneRevealValue}>{formatPhoneDisplay(alert.citizen_phone)}</Text>
                  <Pressable style={styles.callInline} onPress={callCitizen}>
                    <Ionicons name="call" size={16} color={Colors.white} />
                    <Text style={styles.callInlineText}>Call now</Text>
                  </Pressable>
                </View>
              ) : null}

              <Pressable style={styles.mapsButton} onPress={openMaps}>
                <Ionicons name="map-outline" size={18} color={Colors.primary} />
                <Text style={styles.mapsButtonText}>Open in Maps</Text>
              </Pressable>

              {alert.status === 'active' ? (
                <>
                  <Text style={styles.phonePrompt}>
                    Your phone number (shared only with the requester)
                  </Text>
                  <TextInput
                    style={styles.phoneInput}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="10-digit mobile number"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={14}
                  />
                  <Pressable style={styles.respondButton} onPress={handleRespond} disabled={responding}>
                    <Ionicons name="heart-outline" size={18} color={Colors.white} />
                    <Text style={styles.respondButtonText}>
                      {responding ? 'Updating…' : "I'm on my way"}
                    </Text>
                  </Pressable>
                </>
              ) : null}

              {showResolve && onResolve ? (
                <Pressable style={styles.resolveButton} onPress={onResolve}>
                  <Text style={styles.resolveButtonText}>Mark resolved</Text>
                </Pressable>
              ) : null}

              <Pressable style={styles.dismissButton} onPress={onDismiss}>
                <Text style={styles.dismissButtonText}>Dismiss</Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  avoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 3,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    marginTop: 8,
    paddingRight: 40,
  },
  pulseDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.red,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: Colors.red,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  metaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  time: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  distanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.redLight,
  },
  distanceChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.red,
  },
  locationBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.redLight,
  },
  locationText: {
    flex: 1,
    gap: 4,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 20,
  },
  coords: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.red,
  },
  distanceHint: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  message: {
    marginTop: Spacing.md,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  respondingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.greenLight,
  },
  respondingText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  phoneReveal: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.greenLight,
    gap: 4,
  },
  phoneRevealLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  phoneRevealValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  callInline: {
    marginTop: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  callInlineText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mapsButtonText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  phonePrompt: {
    marginTop: Spacing.md,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  phoneInput: {
    marginTop: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  respondButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.red,
  },
  respondButtonText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 16,
  },
  resolveButton: {
    marginTop: Spacing.sm,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  resolveButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  dismissButton: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dismissButtonText: {
    color: Colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
});
