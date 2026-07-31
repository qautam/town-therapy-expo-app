import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  loading?: boolean;
  initialEventUpdates?: boolean;
  initialTownNewsletter?: boolean;
  onCancel: () => void;
  onConfirm: (prefs: { event_updates: boolean; town_newsletter: boolean }) => void;
};

export function TakeBreakModal({
  visible,
  loading = false,
  initialEventUpdates = true,
  initialTownNewsletter = true,
  onCancel,
  onConfirm,
}: Props) {
  const [eventUpdates, setEventUpdates] = useState(initialEventUpdates);
  const [townNewsletter, setTownNewsletter] = useState(initialTownNewsletter);

  useEffect(() => {
    if (!visible) return;
    setEventUpdates(initialEventUpdates);
    setTownNewsletter(initialTownNewsletter);
  }, [visible, initialEventUpdates, initialTownNewsletter]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="leaf" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Take a break</Text>
          <Text style={styles.subtitle}>
            Step away from active volunteering for now. Choose what updates you’d still like to
            receive.
          </Text>

          <View style={styles.prefCard}>
            <View style={styles.prefRow}>
              <View style={styles.prefText}>
                <Text style={styles.prefTitle}>Future events</Text>
                <Text style={styles.prefHint}>Get notified about upcoming drives and cleanups</Text>
              </View>
              <Switch
                value={eventUpdates}
                onValueChange={setEventUpdates}
                trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                thumbColor={Colors.white}
              />
            </View>
            <View style={styles.prefDivider} />
            <View style={styles.prefRow}>
              <View style={styles.prefText}>
                <Text style={styles.prefTitle}>Email updates</Text>
                <Text style={styles.prefHint}>Town news and community stories in your inbox</Text>
              </View>
              <Switch
                value={townNewsletter}
                onValueChange={setTownNewsletter}
                trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                thumbColor={Colors.white}
              />
            </View>
          </View>

          <Pressable
            style={[styles.confirmButton, loading && styles.disabled]}
            onPress={() => onConfirm({ event_updates: eventUpdates, town_newsletter: townNewsletter })}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.confirmText}>Confirm break</Text>
            )}
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={onCancel} disabled={loading}>
            <Text style={styles.cancelText}>Stay active</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(36, 63, 63, 0.55)',
  },
  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.greenLight,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    marginTop: Spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  prefCard: {
    backgroundColor: Colors.cardLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  prefText: {
    flex: 1,
    minWidth: 0,
  },
  prefTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  prefHint: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  prefDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.65,
  },
  confirmText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  cancelButton: {
    marginTop: Spacing.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
});
