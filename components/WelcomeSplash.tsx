import { Arvo_700Bold, useFonts as useArvoFonts } from '@expo-google-fonts/arvo';
import {
  CormorantGaramond_400Regular_Italic,
  useFonts as useCormorantFonts,
} from '@expo-google-fonts/cormorant-garamond';
import { Lato_400Regular, useFonts as useLatoFonts } from '@expo-google-fonts/lato';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SplashLandscape } from '@/components/SplashLandscape';
import { TownTherapyLogo } from '@/components/TownTherapyLogo';
import { Colors, Spacing } from '@/constants/theme';
import { useLocale } from '@/context/LocaleContext';

const TOTAL_MS = 3600;
const FADE_OUT_MS = 520;
const FADE_OUT_START_MS = TOTAL_MS - FADE_OUT_MS;

type Props = {
  onFinish: () => void;
};

/**
 * Brand splash — three-line welcome into the do-something club.
 */
export function WelcomeSplash({ onFinish }: Props) {
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const [arvoLoaded] = useArvoFonts({ Arvo_700Bold });
  const [latoLoaded] = useLatoFonts({ Lato_400Regular });
  const [cormorantLoaded] = useCormorantFonts({ CormorantGaramond_400Regular_Italic });
  const displayFont = arvoLoaded ? 'Arvo_700Bold' : undefined;
  const bridgeFont = latoLoaded ? 'Lato_400Regular' : undefined;
  const clubFont = cormorantLoaded ? 'CormorantGaramond_400Regular_Italic' : undefined;

  const overlayOpacity = useSharedValue(1);
  const sceneOpacity = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const logoY = useSharedValue(14);
  const line1Opacity = useSharedValue(0);
  const line1Y = useSharedValue(10);
  const bridgeOpacity = useSharedValue(0);
  const clubOpacity = useSharedValue(0);
  const clubY = useSharedValue(8);

  useEffect(() => {
    sceneOpacity.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });

    logoOpacity.value = withDelay(240, withTiming(1, { duration: 640, easing: Easing.out(Easing.cubic) }));
    logoY.value = withDelay(240, withTiming(0, { duration: 640, easing: Easing.out(Easing.cubic) }));

    line1Opacity.value = withDelay(500, withTiming(1, { duration: 540, easing: Easing.out(Easing.cubic) }));
    line1Y.value = withDelay(500, withTiming(0, { duration: 540, easing: Easing.out(Easing.cubic) }));

    bridgeOpacity.value = withDelay(760, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));

    clubOpacity.value = withDelay(980, withTiming(1, { duration: 540, easing: Easing.out(Easing.cubic) }));
    clubY.value = withDelay(980, withTiming(0, { duration: 540, easing: Easing.out(Easing.cubic) }));

    overlayOpacity.value = withDelay(
      FADE_OUT_START_MS,
      withTiming(0, { duration: FADE_OUT_MS, easing: Easing.inOut(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onFinish)();
      })
    );
  }, [
    bridgeOpacity,
    clubOpacity,
    clubY,
    line1Opacity,
    line1Y,
    logoOpacity,
    logoY,
    onFinish,
    overlayOpacity,
    sceneOpacity,
  ]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const sceneStyle = useAnimatedStyle(() => ({ opacity: sceneOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoY.value }],
  }));
  const line1Style = useAnimatedStyle(() => ({
    opacity: line1Opacity.value,
    transform: [{ translateY: line1Y.value }],
  }));
  const bridgeStyle = useAnimatedStyle(() => ({ opacity: bridgeOpacity.value }));
  const clubStyle = useAnimatedStyle(() => ({
    opacity: clubOpacity.value,
    transform: [{ translateY: clubY.value }],
  }));

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="auto">
      <Animated.View style={[StyleSheet.absoluteFill, sceneStyle]}>
        <SplashLandscape />
      </Animated.View>

      <LinearGradient
        colors={['rgba(20, 36, 36, 0.72)', 'rgba(36, 63, 63, 0.28)', 'rgba(18, 32, 32, 0.78)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(122, 222, 221, 0.08)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.35 }}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.content,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}>
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <View style={styles.logoRing} />
          <TownTherapyLogo size={108} withShadow />
        </Animated.View>

        <View style={styles.copyBlock}>
          <Animated.Text
            style={[styles.line1, displayFont && { fontFamily: displayFont }, line1Style]}>
            {t('splash.line1')}
          </Animated.Text>

          <Animated.Text
            style={[styles.bridge, bridgeFont && { fontFamily: bridgeFont }, bridgeStyle]}>
            {t('splash.bridge')}
          </Animated.Text>

          <Animated.Text
            style={[styles.club, clubFont && { fontFamily: clubFont }, clubStyle]}>
            {t('splash.club')}
          </Animated.Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: Colors.primaryDark,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  logoRing: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1,
    borderColor: 'rgba(122, 222, 221, 0.35)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  copyBlock: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  line1: {
    color: Colors.white,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 32,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  bridge: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    color: 'rgba(255,255,255,0.62)',
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 1.8,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  club: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 23,
    fontWeight: '400',
    letterSpacing: 0.2,
    lineHeight: 30,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
