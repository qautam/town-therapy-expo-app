import { Ionicons } from '@expo/vector-icons';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { formatCoords, mapsUrl } from '@/lib/location';
import type { EmergencyAlert } from '@/types/database';
import { Colors, Radius, Spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  alert: EmergencyAlert | null;
  onRespond: () => void;
  onDismiss: () => void;
  onResolve?: () => void;
  showResolve?: boolean;
  responding?: boolean;
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
}: Props) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }), withTiming(0.2, { duration: 700 })),
      -1,
      true
    );
  }, [visible, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.55,
  }));

  if (!alert) return null;

  const openMaps = () => {
    Linking.openURL(mapsUrl(alert.latitude, alert.longitude)).catch(() => undefined);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.root}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Animated.View style={[styles.pulseDot, pulseStyle]} />
            <Text style={styles.kicker}>EMERGENCY ALERT</Text>
          </View>

          <Text style={styles.title}>{alert.citizen_name} needs help</Text>
          <Text style={styles.time}>{timeAgo(alert.created_at)}</Text>

          <View style={styles.locationBox}>
            <Ionicons name="location" size={18} color={Colors.red} />
            <View style={styles.locationText}>
              <Text style={styles.locationLabel}>{alert.location_label}</Text>
              <Text style={styles.coords}>{formatCoords(alert.latitude, alert.longitude)}</Text>
            </View>
          </View>

          {alert.message ? <Text style={styles.message}>"{alert.message}"</Text> : null}

          {alert.status === 'responding' && alert.responded_by_name ? (
            <View style={styles.respondingBanner}>
              <Ionicons name="walk-outline" size={16} color={Colors.primary} />
              <Text style={styles.respondingText}>{alert.responded_by_name} is on the way</Text>
            </View>
          ) : null}

          <Pressable style={styles.mapsButton} onPress={openMaps}>
            <Ionicons name="map-outline" size={18} color={Colors.primary} />
            <Text style={styles.mapsButtonText}>Open in Maps</Text>
          </Pressable>

          {alert.status === 'active' ? (
            <Pressable style={styles.respondButton} onPress={onRespond} disabled={responding}>
              <Ionicons name="heart-outline" size={18} color={Colors.white} />
              <Text style={styles.respondButtonText}>
                {responding ? 'Updating…' : "I'm on my way"}
              </Text>
            </Pressable>
          ) : null}

          {showResolve && onResolve ? (
            <Pressable style={styles.resolveButton} onPress={onResolve}>
              <Text style={styles.resolveButtonText}>Mark resolved</Text>
            </Pressable>
          ) : null}

          <Pressable style={styles.dismissButton} onPress={onDismiss}>
            <Text style={styles.dismissButtonText}>Dismiss for now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 26, 0.72)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.red,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
  time: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textMuted,
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
