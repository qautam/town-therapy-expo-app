import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useLocale } from '@/context/LocaleContext';

/**
 * Bottom-docked SOS strip — sits in layout with a short helping dialogue.
 */
export function HomeSosBar() {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <View style={styles.dock}>
      <View style={styles.copy}>
        <Text style={styles.title}>{t('home.sosHelpTitle')}</Text>
        <Text style={styles.subtitle}>{t('home.sosHelpSub')}</Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}
        onPress={() => router.push('/report/new?focus=sos')}
        accessibilityRole="button"
        accessibilityLabel={t('home.sos')}>
        <LinearGradient
          colors={['#FF5252', '#D32F2F', '#9B1B1B']}
          locations={[0, 0.55, 1]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={styles.button}>
          <MaterialCommunityIcons name="alarm-light" size={18} color={Colors.white} />
          <Text style={styles.label}>SOS</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  copy: {
    flex: 1,
    gap: 2,
    paddingRight: Spacing.xs,
  },
  title: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  hit: {
    borderRadius: Radius.pill,
  },
  hitPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  label: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
});
