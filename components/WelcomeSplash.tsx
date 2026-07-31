import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { TownTherapyLogo } from '@/components/TownTherapyLogo';
import { brand } from '@/constants/data';
import { Colors, Spacing } from '@/constants/theme';

const TOTAL_MS = 700;
const FADE_OUT_MS = 220;
const FADE_OUT_START_MS = TOTAL_MS - FADE_OUT_MS;

type Props = {
  onFinish: () => void;
};

export function WelcomeSplash({ onFinish }: Props) {
  const overlayOpacity = useSharedValue(1);
  const logoScale = useSharedValue(0.88);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(14);
  const subtitleOpacity = useSharedValue(0);
  const mottoOpacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
    logoScale.value = withSpring(1, {
      damping: 15,
      stiffness: 130,
    });

    titleOpacity.value = withDelay(
      260,
      withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) })
    );
    titleTranslateY.value = withDelay(
      260,
      withSpring(0, { damping: 16, stiffness: 130 })
    );

    subtitleOpacity.value = withDelay(
      480,
      withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })
    );

    mottoOpacity.value = withDelay(
      680,
      withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) })
    );

    overlayOpacity.value = withDelay(
      FADE_OUT_START_MS,
      withTiming(0, { duration: FADE_OUT_MS, easing: Easing.inOut(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onFinish)();
      })
    );
  }, [
    logoOpacity,
    logoScale,
    mottoOpacity,
    onFinish,
    overlayOpacity,
    subtitleOpacity,
    titleOpacity,
    titleTranslateY,
  ]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const mottoStyle = useAnimatedStyle(() => ({
    opacity: mottoOpacity.value,
  }));

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="auto">
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.background}>
        <View style={styles.content}>
          <Animated.View style={[styles.logoWrap, logoStyle]}>
            <View style={styles.logoGlow} />
            <TownTherapyLogo size={108} withShadow />
          </Animated.View>

          <Animated.Text style={[styles.title, titleStyle]}>Welcome to {brand.name}</Animated.Text>
          <Animated.Text style={[styles.subtitle, subtitleStyle]}>{brand.tagline}</Animated.Text>
          <Animated.Text style={[styles.motto, mottoStyle]}>{brand.motto}</Animated.Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  background: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  content: {
    alignItems: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  logoGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: Spacing.sm,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  motto: {
    marginTop: Spacing.md,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.4,
    textAlign: 'center',
  },
});
