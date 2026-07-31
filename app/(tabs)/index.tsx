import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import {
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CitizenStickyNotes } from '@/components/CitizenStickyNotes';
import { HomeBrandHeader } from '@/components/HomeBrandHeader';
import { HomeSection } from '@/components/HomeSection';
import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';
import { SustainabilityTipsTicker } from '@/components/SustainabilityTipsTicker';
import { TownNewsBanner } from '@/components/TownNewsBanner';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useVolunteer } from '@/context/VolunteerContext';
import { api, formatEventDateParts } from '@/lib/api';
import { cacheGetOrFetch, cacheInvalidate } from '@/lib/queryCache';
import { buildTownNewsItems } from '@/lib/townNews';
import type { StickyNote } from '@/lib/stickyNotes';
import type { DashboardStats, Event, TownNewsItem } from '@/types/database';

const HOME_TTL_MS = 90_000;

function ActionTile({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const press = useSharedValue(0);
  const [pressed, setPressedState] = useState(false);

  const tileStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(press.value, [0, 1], [Colors.white, Colors.primary]),
    borderColor: interpolateColor(press.value, [0, 1], [Colors.border, Colors.primaryDark]),
    transform: [{ scale: 1 - press.value * 0.045 }],
  }));

  const iconWrapStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      press.value,
      [0, 1],
      [Colors.greenLight, 'rgba(255,255,255,0.18)']
    ),
  }));

  const titleStyle = useAnimatedStyle(() => ({
    color: interpolateColor(press.value, [0, 1], [Colors.text, Colors.white]),
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    color: interpolateColor(press.value, [0, 1], [Colors.textSecondary, 'rgba(255,255,255,0.82)']),
  }));

  const setPressed = (active: boolean) => {
    setPressedState(active);
    press.value = withSpring(active ? 1 : 0, {
      damping: 16,
      stiffness: 280,
      mass: 0.7,
    });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={styles.actionPressable}>
      <Animated.View style={[styles.actionTile, tileStyle]}>
        <Animated.View style={[styles.actionIcon, iconWrapStyle]}>
          <Ionicons name={icon} size={18} color={pressed ? Colors.white : Colors.primary} />
        </Animated.View>
        <Animated.Text style={[styles.actionTitle, titleStyle]}>{title}</Animated.Text>
        {subtitle ? (
          <Animated.Text style={[styles.actionSub, subtitleStyle]}>{subtitle}</Animated.Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

function EventCarouselCard({ event, onPress }: { event: Event; onPress: () => void }) {
  const { date, month, time } = formatEventDateParts(event.starts_at);

  return (
    <Pressable
      style={({ pressed }) => [styles.eventCard, pressed && styles.pressed]}
      onPress={onPress}>
      <ImageBackground
        source={{ uri: event.image_url ?? undefined }}
        style={styles.eventImage}
        imageStyle={styles.eventImageInner}>
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.72)']} style={styles.eventGradient}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateDay}>{date}</Text>
            <Text style={styles.dateMonth}>{month}</Text>
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle} numberOfLines={2}>
              {event.title}
            </Text>
            <Text style={styles.eventMeta} numberOfLines={1}>
              {time} · {event.location_label}
            </Text>
            <View style={styles.eventRsvpRow}>
              <Ionicons name="people" size={13} color="rgba(255,255,255,0.92)" />
              <Text style={styles.eventRsvpText}>
                {event.attendee_count === 0
                  ? 'No RSVPs yet'
                  : `${event.attendee_count} RSVPed`}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </Pressable>
  );
}

function Sheet({ children }: { children: ReactNode }) {
  return <View style={styles.sheet}>{children}</View>;
}

export default function HomeScreen() {
  const router = useRouter();
  const { guestId, profile, newsletter, refresh: refreshVolunteer } = useVolunteer();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    drives_completed: 0,
    issues_reported: 0,
    issues_resolved: 0,
  });
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [townNewsItems, setTownNewsItems] = useState<TownNewsItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const isRegistered = Boolean(profile?.registered);
  const isOnBreak = Boolean(newsletter) && !isRegistered;

  const loadHomeData = useCallback(
    async (force = false) => {
      const cacheKey = `home:${guestId ?? 'anon'}`;
      const payload = await cacheGetOrFetch(
        cacheKey,
        HOME_TTL_MS,
        async () => {
          const [cloud, notes] = await Promise.all([
            api.getHomeCloudSnapshot(guestId),
            api.listStickyNotes().catch((error) => {
              console.warn('Chalkboard notes unavailable:', error);
              return [] as StickyNote[];
            }),
          ]);
          return {
            events: cloud.events,
            stats: cloud.stats,
            notes,
            newsItems: buildTownNewsItems(cloud.news),
          };
        },
        {
          force,
          onCacheHit: (cached) => {
            setUpcomingEvents(cached.events);
            setDashboardStats(cached.stats);
            setStickyNotes(cached.notes);
            setTownNewsItems(cached.newsItems);
          },
        }
      );
      setUpcomingEvents(payload.events);
      setDashboardStats(payload.stats);
      setStickyNotes(payload.notes);
      setTownNewsItems(payload.newsItems);
    },
    [guestId]
  );

  const didLoad = useRef(false);
  useFocusEffect(
    useCallback(() => {
      // Skip until guest id is ready; then use cache unless forced refresh
      if (!guestId && didLoad.current) return;
      didLoad.current = true;
      void loadHomeData(false);
    }, [guestId, loadHomeData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      cacheInvalidate('home:');
      cacheInvalidate('events:');
      cacheInvalidate('drive-checkins:');
      // Soft volunteer refresh (no recount) — keep pull-to-refresh snappy
      await Promise.all([loadHomeData(true), refreshVolunteer()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadHomeData, refreshVolunteer]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        decelerationRate="normal"
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }>
        {/* Civic hub header — photo hero + live updates (always show photos) */}
        <TownNewsBanner
          items={townNewsItems}
          onPressItem={(item) => {
            if (item.route) router.push(item.route as never);
          }}
          top={<HomeBrandHeader />}
          bottom={<Text style={styles.headline}>What can I do for my town today?</Text>}
        />

        <View style={styles.body}>
          {/* 1. Quick actions first — task-based IA */}
          <View style={styles.actions}>
            <ActionTile
              icon="megaphone"
              title="Report"
              subtitle="Flag an issue"
              onPress={() => router.push('/(tabs)/reports')}
            />
            <ActionTile
              icon="calendar-outline"
              title="Events"
              subtitle="What's on"
              onPress={() => router.push('/(tabs)/events')}
            />
            <ActionTile
              icon={
                isRegistered ? 'person-outline' : isOnBreak ? 'leaf-outline' : 'hand-left-outline'
              }
              title={isRegistered ? 'You' : isOnBreak ? 'Resume' : 'Join'}
              subtitle={isRegistered ? 'Your profile' : isOnBreak ? 'Come back' : 'Volunteer'}
              onPress={() =>
                router.push(isRegistered ? '/(tabs)/profile' : isOnBreak ? '/(tabs)/profile' : '/newsletter')
              }
            />
          </View>

          {/* 2. Snapshot metrics */}
          <HomeSection title="Town at a glance">
            <Sheet>
              <View style={styles.metrics}>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{dashboardStats.drives_completed}</Text>
                  <Text style={styles.metricLabel} numberOfLines={2}>
                    Drives completed
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{dashboardStats.issues_reported}</Text>
                  <Text style={styles.metricLabel} numberOfLines={2}>
                    Issues reported
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{dashboardStats.issues_resolved}</Text>
                  <Text style={styles.metricLabel} numberOfLines={2}>
                    Issues resolved
                  </Text>
                </View>
              </View>
            </Sheet>
          </HomeSection>

          {/* 3. Highlights — events */}
          <HomeSection
            title="Upcoming"
            actionLabel="See all"
            onAction={() => router.push('/(tabs)/events')}>
            {upcomingEvents.length === 0 ? (
              <Sheet>
                <Text style={styles.emptyText}>No upcoming events yet. Pull to refresh.</Text>
              </Sheet>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={262}
                disableIntervalMomentum
                contentContainerStyle={styles.eventsScroll}>
                {upcomingEvents.map((event) => (
                  <EventCarouselCard
                    key={event.id}
                    event={event}
                    onPress={() => router.push(`/event/${event.id}`)}
                  />
                ))}
              </ScrollView>
            )}
          </HomeSection>

          {/* 4. Community board */}
          <HomeSection title="Town chalkboard">
            <CitizenStickyNotes guestId={guestId} notes={stickyNotes} onUpdated={setStickyNotes} />
          </HomeSection>

          {/* 5. Rotating green tips */}
          <SustainabilityTipsTicker />

          {!isRegistered && !isOnBreak ? (
            <Pressable
              style={({ pressed }) => [styles.volunteerBanner, pressed && styles.pressed]}
              onPress={() => router.push('/newsletter')}>
              <LinearGradient
                colors={[Colors.primaryLight, Colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.volunteerGradient}>
                <Text style={styles.volunteerTitle}>Become a volunteer</Text>
                <Text style={styles.volunteerSubtitle}>
                  Join cleanups and drives that help Hazaribagh heal.
                </Text>
                <Text style={styles.volunteerCta}>Register →</Text>
              </LinearGradient>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const CARD_RADIUS = Radius.lg;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.greenLight,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.greenLight,
  },
  content: {
    paddingBottom: Spacing.xl + 8,
  },
  headline: {
    color: Colors.white,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  body: {
    marginTop: -Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionPressable: {
    flex: 1,
  },
  actionTile: {
    flex: 1,
    borderRadius: CARD_RADIUS,
    padding: Spacing.md,
    gap: 4,
    minHeight: 108,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.greenLight,
    marginBottom: 4,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  actionSub: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: Colors.border,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
    paddingHorizontal: 2,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  eventsScroll: {
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  eventCard: {
    width: 246,
    height: 152,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
  },
  eventImage: {
    flex: 1,
  },
  eventImageInner: {
    borderRadius: CARD_RADIUS,
  },
  eventGradient: {
    flex: 1,
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  dateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  dateDay: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  dateMonth: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: '700',
  },
  eventInfo: {
    gap: 4,
  },
  eventTitle: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  eventMeta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  eventRsvpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  eventRsvpText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '700',
  },
  volunteerBanner: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  volunteerGradient: {
    padding: Spacing.lg,
    gap: 6,
  },
  volunteerTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  volunteerSubtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    lineHeight: 18,
  },
  volunteerCta: {
    marginTop: Spacing.sm,
    color: Colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
