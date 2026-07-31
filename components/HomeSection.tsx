import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

type Props = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Shared home section chrome — equal title row + content spacing (8pt grid). */
export function HomeSection({ title, actionLabel, onAction, children, style }: Props) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} hitSlop={10} style={({ pressed }) => pressed && styles.pressed}>
            <Text style={styles.action}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.2,
  },
  action: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.orange,
  },
  pressed: {
    opacity: 0.65,
  },
});
