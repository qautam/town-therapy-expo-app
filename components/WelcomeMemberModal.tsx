import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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

import { TownTherapyLogo } from '@/components/TownTherapyLogo';
import { VolunteerGrowthTree } from '@/components/VolunteerGrowthTree';
import { Colors, Radius, Spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  memberName?: string | null;
  onDismiss: () => void;
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const COLORS = [
  '#FFD166',
  '#06D6A0',
  '#EF476F',
  '#118AB2',
  '#8338EC',
  '#FF9F1C',
  '#2EC4B6',
  '#E63946',
  '#F4A261',
  '#2A9D8F',
  '#E9C46A',
  '#F72585',
  '#90BE6D',
  '#577590',
];

function buildConfetti(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const left = Math.random() * SCREEN_W;
    const drift = (Math.random() - 0.5) * 90;
    const size = 6 + Math.random() * 8;
    const tall = Math.random() > 0.45;
    return {
      id: index,
      left,
      delay: Math.floor(Math.random() * 500),
      duration: 1800 + Math.floor(Math.random() * 1200),
      drift,
      color: COLORS[index % COLORS.length],
      width: tall ? size * 0.55 : size,
      height: tall ? size * 1.4 : size,
      spin: 180 + Math.random() * 540,
      startY: -20 - Math.random() * 40,
      endY: SCREEN_H * (0.55 + Math.random() * 0.4),
    };
  });
}

function FallingConfetti({
  left,
  delay,
  duration,
  drift,
  color,
  width,
  height,
  spin,
  startY,
  endY,
  active,
}: {
  left: number;
  delay: number;
  duration: number;
  drift: number;
  color: string;
  width: number;
  height: number;
  spin: number;
  startY: number;
  endY: number;
  active: boolean;
}) {
  const progress = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      progress.value = 0;
      rotation.value = 0;
      return;
    }

    progress.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.quad) })
    );
    rotation.value = withDelay(
      delay,
      withTiming(spin, { duration, easing: Easing.linear })
    );
  }, [active, delay, duration, progress, rotation, spin]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value < 0.85 ? 1 : 1 - (progress.value - 0.85) / 0.15,
    transform: [
      { translateX: left + drift * progress.value },
      { translateY: startY + (endY - startY) * progress.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.confetti,
        {
          width,
          height,
          backgroundColor: color,
          borderRadius: Math.min(width, height) / 2,
        },
        style,
      ]}
    />
  );
}

function BurstDot({
  angle,
  distance,
  color,
  delay,
  active,
}: {
  angle: number;
  distance: number;
  color: string;
  delay: number;
  active: boolean;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      progress.value = 0;
      return;
    }
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })
    );
  }, [active, delay, progress]);

  const style = useAnimatedStyle(() => {
    const rad = (angle * Math.PI) / 180;
    return {
      opacity: 1 - progress.value,
      transform: [
        { translateX: Math.cos(rad) * distance * progress.value },
        { translateY: Math.sin(rad) * distance * progress.value },
        { scale: 1 - progress.value * 0.4 },
      ],
    };
  });

  return <Animated.View style={[styles.burstDot, { backgroundColor: color }, style]} />;
}

export function WelcomeMemberModal({ visible, memberName, onDismiss }: Props) {
  const confetti = useMemo(() => buildConfetti(42), [visible]);
  const backdrop = useSharedValue(0);
  const cardScale = useSharedValue(0.88);
  const cardY = useSharedValue(36);
  const seedPulse = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;

    backdrop.value = withTiming(1, { duration: 240 });
    cardScale.value = withSequence(
      withSpring(1.05, { damping: 8, stiffness: 160 }),
      withSpring(1, { damping: 12, stiffness: 140 })
    );
    cardY.value = withSpring(0, { damping: 14, stiffness: 120 });
    seedPulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })),
      -1,
      false
    );
  }, [visible, backdrop, cardScale, cardY, seedPulse]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
    transform: [{ translateY: cardY.value }, { scale: cardScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + seedPulse.value * 0.35,
    transform: [{ scale: 0.92 + seedPulse.value * 0.12 }],
  }));

  const firstName = memberName?.trim().split(/\s+/)[0];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]} />

        <View style={styles.confettiLayer} pointerEvents="none">
          {confetti.map((piece) => (
            <FallingConfetti key={piece.id} {...piece} active={visible} />
          ))}
        </View>

        <Animated.View style={[styles.card, cardStyle]}>
          <LinearGradient
            colors={['#FFF8F0', '#FFFFFF', '#F3F8F4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardInner}>
            <View style={styles.heroArt}>
              <Animated.View style={[styles.seedGlow, glowStyle]} />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, index) => (
                <BurstDot
                  key={angle}
                  angle={angle}
                  distance={78}
                  color={COLORS[index % COLORS.length]}
                  delay={index * 30}
                  active={visible}
                />
              ))}
              <TownTherapyLogo size={64} withShadow />
              <View style={styles.seedBadge}>
                <VolunteerGrowthTree levelId="supporter" size="lg" bare />
              </View>
            </View>

            <Text style={styles.kicker}>WELCOME TO THE FAMILY</Text>
            <Text style={styles.title}>
              Congratulations{firstName ? `, ${firstName}` : ''}!
            </Text>
            <Text style={styles.message}>
              You are now a Town Therapy member. Your journey begins as a seed — every drive helps it
              grow into a sapling, then a mighty tree for Hazaribagh.
            </Text>

            <View style={styles.journeyRow}>
              {(['supporter', 'contributor', 'guardian', 'champion', 'elite', 'legend'] as const).map(
                (id, index) => (
                  <View key={id} style={styles.journeyStep}>
                    <VolunteerGrowthTree levelId={id} size="sm" />
                    {index < 5 ? <View style={styles.journeyDot} /> : null}
                  </View>
                )
              )}
            </View>

            <Pressable style={styles.button} onPress={onDismiss}>
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}>
                <Text style={styles.buttonText}>Let's heal Hazaribagh</Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
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
    backgroundColor: 'rgba(36, 63, 63, 0.88)',
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  confetti: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  burstDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  cardInner: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  heroArt: {
    width: 180,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  seedGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.orange,
  },
  seedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 18,
  },
  kicker: {
    marginTop: Spacing.xs,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.2,
    color: Colors.orange,
  },
  title: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 34,
  },
  message: {
    marginTop: Spacing.md,
    fontSize: 15,
    lineHeight: 23,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  journeyStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  journeyDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginHorizontal: 1,
  },
  button: {
    width: '100%',
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
