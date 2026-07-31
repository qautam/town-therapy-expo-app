import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { SUSTAINABILITY_TIPS, shuffleTips, type SustainabilityTip } from '@/constants/sustainabilityTips';
import { Colors, Radius, Spacing } from '@/constants/theme';

const HOLD_MS = 4800;
const FLIP_MS = 640;

type Props = {
  tips?: SustainabilityTip[];
};

function nextShuffledDeck(source: SustainabilityTip[], avoidId?: string) {
  let deck = shuffleTips(source);
  if (deck.length > 1 && avoidId && deck[0]?.id === avoidId) {
    const swapWith = 1 + Math.floor(Math.random() * (deck.length - 1));
    [deck[0], deck[swapWith]] = [deck[swapWith], deck[0]];
  }
  return deck;
}

function TipFace({ tip }: { tip: SustainabilityTip }) {
  return (
    <View style={styles.faceInner}>
      <View style={styles.iconWrap}>
        <LinearGradient
          colors={[Colors.orangeLight, '#FFE4CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconGradient}>
          <Ionicons name={tip.icon} size={22} color={Colors.orange} />
        </LinearGradient>
      </View>
      <Text style={styles.tipText} numberOfLines={4}>
        {tip.text}
      </Text>
    </View>
  );
}

export function SustainabilityTipsTicker({ tips = SUSTAINABILITY_TIPS }: Props) {
  const [deck, setDeck] = useState(() => shuffleTips(tips));
  const [index, setIndex] = useState(0);
  const [incomingTip, setIncomingTip] = useState<SustainabilityTip | null>(null);
  const indexRef = useRef(0);
  const deckRef = useRef(deck);
  const tipsRef = useRef(tips);
  const flippingRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const midTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flipToNextRef = useRef<() => void>(() => {});

  // 0 = current face up; 0.5 = edge-on (swap); 1 = next face settled
  const flip = useSharedValue(0);

  deckRef.current = deck;
  tipsRef.current = tips;

  const currentTip = deck[index % Math.max(deck.length, 1)] ?? tips[0];
  const peekTip =
    incomingTip ??
    deck[(index + 1) % Math.max(deck.length, 1)] ??
    tips[Math.min(1, tips.length - 1)] ??
    tips[0];

  const clearTimers = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (midTimerRef.current) clearTimeout(midTimerRef.current);
    if (endTimerRef.current) clearTimeout(endTimerRef.current);
    holdTimerRef.current = undefined;
    midTimerRef.current = undefined;
    endTimerRef.current = undefined;
  }, []);

  const scheduleAutoFlip = useCallback(() => {
    if (tipsRef.current.length < 2) return;
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => flipToNextRef.current(), HOLD_MS);
  }, []);

  const flipToNext = useCallback(() => {
    if (tipsRef.current.length < 2 || flippingRef.current) return;
    flippingRef.current = true;
    clearTimers();

    const currentDeck = deckRef.current;
    const currentIndex = indexRef.current;
    const atEnd = currentIndex >= currentDeck.length - 1;

    let upcomingTip: SustainabilityTip;
    let reshuffled: SustainabilityTip[] | null = null;
    let nextIndex: number;

    if (atEnd) {
      reshuffled = nextShuffledDeck(tipsRef.current, currentDeck[currentIndex]?.id);
      upcomingTip = reshuffled[0];
      nextIndex = 0;
    } else {
      nextIndex = currentIndex + 1;
      upcomingTip = currentDeck[nextIndex];
    }

    setIncomingTip(upcomingTip);

    flip.value = withTiming(0.5, {
      duration: FLIP_MS / 2,
      easing: Easing.in(Easing.cubic),
    });

    midTimerRef.current = setTimeout(() => {
      if (reshuffled) {
        deckRef.current = reshuffled;
        setDeck(reshuffled);
      }
      indexRef.current = nextIndex;
      setIndex(nextIndex);

      flip.value = 0.5;
      flip.value = withTiming(1, {
        duration: FLIP_MS / 2,
        easing: Easing.out(Easing.cubic),
      });

      endTimerRef.current = setTimeout(() => {
        flip.value = 0;
        setIncomingTip(null);
        flippingRef.current = false;
        scheduleAutoFlip();
      }, FLIP_MS / 2);
    }, FLIP_MS / 2);
  }, [clearTimers, flip, scheduleAutoFlip]);

  flipToNextRef.current = flipToNext;

  useEffect(() => {
    const shuffled = shuffleTips(tips);
    deckRef.current = shuffled;
    setDeck(shuffled);
    indexRef.current = 0;
    setIndex(0);
    setIncomingTip(null);
    flip.value = 0;
    flippingRef.current = false;
  }, [flip, tips]);

  useEffect(() => {
    scheduleAutoFlip();
    return () => {
      clearTimers();
      flippingRef.current = false;
    };
  }, [clearTimers, scheduleAutoFlip, tips.length]);

  const frontFaceStyle = useAnimatedStyle(() => {
    const rotateX = interpolate(flip.value, [0, 0.5, 1], [0, -90, -90], Extrapolation.CLAMP);
    const opacity = interpolate(flip.value, [0, 0.42, 0.5], [1, 0.4, 0], Extrapolation.CLAMP);
    const lift = interpolate(flip.value, [0, 0.5], [0, -12], Extrapolation.CLAMP);
    return {
      opacity,
      zIndex: flip.value < 0.5 ? 4 : 1,
      transform: [{ perspective: 1100 }, { translateY: lift }, { rotateX: `${rotateX}deg` }],
    };
  });

  const backFaceStyle = useAnimatedStyle(() => {
    const rotateX = interpolate(flip.value, [0, 0.5, 1], [90, 90, 0], Extrapolation.CLAMP);
    const opacity = interpolate(flip.value, [0.5, 0.58, 1], [0, 0.4, 1], Extrapolation.CLAMP);
    const lift = interpolate(flip.value, [0.5, 1], [-12, 0], Extrapolation.CLAMP);
    return {
      opacity,
      zIndex: flip.value >= 0.5 ? 4 : 2,
      transform: [{ perspective: 1100 }, { translateY: lift }, { rotateX: `${rotateX}deg` }],
    };
  });

  const stackShiftStyle = useAnimatedStyle(() => {
    const settle = interpolate(flip.value, [0, 0.5, 1], [0, 4, 0], Extrapolation.CLAMP);
    return { transform: [{ translateY: settle }] };
  });

  if (!currentTip || !peekTip) return null;

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons name="leaf" size={12} color={Colors.primary} />
          <Text style={styles.badgeText}>Green tip</Text>
        </View>
        <Text style={styles.tapHint}>Tap to flip</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Show next green tip"
        onPress={flipToNext}
        disabled={tips.length < 2}>
        <Animated.View style={[styles.stack, stackShiftStyle]}>
          {/* Stacked tiles underneath */}
          <View pointerEvents="none" style={[styles.tile, styles.stackCard, styles.stackCardDeep]} />
          <View pointerEvents="none" style={[styles.tile, styles.stackCard, styles.stackCardMid]} />

          <View style={styles.flipStage} pointerEvents="none">
            {/* Incoming tip — rotates up as the top tile flips away */}
            <Animated.View style={[styles.tile, styles.face, backFaceStyle]}>
              <LinearGradient
                colors={['#F7FBFA', Colors.white, '#FFF8F2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tileFill}>
                <TipFace tip={peekTip} />
              </LinearGradient>
            </Animated.View>

            {/* Current tip — flips over like a card off the stack */}
            <Animated.View style={[styles.tile, styles.face, frontFaceStyle]}>
              <LinearGradient
                colors={['#F7FBFA', Colors.white, '#FFF8F2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tileFill}>
                <TipFace tip={currentTip} />
              </LinearGradient>
            </Animated.View>
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: Spacing.sm,
  },
  header: {
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(45, 79, 79, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  tapHint: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  stack: {
    position: 'relative',
    minHeight: 124,
    marginBottom: 10,
  },
  flipStage: {
    minHeight: 118,
  },
  tile: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    backgroundColor: Colors.white,
  },
  stackCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 118,
    backgroundColor: '#EEF6F4',
  },
  stackCardDeep: {
    top: 12,
    left: 12,
    right: 12,
    opacity: 0.5,
    transform: [{ scale: 0.93 }],
  },
  stackCardMid: {
    top: 6,
    left: 6,
    right: 6,
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
    backgroundColor: '#F4FAF8',
    shadowColor: Colors.primary,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  face: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    minHeight: 118,
    backfaceVisibility: 'hidden',
    shadowColor: Colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tileFill: {
    minHeight: 118,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    justifyContent: 'center',
  },
  faceInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  iconWrap: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  iconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: Colors.text,
    letterSpacing: 0.1,
  },
});
