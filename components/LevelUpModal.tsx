import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { VolunteerGrowthTree } from '@/components/VolunteerGrowthTree';
import { formatLevelRange, getVolunteerGrowthStage, type VolunteerLevel } from '@/lib/volunteerLevels';
import { Colors, Radius, Spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  level: VolunteerLevel | null;
  onDismiss: () => void;
};

const CONFETTI = [
  { x: -92, y: -72, color: '#FFD166', delay: 0 },
  { x: 88, y: -68, color: '#06D6A0', delay: 40 },
  { x: -78, y: 64, color: '#EF476F', delay: 80 },
  { x: 96, y: 58, color: '#118AB2', delay: 120 },
  { x: -12, y: -98, color: '#8338EC', delay: 60 },
  { x: 18, y: 92, color: '#FF9F1C', delay: 100 },
  { x: -110, y: 8, color: '#2EC4B6', delay: 140 },
  { x: 108, y: -6, color: '#E63946', delay: 20 },
];

function ConfettiDot({ x, y, color, delay, active }: { x: number; y: number; color: string; delay: number; active: boolean }) {
  const progress = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      progress.value = 0;
      spin.value = 0;
      return;
    }

    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })
    );
    spin.value = withDelay(delay, withRepeat(withTiming(360, { duration: 900 }), 1, false));
  }, [active, delay, progress, spin]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value * 0.85,
    transform: [
      { translateX: x * progress.value },
      { translateY: y * progress.value },
      { rotate: `${spin.value}deg` },
      { scale: 1 - progress.value * 0.35 },
    ],
  }));

  return <Animated.View style={[styles.confettiDot, { backgroundColor: color }, style]} />;
}

export function LevelUpModal({ visible, level, onDismiss }: Props) {
  const backdrop = useSharedValue(0);
  const badgeScale = useSharedValue(0.4);
  const badgeRotate = useSharedValue(-12);
  const glowPulse = useSharedValue(0);
  const contentY = useSharedValue(24);

  useEffect(() => {
    if (!visible || !level) return;

    backdrop.value = withTiming(1, { duration: 220 });
    badgeScale.value = withSequence(
      withSpring(1.12, { damping: 8, stiffness: 180 }),
      withSpring(1, { damping: 12, stiffness: 160 })
    );
    badgeRotate.value = withSequence(
      withSpring(8, { damping: 10, stiffness: 140 }),
      withSpring(0, { damping: 14, stiffness: 120 })
    );
    glowPulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 700 }), withTiming(0.35, { duration: 700 })),
      -1,
      true
    );
    contentY.value = withSpring(0, { damping: 14, stiffness: 120 });
  }, [visible, level, backdrop, badgeScale, badgeRotate, glowPulse, contentY]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }, { rotate: `${badgeRotate.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + glowPulse.value * 0.45,
    transform: [{ scale: 1 + glowPulse.value * 0.08 }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
    transform: [{ translateY: contentY.value }],
  }));

  if (!level) return null;

  const growth = getVolunteerGrowthStage(level.id);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />

        <Animated.View style={[styles.card, contentStyle]}>
          <Text style={styles.kicker}>LEVEL UP</Text>
          <Text style={styles.title}>You grew!</Text>

          <View style={styles.badgeWrap}>
            <Animated.View style={[styles.glow, glowStyle, { backgroundColor: level.color }]} />
            <Animated.View style={badgeStyle}>
              <LinearGradient
                colors={[level.bgColor, Colors.white, level.bgColor]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.badge, { borderColor: level.color }]}>
                <VolunteerGrowthTree levelId={level.id} size="lg" bare />
                <Text style={[styles.levelName, { color: level.color }]}>{level.name}</Text>
                <Text style={styles.levelRange}>
                  {growth.label} · {formatLevelRange(level)}
                </Text>
              </LinearGradient>
            </Animated.View>

            {CONFETTI.map((piece, index) => (
              <ConfettiDot key={index} {...piece} active={visible} />
            ))}
          </View>

          <Text style={styles.description}>
            Your seed has grown into a {growth.label.toLowerCase()}. {level.description}
          </Text>

          <Pressable style={[styles.button, { backgroundColor: level.color }]} onPress={onDismiss}>
            <Text style={styles.buttonText}>Keep showing up for Hazaribagh</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45, 79, 79, 0.78)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: Colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 6,
    marginBottom: Spacing.lg,
  },
  badgeWrap: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  glow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
  },
  badge: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: 4,
  },
  levelName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  levelRange: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  confettiDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  button: {
    width: '100%',
    borderRadius: Radius.pill,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
