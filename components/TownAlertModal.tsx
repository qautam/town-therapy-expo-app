import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

export type TownAlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export type TownAlertRequest = {
  title: string;
  message?: string;
  buttons: TownAlertButton[];
};

type Props = {
  alert: TownAlertRequest | null;
  onDismiss: () => void;
};

export function TownAlertModal({ alert, onDismiss }: Props) {
  if (!alert) return null;

  const buttons =
    alert.buttons.length > 0 ? alert.buttons : [{ text: 'OK', style: 'default' as const }];

  const run = (button: TownAlertButton) => {
    onDismiss();
    // Defer so the modal can close before the next action opens another prompt.
    requestAnimationFrame(() => button.onPress?.());
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onDismiss} />
        <View style={styles.card}>
          <View style={styles.accent} />
          <Text style={styles.title}>{alert.title}</Text>
          {alert.message ? <Text style={styles.message}>{alert.message}</Text> : null}

          <View style={styles.actions}>
            {buttons.map((button, index) => {
              const destructive = button.style === 'destructive';
              const cancel = button.style === 'cancel';
              const primary = !destructive && !cancel && buttons.length === 1
                ? true
                : !destructive && !cancel && index === buttons.length - 1;

              return (
                <Pressable
                  key={`${button.text}-${index}`}
                  style={[
                    styles.button,
                    primary && styles.buttonPrimary,
                    destructive && styles.buttonDestructive,
                    cancel && styles.buttonCancel,
                  ]}
                  onPress={() => run(button)}>
                  <Text
                    style={[
                      styles.buttonText,
                      primary && styles.buttonTextPrimary,
                      destructive && styles.buttonTextDestructive,
                      cancel && styles.buttonTextCancel,
                    ]}>
                    {button.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45, 79, 79, 0.48)',
  },
  card: {
    backgroundColor: Colors.cardLight,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#1A2F2F',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Colors.primary,
  },
  title: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: -0.2,
  },
  message: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  actions: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  button: {
    borderRadius: Radius.pill,
    paddingVertical: 13,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.tealLight,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
  },
  buttonDestructive: {
    backgroundColor: Colors.redLight,
  },
  buttonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  buttonTextPrimary: {
    color: Colors.white,
  },
  buttonTextDestructive: {
    color: Colors.red,
  },
  buttonTextCancel: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
