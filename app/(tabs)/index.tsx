import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Image,
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
import { HomeSosBar } from '@/components/HomeSosBar';
import { HomeSection } from '@/components/HomeSection';
import { HowThisWorksStrip } from '@/components/HowThisWorksStrip';
import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';
import { SustainabilityTipsTicker } from '@/components/SustainabilityTipsTicker';
import { TownNewsBanner } from '@/components/TownNewsBanner';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { townAlert } from '@/context/TownAlertContext';
import { useLocale } from '@/context/LocaleContext';
import { useVolunteer } from '@/context/VolunteerContext';
import { addEventToCalendar } from '@/lib/addEventToCalendar';
import { api, formatEventDateParts } from '@/lib/api';
import { cacheGetOrFetch, cacheInvalidate } from '@/lib/queryCache';
import { sortStickyNotes } from '@/lib/stickyNotes';
import { buildTownNewsItems } from '@/lib/townNews';
import { volunteerSignupHref } from '@/lib/volunteerGate';
import type { StickyNote } from '@/lib/stickyNotes';
import type {
  DashboardStats,
  Event,
  TownNewsItem,
  VolunteerDriveCheckIn,
} from '@/types/database';

const CAPTAIN_TIP_KEY = '@town_therapy_captain_t_tip_dismissed_v1';

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

function EventCarouselCard({
  event,
  onPress,
  onToggleRsvp,
  rsvpBusy,
}: {
  event: Event;
  onPress: () => void;
  onToggleRsvp: () => void;
  rsvpBusy?: boolean;
}) {
  const { t } = useLocale();
  const { date, month, time } = formatEventDateParts(event.starts_at);

  return (
    <View style={styles.eventCard}>
      <Pressable
        style={({ pressed }) => [styles.eventCardPress, pressed && styles.pressed]}
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
                    ? t('home.noRsvps')
                    : t('home.rsvped', { count: event.attendee_count })}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </Pressable>
      <Pressable
        style={[styles.eventRsvpButton, event.is_going && styles.eventRsvpButtonActive]}
        onPress={onToggleRsvp}
        disabled={rsvpBusy}>
        <Text style={[styles.eventRsvpButtonText, event.is_going && styles.eventRsvpButtonTextActive]}>
          {event.is_going ? t('home.going') : t('home.rsvp')}
        </Text>
      </Pressable>
    </View>
  );
}

function Sheet({ children }: { children: ReactNode }) {
  return <View style={styles.sheet}>{children}</View>;
}

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { guestId, profile, newsletter, refresh: refreshVolunteer } = useVolunteer();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    drives_completed: 0,
    issues_reported: 0,
    issues_resolved: 0,
  });
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [townNewsItems, setTownNewsItems] = useState<TownNewsItem[]>([]);
  const [pendingDrives, setPendingDrives] = useState<VolunteerDriveCheckIn[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [rsvpBusyId, setRsvpBusyId] = useState<string | null>(null);
  const [showCaptainTip, setShowCaptainTip] = useState(false);

  const isRegistered = Boolean(profile?.registered);
  const isOnBreak = Boolean(newsletter) && !isRegistered;

  const chalkboardPreview = useMemo(() => {
    const sorted = sortStickyNotes(stickyNotes);
    return sorted[0] ?? null;
  }, [stickyNotes]);

  const loadHomeData = useCallback(
    async (force = false) => {
      const cacheKey = `home:${guestId ?? 'anon'}`;
      const payload = await cacheGetOrFetch(
        cacheKey,
        HOME_TTL_MS,
        async () => {
          const [cloud, notes, drives] = await Promise.all([
            api.getHomeCloudSnapshot(guestId),
            api.listStickyNotes().catch((error) => {
              console.warn('Chalkboard notes unavailable:', error);
              return [] as StickyNote[];
            }),
            guestId
              ? api.listVolunteerDriveCheckIns(guestId).catch(() => [] as VolunteerDriveCheckIn[])
              : Promise.resolve([] as VolunteerDriveCheckIn[]),
          ]);
          return {
            events: cloud.events,
            stats: cloud.stats,
            notes,
            newsItems: buildTownNewsItems(cloud.news),
            pendingDrives: drives.filter((drive) => !drive.completed),
          };
        },
        {
          force,
          onCacheHit: (cached) => {
            setUpcomingEvents(cached.events);
            setDashboardStats(cached.stats);
            setStickyNotes(cached.notes);
            setTownNewsItems(cached.newsItems);
            setPendingDrives(cached.pendingDrives ?? []);
          },
        }
      );
      setUpcomingEvents(payload.events);
      setDashboardStats(payload.stats);
      setStickyNotes(payload.notes);
      setTownNewsItems(payload.newsItems);
      setPendingDrives(payload.pendingDrives ?? []);
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

  useFocusEffect(
    useCallback(() => {
      let active = true;
      AsyncStorage.getItem(CAPTAIN_TIP_KEY)
        .then((value) => {
          if (active && value !== '1') setShowCaptainTip(true);
        })
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, [])
  );

  const dismissCaptainTip = useCallback(() => {
    setShowCaptainTip(false);
    AsyncStorage.setItem(CAPTAIN_TIP_KEY, '1').catch(() => undefined);
  }, []);

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

  const toggleHomeRsvp = useCallback(
    async (event: Event) => {
      if (!guestId || rsvpBusyId) return;

      if (!isRegistered && !event.is_going) {
        router.push(volunteerSignupHref(newsletter));
        return;
      }

      const wasGoing = event.is_going;
      setRsvpBusyId(event.id);
      setUpcomingEvents((events) =>
        events.map((item) =>
          item.id === event.id
            ? {
                ...item,
                is_going: !item.is_going,
                attendee_count: Math.max(0, item.attendee_count + (item.is_going ? -1 : 1)),
              }
            : item
        )
      );

      try {
        const updated = await api.toggleRsvp(guestId, event.id);
        if (updated) {
          setUpcomingEvents((events) =>
            events.map((item) => (item.id === event.id ? updated : item))
          );
        }
        cacheInvalidate(`events:${guestId}`);
        cacheInvalidate(`home:${guestId}`);
        void refreshVolunteer();

        if (!wasGoing && updated?.is_going) {
          townAlert('You’re going!', 'Want a reminder on your calendar?', [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'Add to calendar',
              onPress: () => {
                void addEventToCalendar(updated).catch((error) => {
                  townAlert(
                    'Could not open calendar',
                    error instanceof Error ? error.message : 'Try again.'
                  );
                });
              },
            },
          ]);
        }
      } catch {
        await loadHomeData(true);
      } finally {
        setRsvpBusyId(null);
      }
    },
    [guestId, isRegistered, loadHomeData, newsletter, refreshVolunteer, router, rsvpBusyId]
  );

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
          bottom={<Text style={styles.headline}>{t('home.headline')}</Text>}
        />

        <View style={styles.body}>
          <HowThisWorksStrip />

          {showCaptainTip ? (
            <View style={styles.captainTip}>
              <View style={styles.captainTipIcon}>
                <Image
                  source={require('@/assets/characters/captain-t-avatar.png')}
                  style={styles.captainTipAvatar}
                />
              </View>
              <View style={styles.captainTipCopy}>
                <Text style={styles.captainTipTitle}>{t('home.captainTipTitle')}</Text>
                <Text style={styles.captainTipText}>{t('home.captainTipText')}</Text>
                <View style={styles.captainTipActions}>
                  <Pressable
                    onPress={() => {
                      dismissCaptainTip();
                      router.push('/assistant' as never);
                    }}>
                    <Text style={styles.captainTipLink}>{t('home.captainTipAsk')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      dismissCaptainTip();
                      router.push('/report/new');
                    }}>
                    <Text style={styles.captainTipLink}>{t('home.captainTipReport')}</Text>
                  </Pressable>
                </View>
              </View>
              <Pressable
                accessibilityLabel="Dismiss tip"
                hitSlop={10}
                onPress={dismissCaptainTip}
                style={styles.captainTipClose}>
                <Ionicons name="close" size={18} color={Colors.textMuted} />
              </Pressable>
            </View>
          ) : null}

          {pendingDrives.length > 0 ? (
            <Pressable
              style={({ pressed }) => [styles.completeNudge, pressed && styles.pressed]}
              onPress={() => router.push('/(tabs)/events')}>
              <Ionicons name="flag" size={18} color={Colors.orange} />
              <View style={styles.completeNudgeCopy}>
                <Text style={styles.completeNudgeTitle}>{t('home.didYouGo')}</Text>
                <Text style={styles.completeNudgeText}>
                  {pendingDrives.length === 1
                    ? t('home.didYouGoOne', { title: pendingDrives[0].title })
                    : t('home.didYouGoMany', { count: pendingDrives.length })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.orange} />
            </Pressable>
          ) : null}

          {chalkboardPreview ? (
            <View style={styles.chalkPreview}>
              <View style={[styles.chalkSwatch, { backgroundColor: chalkboardPreview.color }]} />
              <View style={styles.chalkPreviewCopy}>
                <Text style={styles.chalkPreviewEyebrow}>
                  {chalkboardPreview.pinned ? t('home.chalkPinned') : t('home.chalkFrom')}
                </Text>
                <Text style={styles.chalkPreviewBody} numberOfLines={2}>
                  {chalkboardPreview.body}
                </Text>
                <Text style={styles.chalkPreviewMeta}>
                  — {chalkboardPreview.author_name} {t('home.chalkBelow')}
                </Text>
              </View>
            </View>
          ) : null}

          {/* 1. Quick actions first — task-based IA */}
          <View style={styles.actions}>
            <ActionTile
              icon="megaphone"
              title={t('home.report')}
              subtitle={t('home.reportSub')}
              onPress={() => router.push('/(tabs)/reports')}
            />
            <ActionTile
              icon="calendar-outline"
              title={t('home.events')}
              subtitle={t('home.eventsSub')}
              onPress={() => router.push('/(tabs)/events')}
            />
            <ActionTile
              icon={
                isRegistered ? 'person-outline' : isOnBreak ? 'leaf-outline' : 'hand-left-outline'
              }
              title={isRegistered ? t('home.you') : isOnBreak ? t('home.resume') : t('home.join')}
              subtitle={
                isRegistered
                  ? t('home.youSub')
                  : isOnBreak
                    ? t('home.resumeSub')
                    : t('home.joinSub')
              }
              onPress={() =>
                router.push(isRegistered ? '/(tabs)/profile' : isOnBreak ? '/(tabs)/profile' : '/newsletter')
              }
            />
          </View>

          {/* 2. Snapshot metrics */}
          <HomeSection title={t('home.glance')}>
            <Sheet>
              <View style={styles.metrics}>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{dashboardStats.drives_completed}</Text>
                  <Text style={styles.metricLabel} numberOfLines={2}>
                    {t('home.drivesCompleted')}
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{dashboardStats.issues_reported}</Text>
                  <Text style={styles.metricLabel} numberOfLines={2}>
                    {t('home.issuesReported')}
                  </Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>{dashboardStats.issues_resolved}</Text>
                  <Text style={styles.metricLabel} numberOfLines={2}>
                    {t('home.issuesResolved')}
                  </Text>
                </View>
              </View>
            </Sheet>
          </HomeSection>

          {/* 3. Highlights — events */}
          <HomeSection
            title={t('home.whatsNext')}
            actionLabel={t('home.seeAll')}
            onAction={() => router.push('/(tabs)/events')}>
            {upcomingEvents.length === 0 ? (
              <Sheet>
                <Text style={styles.emptyText}>{t('home.noEvents')}</Text>
              </Sheet>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={262}
                snapToAlignment="start"
                disableIntervalMomentum
                pagingEnabled={false}
                nestedScrollEnabled
                contentContainerStyle={styles.eventsScroll}>
                {upcomingEvents.map((event) => (
                  <EventCarouselCard
                    key={event.id}
                    event={event}
                    onPress={() => router.push(`/event/${event.id}`)}
                    onToggleRsvp={() => void toggleHomeRsvp(event)}
                    rsvpBusy={rsvpBusyId === event.id}
                  />
                ))}
              </ScrollView>
            )}
          </HomeSection>

          {/* 4. Community board */}
          <HomeSection title={t('home.chalkboard')}>
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
                <Text style={styles.volunteerTitle}>{t('home.volunteerTitle')}</Text>
                <Text style={styles.volunteerSubtitle}>{t('home.volunteerSub')}</Text>
                <Text style={styles.volunteerCta}>{t('home.volunteerCta')}</Text>
              </LinearGradient>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAwareScrollView>
      <HomeSosBar />
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
    paddingBottom: Spacing.xl,
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
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eventCardPress: {
    height: 152,
  },
  eventImage: {
    flex: 1,
  },
  eventImageInner: {
    borderTopLeftRadius: CARD_RADIUS - 1,
    borderTopRightRadius: CARD_RADIUS - 1,
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
  eventRsvpButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: Colors.greenLight,
  },
  eventRsvpButtonActive: {
    backgroundColor: Colors.primary,
  },
  eventRsvpButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  eventRsvpButtonTextActive: {
    color: Colors.white,
  },
  captainTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  captainTipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.greenLight,
    overflow: 'hidden',
  },
  captainTipAvatar: {
    width: 36,
    height: 36,
  },
  captainTipCopy: {
    flex: 1,
    gap: 4,
  },
  captainTipTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  captainTipText: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  captainTipActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: 4,
  },
  captainTipLink: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  captainTipClose: {
    padding: 2,
  },
  completeNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.orangeLight,
    borderWidth: 1,
    borderColor: Colors.orange,
  },
  completeNudgeCopy: {
    flex: 1,
    gap: 2,
  },
  completeNudgeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  completeNudgeText: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  chalkPreview: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chalkSwatch: {
    width: 10,
    borderRadius: 6,
    alignSelf: 'stretch',
  },
  chalkPreviewCopy: {
    flex: 1,
    gap: 4,
  },
  chalkPreviewEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  chalkPreviewBody: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  chalkPreviewMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
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
