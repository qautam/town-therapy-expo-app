import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAppBoot } from '@/context/AppBootContext';
import { useLocale } from '@/context/LocaleContext';
import type { EnKey } from '@/lib/i18n';

/** Bump to re-show for everyone after copy/design changes. */
const STORAGE_KEY = '@town_therapy_how_this_works_dismissed_v6';

/** Let home paint after splash / language before opening the modal. */
const HOME_SETTLE_MS = 450;

const STEPS: {
  id: string;
  labelKey: EnKey;
  hintKey: EnKey;
  icon: 'megaphone' | 'people' | 'leaf';
  route: string;
}[] = [
  {
    id: 'report',
    labelKey: 'how.step1',
    hintKey: 'how.step1Hint',
    icon: 'megaphone',
    route: '/report/new',
  },
  {
    id: 'drive',
    labelKey: 'how.step2',
    hintKey: 'how.step2Hint',
    icon: 'people',
    route: '/(tabs)/events',
  },
  {
    id: 'grow',
    labelKey: 'how.step3',
    hintKey: 'how.step3Hint',
    icon: 'leaf',
    route: '/(tabs)/profile',
  },
];

function PulseRing() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 900, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 900, easing: Easing.in(Easing.quad) })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 900 }),
        withTiming(0.55, { duration: 900 })
      ),
      -1,
      false
    );
  }, [opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[styles.pulseRing, style]} />;
}

/** Full-attention first visit modal — stays until “Don’t show me again”. */
export function HowThisWorksStrip() {
  const router = useRouter();
  const { t, needsLanguagePick } = useLocale();
  const { splashComplete } = useAppBoot();
  const [ready, setReady] = useState(false);
  const [homeSettled, setHomeSettled] = useState(false);
  const [permanentlyHidden, setPermanentlyHidden] = useState(false);
  const [sessionHidden, setSessionHidden] = useState(false);
  /** Hide only while a step route is open so the modal doesn’t cover it. */
  const [pausedForNav, setPausedForNav] = useState(false);
  const enter = useSharedValue(0);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!active) return;
        if (value === '1') setPermanentlyHidden(true);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!splashComplete || needsLanguagePick) {
      setHomeSettled(false);
      return;
    }
    const timer = setTimeout(() => setHomeSettled(true), HOME_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [needsLanguagePick, splashComplete]);

  useFocusEffect(
    useCallback(() => {
      setPausedForNav(false);
    }, [])
  );

  const visible =
    ready &&
    splashComplete &&
    homeSettled &&
    !needsLanguagePick &&
    !permanentlyHidden &&
    !sessionHidden &&
    !pausedForNav;

  useEffect(() => {
    if (!visible) {
      enter.value = 0;
      return;
    }
    enter.value = withDelay(
      120,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) })
    );
  }, [enter, visible]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: (1 - enter.value) * 28 },
      { scale: 0.94 + enter.value * 0.06 },
    ],
  }));

  const dontShowAgain = () => {
    setPermanentlyHidden(true);
    setSessionHidden(true);
    AsyncStorage.setItem(STORAGE_KEY, '1').catch(() => undefined);
  };

  const gotIt = () => {
    // Hide for this session only — comes back next open until they opt out.
    setSessionHidden(true);
  };

  const openStep = (route: string) => {
    setPausedForNav(true);
    router.push(route as never);
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, cardStyle]}>
          <LinearGradient
            colors={['#3A6565', Colors.primary, '#1F3A3A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}>
            <View style={styles.badgeWrap}>
              <PulseRing />
              <View style={styles.badge}>
                <Ionicons name="heart" size={22} color={Colors.white} />
              </View>
            </View>
            <Text style={styles.eyebrow}>{t('how.eyebrow')}</Text>
            <Text style={styles.title}>{t('how.title')}</Text>
            <Text style={styles.line}>{t('how.lead')}</Text>
          </LinearGradient>

          <View style={styles.steps}>
            {STEPS.map((step, index) => (
              <Pressable
                key={step.id}
                onPress={() => openStep(step.route)}
                style={({ pressed }) => [styles.step, pressed && styles.pressed]}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{index + 1}</Text>
                </View>
                <View style={styles.stepIcon}>
                  <Ionicons name={step.icon} size={18} color={Colors.primary} />
                </View>
                <View style={styles.stepCopy}>
                  <Text style={styles.stepLabel}>{t(step.labelKey)}</Text>
                  <Text style={styles.stepHint}>{t(step.hintKey)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={gotIt}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}>
            <Text style={styles.primaryBtnText}>{t('how.cta')}</Text>
          </Pressable>

          <Pressable
            onPress={dontShowAgain}
            hitSlop={8}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Don't show me again">
            <Text style={styles.secondaryBtnText}>Don't show me again</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 26, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Radius.xl,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: 8,
  },
  badgeWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  pulseRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: Colors.brandTeal,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  line: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.88)',
  },
  steps: {
    padding: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: '#F7F4EE',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(45, 79, 79, 0.12)',
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
  },
  stepIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  stepCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
  },
  stepHint: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  primaryBtn: {
    marginHorizontal: Spacing.md,
    marginTop: 4,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryBtn: {
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.88,
  },
});
