import { Ionicons } from '@expo/vector-icons';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SaviourTrackingMap } from '@/components/SaviourTrackingMap';
import { formatPhoneDisplay, phoneTelUrl } from '@/lib/phone';
import { Colors, Radius, Spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  kicker: string;
  title: string;
  body: string;
  peerName: string;
  peerPhone: string | null;
  requesterLocation?: { latitude: number; longitude: number; label?: string } | null;
  responderLocation?: { latitude: number; longitude: number } | null;
  showTrackingMap?: boolean;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onDismiss: () => void;
};

export function HelpOnTheWayModal({
  visible,
  kicker,
  title,
  body,
  peerName,
  peerPhone,
  requesterLocation = null,
  responderLocation = null,
  showTrackingMap = false,
  primaryActionLabel,
  onPrimaryAction,
  onDismiss,
}: Props) {
  const callPeer = () => {
    if (!peerPhone) return;
    Linking.openURL(phoneTelUrl(peerPhone)).catch(() => undefined);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.root}>
        <View style={styles.card}>
          <Pressable
            style={styles.closeButton}
            onPress={onDismiss}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close">
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            <View style={styles.iconWrap}>
              <Ionicons name="walk" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.kicker}>{kicker}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{body}</Text>

            {showTrackingMap && requesterLocation ? (
              <SaviourTrackingMap
                requester={requesterLocation}
                responder={responderLocation}
                responderName={peerName}
              />
            ) : null}

            {peerPhone ? (
              <View style={styles.phoneBox}>
                <Text style={styles.phoneLabel}>{peerName}'s number</Text>
                <Text style={styles.phoneValue}>{formatPhoneDisplay(peerPhone)}</Text>
                <Text style={styles.phoneHint}>Only shared between you two</Text>
                <Pressable style={styles.callButton} onPress={callPeer}>
                  <Ionicons name="call" size={18} color={Colors.white} />
                  <Text style={styles.callButtonText}>Call {peerName.split(/\s+/)[0]}</Text>
                </Pressable>
              </View>
            ) : null}

            {primaryActionLabel && onPrimaryAction ? (
              <Pressable style={styles.button} onPress={onPrimaryAction}>
                <Text style={styles.buttonText}>{primaryActionLabel}</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={[
                styles.button,
                primaryActionLabel || peerPhone || showTrackingMap ? styles.buttonSecondary : null,
              ]}
              onPress={onDismiss}>
              <Text
                style={[
                  styles.buttonText,
                  primaryActionLabel || peerPhone || showTrackingMap
                    ? styles.buttonSecondaryText
                    : null,
                ]}>
                {primaryActionLabel ? 'Later' : 'Got it'}
              </Text>
            </Pressable>
          </ScrollView>
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
    borderColor: Colors.primary,
    maxHeight: '92%',
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
  scrollContent: {
    paddingBottom: Spacing.sm,
    paddingTop: 8,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: Colors.primary,
  },
  title: {
    marginTop: Spacing.sm,
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  body: {
    marginTop: Spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  phoneBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.greenLight,
    gap: 4,
  },
  phoneLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  phoneValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  phoneHint: {
    fontSize: 12,
    color: Colors.textMuted,
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
  button: {
    marginTop: Spacing.lg,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  buttonSecondary: {
    marginTop: Spacing.sm,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 16,
  },
  buttonSecondaryText: {
    color: Colors.textSecondary,
  },
});
