import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { unloadChalkSound } from '@/lib/chalkSound';

/** Hand art with chalk punched out — colored stick is drawn underneath. */
const HAND_IMAGE = require('@/assets/images/hand-holding-chalk.png');

/** Average Caveat glyph advance — backtrack to the start of each letter. */
const AVG_LETTER_W = 10;

/** Display size for the hand graphic. */
const HAND_W = 28;
const HAND_H = 35;
/** Tip of chalk inside the cropped asset (fraction of width/height). */
const TIP_FX = 0.023;
const TIP_FY = 0.053;
/** Chalk stick geometry in hand-local space. */
const CHALK_LEN = HAND_W * 0.72;
const CHALK_THICK = Math.max(3, HAND_W * 0.14);
const CHALK_ANGLE = '32deg';

export type CaretPoint = { x: number; y: number };

type DustMote = {
  id: number;
  x: number;
  y: number;
  driftX: number;
  driftY: number;
  size: number;
  delay: number;
};

type Props = {
  active: boolean;
  chalkColor: string;
  caret: CaretPoint;
  strokePulse: number;
};

function DustParticle({
  mote,
  color,
  onDone,
}: {
  mote: DustMote;
  color: string;
  onDone: (id: number) => void;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      progress.value = withTiming(1, {
        duration: 520 + mote.size * 60,
        easing: Easing.out(Easing.quad),
      });
    }, mote.delay);
    const clear = setTimeout(() => onDone(mote.id), mote.delay + 620);
    return () => {
      clearTimeout(timer);
      clearTimeout(clear);
    };
  }, [mote.delay, mote.id, mote.size, onDone, progress]);

  const style = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      opacity: interpolate(t, [0, 0.08, 0.7, 1], [0, 0.85, 0.45, 0]),
      transform: [
        { translateX: mote.x + mote.driftX * t },
        { translateY: mote.y + mote.driftY * t + t * t * 18 },
        { scale: interpolate(t, [0, 1], [1, 0.4]) },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.dust,
        style,
        {
          width: mote.size,
          height: mote.size,
          borderRadius: mote.size / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}

/**
 * Illustrated hand holding chalk — chalk stick tint follows the selected color.
 */
export function ChalkWritingHand({ active, chalkColor, caret, strokePulse }: Props) {
  const tipX = useSharedValue(caret.x);
  const tipY = useSharedValue(caret.y);
  const angle = useSharedValue(-8);
  const press = useSharedValue(0);
  const visible = useSharedValue(0);
  const lastPulse = useRef(0);
  const writingRef = useRef(false);
  const strokePulseRef = useRef(strokePulse);
  const caretRef = useRef(caret);
  strokePulseRef.current = strokePulse;
  caretRef.current = caret;
  const [inkRequest, setInkRequest] = useState(0);
  const [dust, setDust] = useState<DustMote[]>([]);

  useEffect(() => {
    if (strokePulse <= lastPulse.current) return;
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setInkRequest((n) => n + 1);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [strokePulse]);

  useEffect(() => {
    if (!active) {
      visible.value = withTiming(0, { duration: 140 });
      press.value = 0;
      writingRef.current = false;
      lastPulse.current = strokePulseRef.current;
      setDust([]);
      void unloadChalkSound();
      return;
    }

    lastPulse.current = strokePulseRef.current;
    visible.value = withTiming(1, { duration: 160 });
    tipX.value = caretRef.current.x;
    tipY.value = caretRef.current.y;
  }, [active, press, tipX, tipY, visible]);

  useEffect(() => {
    if (!active || writingRef.current) return;
    tipX.value = withTiming(caret.x, { duration: 160, easing: Easing.out(Easing.cubic) });
    tipY.value = withTiming(caret.y, { duration: 160, easing: Easing.out(Easing.cubic) });
  }, [active, caret.x, caret.y, tipX, tipY]);

  useEffect(() => {
    if (!active || inkRequest <= 0) return;
    if (strokePulseRef.current <= lastPulse.current) return;

    const pulse = strokePulseRef.current;
    lastPulse.current = pulse;
    writingRef.current = true;

    const endX = caretRef.current.x;
    const endY = caretRef.current.y;
    const startX = Math.max(4, endX - AVG_LETTER_W);
    const topY = endY - 10;
    const midY = endY - 3;

    tipX.value = startX;
    tipY.value = topY - 2;
    press.value = 0;

    tipX.value = withSequence(
      withTiming(startX + 1, { duration: 30, easing: Easing.out(Easing.quad) }),
      withTiming(startX + 3, { duration: 55, easing: Easing.inOut(Easing.quad) }),
      withTiming(endX, { duration: 70, easing: Easing.out(Easing.cubic) })
    );
    tipY.value = withSequence(
      withTiming(topY, { duration: 30, easing: Easing.out(Easing.quad) }),
      withTiming(midY, { duration: 55, easing: Easing.inOut(Easing.quad) }),
      withTiming(endY, { duration: 70, easing: Easing.out(Easing.cubic) })
    );
    press.value = withSequence(
      withTiming(0.9, { duration: 28 }),
      withTiming(1, { duration: 75 }),
      withTiming(0.2, { duration: 50 })
    );
    angle.value = withSequence(
      withTiming(-12, { duration: 40 }),
      withTiming(-6, { duration: 90 }),
      withTiming(-8, { duration: 50 })
    );

    const burst: DustMote[] = Array.from({ length: 5 }).map((_, index) => {
      const t = index / 4;
      return {
        id: Date.now() + index + Math.random(),
        x: startX + (endX - startX) * t + (Math.random() - 0.5) * 3,
        y: topY + (endY - topY) * t + (Math.random() - 0.5) * 2,
        driftX: -2 + Math.random() * 5,
        driftY: 6 + Math.random() * 10,
        size: 0.8 + Math.random() * 1.2,
        delay: 20 + index * 28,
      };
    });
    setDust((prev) => [...prev.slice(-12), ...burst]);

    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => undefined);
    }

    const doneTimer = setTimeout(() => {
      writingRef.current = false;
    }, 170);

    return () => clearTimeout(doneTimer);
  }, [active, angle, inkRequest, press, tipX, tipY]);

  const removeDust = useCallback((id: number) => {
    setDust((prev) => prev.filter((mote) => mote.id !== id));
  }, []);

  const handStyle = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [
      { translateX: tipX.value },
      { translateY: tipY.value + press.value * 0.5 },
      { rotate: `${angle.value}deg` },
      { scale: 0.97 + press.value * 0.03 },
    ],
  }));

  if (!active) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {dust.map((mote) => (
        <DustParticle key={mote.id} mote={mote} color={chalkColor} onDone={removeDust} />
      ))}
      <Animated.View style={[styles.handAnchor, handStyle]}>
        <View
          style={[
            styles.handBitmap,
            {
              transform: [
                { translateX: -HAND_W * TIP_FX },
                { translateY: -HAND_H * TIP_FY },
              ],
            },
          ]}>
          {/* Colored chalk sits under the hand so fingers occlude it */}
          <View
            style={[
              styles.chalkPivot,
              {
                left: HAND_W * TIP_FX,
                top: HAND_H * TIP_FY,
              },
            ]}>
            <View style={[styles.chalkStick, { backgroundColor: chalkColor }]} />
          </View>
          <Image source={HAND_IMAGE} style={styles.handImage} resizeMode="contain" />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },
  dust: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  handAnchor: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 1,
    height: 1,
  },
  handBitmap: {
    width: HAND_W,
    height: HAND_H,
  },
  chalkPivot: {
    position: 'absolute',
    width: 1,
    height: 1,
    zIndex: 0,
    transform: [{ rotate: CHALK_ANGLE }],
  },
  chalkStick: {
    position: 'absolute',
    left: 0,
    top: -CHALK_THICK / 2,
    width: CHALK_LEN,
    height: CHALK_THICK,
    borderRadius: CHALK_THICK / 2,
  },
  handImage: {
    width: HAND_W,
    height: HAND_H,
    zIndex: 1,
  },
});
