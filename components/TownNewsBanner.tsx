import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { UPDATE_MOVEMENT_PHOTOS } from '@/constants/updateMovementPhotos';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { TownNewsItem } from '@/types/database';

const TEXT_HOLD_MS = 4800;
const TEXT_FADE_MS = 420;
const PHOTO_HOLD_MS = 5500;
const PHOTO_FADE_MS = 900;
const FLASH_MS = 280;

const SCREEN_HEIGHT = Dimensions.get('window').height;
export const HOME_HERO_HEIGHT = Math.round(SCREEN_HEIGHT * 0.52);

type Props = {
  items: TownNewsItem[];
  onPressItem?: (item: TownNewsItem) => void;
  top?: ReactNode;
  bottom?: ReactNode;
};

export function TownNewsBanner({ items, onPressItem, top, bottom }: Props) {
  const [textIndex, setTextIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [incomingPhotoIndex, setIncomingPhotoIndex] = useState(1);
  const textIndexRef = useRef(0);
  const photoIndexRef = useRef(0);
  const itemsRef = useRef(items);

  const textOpacity = useSharedValue(1);
  const textTranslateY = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const incomingPhotoOpacity = useSharedValue(0);
  const photoScale = useSharedValue(1);

  itemsRef.current = items;
  const item = items[textIndex % Math.max(items.length, 1)];
  const currentPhoto = UPDATE_MOVEMENT_PHOTOS[photoIndex % UPDATE_MOVEMENT_PHOTOS.length];
  const incomingPhoto = UPDATE_MOVEMENT_PHOTOS[incomingPhotoIndex % UPDATE_MOVEMENT_PHOTOS.length];

  useEffect(() => {
    textIndexRef.current = 0;
    setTextIndex(0);
  }, [items]);

  useEffect(() => {
    photoScale.value = 1;
    photoScale.value = withRepeat(
      withTiming(1.03, { duration: PHOTO_HOLD_MS + PHOTO_FADE_MS, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );
  }, [photoIndex, photoScale]);

  useEffect(() => {
    if (items.length < 2) return;

    let cancelled = false;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    let swapTimer: ReturnType<typeof setTimeout> | undefined;

    const showNextText = () => {
      if (cancelled) return;

      textOpacity.value = withTiming(0, { duration: TEXT_FADE_MS, easing: Easing.in(Easing.cubic) });
      textTranslateY.value = withTiming(-8, { duration: TEXT_FADE_MS, easing: Easing.in(Easing.cubic) });
      flashOpacity.value = withSequence(
        withTiming(0.4, { duration: FLASH_MS, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: FLASH_MS * 1.4, easing: Easing.in(Easing.quad) })
      );

      swapTimer = setTimeout(() => {
        if (cancelled) return;

        const nextIndex = (textIndexRef.current + 1) % itemsRef.current.length;
        textIndexRef.current = nextIndex;
        setTextIndex(nextIndex);

        textTranslateY.value = 10;
        textOpacity.value = 0;
        textOpacity.value = withTiming(1, { duration: TEXT_FADE_MS, easing: Easing.out(Easing.cubic) });
        textTranslateY.value = withTiming(0, { duration: TEXT_FADE_MS, easing: Easing.out(Easing.cubic) });

        holdTimer = setTimeout(showNextText, TEXT_HOLD_MS);
      }, TEXT_FADE_MS);
    };

    holdTimer = setTimeout(showNextText, TEXT_HOLD_MS);

    return () => {
      cancelled = true;
      if (holdTimer) clearTimeout(holdTimer);
      if (swapTimer) clearTimeout(swapTimer);
    };
  }, [flashOpacity, items.length, textOpacity, textTranslateY]);

  useEffect(() => {
    let cancelled = false;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    let swapTimer: ReturnType<typeof setTimeout> | undefined;

    const showNextPhoto = () => {
      if (cancelled) return;

      const next = (photoIndexRef.current + 1) % UPDATE_MOVEMENT_PHOTOS.length;
      setIncomingPhotoIndex(next);
      incomingPhotoOpacity.value = 0;
      incomingPhotoOpacity.value = withTiming(1, {
        duration: PHOTO_FADE_MS,
        easing: Easing.inOut(Easing.cubic),
      });

      swapTimer = setTimeout(() => {
        if (cancelled) return;
        photoIndexRef.current = next;
        setPhotoIndex(next);
        incomingPhotoOpacity.value = 0;
        holdTimer = setTimeout(showNextPhoto, PHOTO_HOLD_MS);
      }, PHOTO_FADE_MS);
    };

    holdTimer = setTimeout(showNextPhoto, PHOTO_HOLD_MS);

    return () => {
      cancelled = true;
      if (holdTimer) clearTimeout(holdTimer);
      if (swapTimer) clearTimeout(swapTimer);
    };
  }, [incomingPhotoOpacity]);

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const photoMotionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: photoScale.value }],
  }));

  const incomingPhotoStyle = useAnimatedStyle(() => ({
    opacity: incomingPhotoOpacity.value,
  }));

  const content = (
    <View style={styles.heroInner}>
      {top}

      {item ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.text}
            onPress={() => onPressItem?.(item)}
            style={({ pressed }) => [styles.updateRow, pressed && styles.pressed]}>
            <Animated.View style={[styles.updateContent, textStyle]}>
              <View style={styles.iconWrap}>
                <Ionicons
                  name={item.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={Colors.white}
                />
              </View>
              <Animated.Text style={styles.updateText} numberOfLines={3}>
                {item.text}
              </Animated.Text>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.85)" />
            </Animated.View>
          </Pressable>

          {items.length > 1 ? (
            <View style={styles.dots}>
              {items.map((entry, dotIndex) => (
                <View
                  key={entry.id}
                  style={[styles.dot, dotIndex === textIndex % items.length && styles.dotActive]}
                />
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      {bottom}
    </View>
  );

  if (!item) {
    return (
      <View style={styles.hero}>
        <View style={styles.photoStage}>
          <Animated.View style={[styles.photoMotion, photoMotionStyle]}>
            <Image
              source={currentPhoto}
              style={styles.photo}
              contentFit="cover"
              cachePolicy="memory-disk"
              priority="high"
              recyclingKey={`update-photo-${photoIndex}`}
            />
            <Animated.View style={[styles.photoLayer, incomingPhotoStyle]}>
              <Image
                source={incomingPhoto}
                style={styles.photo}
                contentFit="cover"
                cachePolicy="memory-disk"
                priority="high"
                recyclingKey={`update-photo-in-${incomingPhotoIndex}`}
              />
            </Animated.View>
          </Animated.View>
        </View>
        <LinearGradient
          colors={[
            'rgba(44,76,76,0.92)',
            'rgba(44,76,76,0.62)',
            'rgba(44,76,76,0.22)',
            'rgba(44,76,76,0)',
            'rgba(15,30,30,0.35)',
            'rgba(15,30,30,0.82)',
          ]}
          locations={[0, 0.14, 0.28, 0.42, 0.7, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        {content}
      </View>
    );
  }

  return (
    <View style={styles.hero}>
      <View style={styles.photoStage}>
        <Animated.View style={[styles.photoMotion, photoMotionStyle]}>
          <Image
            source={currentPhoto}
            style={styles.photo}
            contentFit="cover"
            cachePolicy="memory-disk"
            priority="high"
            recyclingKey={`update-photo-${photoIndex}`}
          />
          <Animated.View style={[styles.photoLayer, incomingPhotoStyle]}>
            <Image
              source={incomingPhoto}
              style={styles.photo}
              contentFit="cover"
              cachePolicy="memory-disk"
              priority="high"
              recyclingKey={`update-photo-in-${incomingPhotoIndex}`}
            />
          </Animated.View>
        </Animated.View>
      </View>

      {/* Soft teal wash: strong at top for brand, long fade into the photo */}
      <LinearGradient
        colors={[
          'rgba(44,76,76,0.92)',
          'rgba(44,76,76,0.62)',
          'rgba(44,76,76,0.22)',
          'rgba(44,76,76,0)',
          'rgba(15,30,30,0.35)',
          'rgba(15,30,30,0.82)',
        ]}
        locations={[0, 0.14, 0.28, 0.42, 0.7, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View pointerEvents="none" style={[styles.flash, flashStyle]} />

      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: HOME_HERO_HEIGHT,
    overflow: 'hidden',
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
    backgroundColor: Colors.primaryDark,
  },
  photoStage: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  photoMotion: {
    ...StyleSheet.absoluteFillObject,
  },
  photoLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  heroInner: {
    flex: 1,
    minHeight: HOME_HERO_HEIGHT,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  pressed: {
    opacity: 0.92,
  },
  updateRow: {
    marginTop: 'auto',
  },
  updateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  updateText: {
    flex: 1,
    color: Colors.white,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: -Spacing.xs,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    width: 16,
    backgroundColor: Colors.white,
  },
});
