import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { UPDATE_MOVEMENT_PHOTOS } from '@/constants/updateMovementPhotos';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { TownNewsItem } from '@/types/database';

const TEXT_HOLD_MS = 5600;
const PHOTO_HOLD_MS = 6500;
const FLASH_MS = 220;

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
export const HOME_HERO_HEIGHT = Math.round(SCREEN_HEIGHT * 0.52);

type Props = {
  items: TownNewsItem[];
  onPressItem?: (item: TownNewsItem) => void;
  top?: ReactNode;
  bottom?: ReactNode;
};

function clampIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

export function TownNewsBanner({ items, onPressItem, top, bottom }: Props) {
  const [textIndex, setTextIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const textIndexRef = useRef(0);
  const photoIndexRef = useRef(0);
  const itemsRef = useRef(items);
  const photoScrollRef = useRef<ScrollView>(null);
  const textScrollRef = useRef<ScrollView>(null);
  const photoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userTouchingPhoto = useRef(false);
  const userTouchingText = useRef(false);

  const flashOpacity = useSharedValue(0);

  itemsRef.current = items;
  const photoCount = UPDATE_MOVEMENT_PHOTOS.length;

  const clearPhotoTimer = () => {
    if (photoTimerRef.current) {
      clearTimeout(photoTimerRef.current);
      photoTimerRef.current = null;
    }
  };

  const clearTextTimer = () => {
    if (textTimerRef.current) {
      clearTimeout(textTimerRef.current);
      textTimerRef.current = null;
    }
  };

  const goToPhoto = useCallback(
    (next: number, animated = true) => {
      const index = clampIndex(next, photoCount);
      photoIndexRef.current = index;
      setPhotoIndex(index);
      photoScrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated });
    },
    [photoCount]
  );

  const goToText = useCallback(
    (next: number, animated = true) => {
      if (itemsRef.current.length === 0) return;
      const index = clampIndex(next, itemsRef.current.length);
      textIndexRef.current = index;
      setTextIndex(index);
      textScrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated });
      flashOpacity.value = withSequence(
        withTiming(0.28, { duration: FLASH_MS, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: FLASH_MS * 1.2, easing: Easing.in(Easing.quad) })
      );
    },
    [flashOpacity]
  );

  const schedulePhotoAdvance = useCallback(() => {
    clearPhotoTimer();
    if (photoCount < 2) return;
    photoTimerRef.current = setTimeout(() => {
      if (userTouchingPhoto.current) {
        schedulePhotoAdvance();
        return;
      }
      goToPhoto(photoIndexRef.current + 1, true);
      schedulePhotoAdvance();
    }, PHOTO_HOLD_MS);
  }, [goToPhoto, photoCount]);

  const scheduleTextAdvance = useCallback(() => {
    clearTextTimer();
    if (itemsRef.current.length < 2) return;
    textTimerRef.current = setTimeout(() => {
      if (userTouchingText.current) {
        scheduleTextAdvance();
        return;
      }
      goToText(textIndexRef.current + 1, true);
      scheduleTextAdvance();
    }, TEXT_HOLD_MS);
  }, [goToText]);

  useEffect(() => {
    textIndexRef.current = 0;
    setTextIndex(0);
    requestAnimationFrame(() => {
      textScrollRef.current?.scrollTo({ x: 0, animated: false });
    });
    scheduleTextAdvance();
    return () => clearTextTimer();
  }, [items, scheduleTextAdvance]);

  useEffect(() => {
    schedulePhotoAdvance();
    return () => clearPhotoTimer();
  }, [schedulePhotoAdvance]);

  const onPhotoScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    const index = clampIndex(next, photoCount);
    photoIndexRef.current = index;
    setPhotoIndex(index);
    userTouchingPhoto.current = false;
    schedulePhotoAdvance();
  };

  const onTextScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (items.length === 0) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    const index = clampIndex(next, items.length);
    textIndexRef.current = index;
    setTextIndex(index);
    userTouchingText.current = false;
    scheduleTextAdvance();
  };

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  return (
    <View style={styles.hero}>
      <View style={styles.photoStage}>
        <ScrollView
          ref={photoScrollRef}
          horizontal
          pagingEnabled
          bounces={false}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          scrollEventThrottle={16}
          onScrollBeginDrag={() => {
            userTouchingPhoto.current = true;
            clearPhotoTimer();
          }}
          onMomentumScrollEnd={onPhotoScrollEnd}
          style={StyleSheet.absoluteFill}
          contentContainerStyle={styles.photoTrack}>
          {UPDATE_MOVEMENT_PHOTOS.map((photo, index) => (
            <View key={`hero-photo-${index}`} style={styles.photoPage}>
              <Image
                source={photo}
                style={styles.photo}
                contentFit="cover"
                cachePolicy="memory-disk"
                priority={index === photoIndex ? 'high' : 'normal'}
                recyclingKey={`update-photo-${index}`}
              />
            </View>
          ))}
        </ScrollView>
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
        pointerEvents="none"
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View pointerEvents="none" style={[styles.flash, flashStyle]} />

      <View style={styles.heroInner} pointerEvents="box-none">
        {top}

        {items.length > 0 ? (
          <View style={styles.updateBlock} pointerEvents="box-none">
            <ScrollView
              ref={textScrollRef}
              horizontal
              pagingEnabled
              bounces={false}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              scrollEventThrottle={16}
              onScrollBeginDrag={() => {
                userTouchingText.current = true;
                clearTextTimer();
              }}
              onMomentumScrollEnd={onTextScrollEnd}
              style={styles.updatePager}>
              {items.map((entry) => (
                <Pressable
                  key={entry.id}
                  accessibilityRole="button"
                  accessibilityLabel={entry.text}
                  onPress={() => onPressItem?.(entry)}
                  style={({ pressed }) => [
                    styles.updatePage,
                    pressed && styles.pressed,
                  ]}>
                  <View style={styles.updateContent}>
                    <View style={styles.iconWrap}>
                      <Ionicons
                        name={entry.icon as keyof typeof Ionicons.glyphMap}
                        size={18}
                        color={Colors.white}
                      />
                    </View>
                    <Animated.Text style={styles.updateText} numberOfLines={3}>
                      {entry.text}
                    </Animated.Text>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.85)" />
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            {items.length > 1 ? (
              <View style={styles.dots}>
                {items.map((entry, dotIndex) => (
                  <Pressable
                    key={entry.id}
                    hitSlop={8}
                    onPress={() => {
                      goToText(dotIndex, true);
                      scheduleTextAdvance();
                    }}
                    style={[styles.dot, dotIndex === textIndex % items.length && styles.dotActive]}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {photoCount > 1 ? (
          <View style={styles.photoDots} pointerEvents="box-none">
            {UPDATE_MOVEMENT_PHOTOS.map((_, dotIndex) => (
              <Pressable
                key={`photo-dot-${dotIndex}`}
                hitSlop={8}
                onPress={() => {
                  goToPhoto(dotIndex, true);
                  schedulePhotoAdvance();
                }}
                style={[styles.photoDot, dotIndex === photoIndex && styles.photoDotActive]}
              />
            ))}
          </View>
        ) : null}

        {bottom}
      </View>
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
  photoTrack: {
    alignItems: 'stretch',
  },
  photoPage: {
    width: SCREEN_WIDTH,
    height: HOME_HERO_HEIGHT,
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
  updateBlock: {
    marginTop: 'auto',
    gap: Spacing.xs,
  },
  updatePager: {
    marginHorizontal: -Spacing.lg,
  },
  updatePage: {
    width: SCREEN_WIDTH,
    paddingHorizontal: Spacing.lg,
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
  photoDots: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xl + 52,
    flexDirection: 'column',
    gap: 6,
    alignItems: 'center',
  },
  photoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  photoDotActive: {
    height: 14,
    backgroundColor: Colors.white,
  },
});
