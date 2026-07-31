import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/SectionHeader';
import { useLevelUp } from '@/context/LevelUpContext';
import { useVolunteer } from '@/context/VolunteerContext';
import { api, formatEventDateParts } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/config';
import { cacheGetOrFetch, cacheInvalidate } from '@/lib/queryCache';
import { isDrivePast } from '@/lib/volunteerHours';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Event, VolunteerDriveCheckIn } from '@/types/database';
import { townAlert } from '@/context/TownAlertContext';

const EVENTS_TTL_MS = 90_000;

type EventsTab = 'upcoming' | 'rsvps' | 'completed';

function EventCard({
  event,
  onToggleGoing,
  onPress,
  showComplete = false,
  onComplete,
  completing = false,
}: {
  event: Event;
  onToggleGoing: () => void;
  onPress: () => void;
  showComplete?: boolean;
  onComplete?: () => void;
  completing?: boolean;
}) {
  const { date, month, time } = formatEventDateParts(event.starts_at);

  return (
    <View style={styles.card}>
      <Pressable onPress={onPress}>
        <ImageBackground
          source={{ uri: event.image_url ?? undefined }}
          style={styles.image}
          imageStyle={styles.imageInner}>
          <View style={styles.imageOverlay}>
            <View style={styles.dateBadge}>
              <Text style={styles.dateDay}>{date}</Text>
              <Text style={styles.dateMonth}>{month}</Text>
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{event.category}</Text>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.cardBody}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {event.description}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{time}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{event.location_label}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={14} color={Colors.primary} />
              <Text style={[styles.metaText, styles.rsvpCountText]}>
                {event.attendee_count === 0
                  ? 'No RSVPs yet'
                  : `${event.attendee_count} ${event.attendee_count === 1 ? 'person' : 'people'} RSVPed`}
              </Text>
            </View>
          </View>

          <View style={styles.viewDetailsRow}>
            <Text style={styles.viewDetailsText}>Tap for full details</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
          </View>
        </View>
      </Pressable>

      <View style={styles.footer}>
        {showComplete ? (
          <>
            <View style={styles.attendees}>
              <Ionicons name="flag-outline" size={16} color={Colors.orange} />
              <Text style={styles.completeHint}>Drive ended — confirm you went</Text>
            </View>
            <Pressable
              style={[styles.completeButton, completing && styles.completeButtonDisabled]}
              onPress={onComplete}
              disabled={completing}>
              {completing ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.completeButtonText}>Complete</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.attendees}>
              <Ionicons name="people" size={18} color={Colors.primary} />
              <Text style={styles.attendeeText}>
                {event.attendee_count === 0
                  ? 'Be the first to RSVP'
                  : `${event.attendee_count} ${event.attendee_count === 1 ? 'volunteer' : 'volunteers'} going`}
              </Text>
            </View>
            <Pressable
              style={[styles.rsvpButton, event.is_going && styles.rsvpButtonActive]}
              onPress={onToggleGoing}>
              <Text style={[styles.rsvpText, event.is_going && styles.rsvpTextActive]}>
                {event.is_going ? 'Going ✓' : 'RSVP'}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function CompletedDriveCard({
  drive,
  onPress,
}: {
  drive: VolunteerDriveCheckIn;
  onPress: () => void;
}) {
  const { date, month, time } = formatEventDateParts(drive.starts_at);

  return (
    <Pressable style={styles.completedCard} onPress={onPress}>
      <ImageBackground
        source={{ uri: drive.image_url ?? undefined }}
        style={styles.completedImage}
        imageStyle={styles.imageInner}>
        <View style={styles.completedImageOverlay}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateDay}>{date}</Text>
            <Text style={styles.dateMonth}>{month}</Text>
          </View>
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
            <Text style={styles.completedBadgeText}>Completed</Text>
          </View>
        </View>
      </ImageBackground>
      <View style={styles.completedBody}>
        <Text style={styles.title}>{drive.title}</Text>
        <Text style={styles.completedMeta}>
          {time} · {drive.location_label}
        </Text>
        <Text style={styles.completedImpact}>Counted toward your volunteer hours</Text>
      </View>
    </Pressable>
  );
}

export default function EventsScreen() {
  const router = useRouter();
  const { guestId, newsletter, profile, refresh } = useVolunteer();
  const { celebrateIfLeveledUp } = useLevelUp();
  const [tab, setTab] = useState<EventsTab>('upcoming');
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [driveCheckIns, setDriveCheckIns] = useState<VolunteerDriveCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const loadEvents = useCallback(
    async (force = false) => {
      if (!guestId) return;
      const cacheKey = `events:${guestId}`;
      const data = await cacheGetOrFetch(
        cacheKey,
        EVENTS_TTL_MS,
        () => api.listEvents(guestId, false),
        {
          force,
          onCacheHit: (cached) => setAllEvents(cached),
        }
      );
      setAllEvents(data);
    },
    [guestId]
  );

  const loadDriveCheckIns = useCallback(
    async (force = false) => {
      if (!guestId) return;
      const cacheKey = `drive-checkins:${guestId}`;
      const data = await cacheGetOrFetch(
        cacheKey,
        EVENTS_TTL_MS,
        () => api.listVolunteerDriveCheckIns(guestId),
        {
          force,
          onCacheHit: (cached) => setDriveCheckIns(cached),
        }
      );
      setDriveCheckIns(data);
    },
    [guestId]
  );

  const checkInMap = useMemo(
    () => new Map(driveCheckIns.map((drive) => [drive.id, drive])),
    [driveCheckIns]
  );

  const upcomingEvents = useMemo(
    () => allEvents.filter((event) => !isDrivePast(event.starts_at)),
    [allEvents]
  );

  const rsvpEvents = useMemo(
    () =>
      allEvents.filter((event) => {
        if (!event.is_going) return false;
        if (checkInMap.get(event.id)?.completed) return false;
        return true;
      }),
    [allEvents, checkInMap]
  );

  const completedDrives = useMemo(
    () => driveCheckIns.filter((drive) => drive.completed),
    [driveCheckIns]
  );

  const eventList = useMemo(() => {
    if (tab === 'upcoming') return upcomingEvents;
    if (tab === 'rsvps') return rsvpEvents;
    return [];
  }, [tab, upcomingEvents, rsvpEvents]);

  const canCompleteEvent = useCallback(
    (event: Event) =>
      event.is_going && isDrivePast(event.starts_at) && !checkInMap.get(event.id)?.completed,
    [checkInMap]
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          await Promise.all([loadEvents(false), loadDriveCheckIns(false)]);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [loadEvents, loadDriveCheckIns])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      cacheInvalidate(`events:${guestId}`);
      cacheInvalidate(`drive-checkins:${guestId}`);
      await Promise.all([loadEvents(true), loadDriveCheckIns(true)]);
    } finally {
      setRefreshing(false);
    }
  }, [guestId, loadEvents, loadDriveCheckIns]);

  const toggleGoing = async (id: string) => {
    if (!guestId) return;

    // Optimistic UI flip
    setAllEvents((current) =>
      current.map((event) =>
        event.id === id
          ? {
              ...event,
              is_going: !event.is_going,
              attendee_count: Math.max(0, event.attendee_count + (event.is_going ? -1 : 1)),
            }
          : event
      )
    );

    try {
      const updatedEvent = await api.toggleRsvp(guestId, id);
      if (updatedEvent) {
        setAllEvents((current) =>
          current.map((event) => (event.id === id ? updatedEvent : event))
        );
      }
      cacheInvalidate(`events:${guestId}`);
      cacheInvalidate(`home:${guestId}`);
      await refresh();
    } catch {
      await loadEvents(true);
    }
  };

  const completeDrive = async (eventId: string) => {
    if (!guestId || completingId) return;

    const beforeEvents = newsletter?.events_attended ?? profile?.events_joined ?? 0;
    setCompletingId(eventId);

    try {
      const result = await api.completeVolunteerDrive(guestId, eventId);
      setDriveCheckIns(result.drives);
      cacheInvalidate(`drive-checkins:${guestId}`);
      cacheInvalidate(`events:${guestId}`);
      cacheInvalidate(`home:${guestId}`);
      await loadEvents(true);
      const updated = await refresh({ reconcile: true });
      const afterEvents =
        updated.newsletter?.events_attended ?? updated.profile.events_joined ?? beforeEvents;
      celebrateIfLeveledUp(beforeEvents, afterEvents);
      setTab('completed');
    } catch (error) {
      townAlert(
        'Could not complete',
        error instanceof Error ? error.message : 'Try again in a moment.'
      );
    } finally {
      setCompletingId(null);
    }
  };

  const emptyMessage =
    tab === 'rsvps'
      ? 'No RSVPs yet. Join a drive to level up!'
      : tab === 'completed'
        ? 'No completed drives yet. RSVP, show up, then tap Complete after the drive ends.'
        : 'No upcoming events. Pull down to refresh.';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Events" subtitle="Show up. Participate. Celebrate." />

      {!isSupabaseConfigured ? (
        <View style={styles.localHint}>
          <Ionicons name="phone-portrait-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.localHintText}>
            Showing events saved on this device. Cloud sync needs Supabase.
          </Text>
        </View>
      ) : null}

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === 'upcoming' && styles.tabActive]}
          onPress={() => setTab('upcoming')}>
          <Text style={[styles.tabText, tab === 'upcoming' && styles.tabTextActive]}>Upcoming</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'rsvps' && styles.tabActive]}
          onPress={() => setTab('rsvps')}>
          <Text style={[styles.tabText, tab === 'rsvps' && styles.tabTextActive]}>My RSVPs</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'completed' && styles.tabActive]}
          onPress={() => setTab('completed')}>
          <Text style={[styles.tabText, tab === 'completed' && styles.tabTextActive]}>Completed</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }>
          {tab === 'completed' ? (
            completedDrives.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>{emptyMessage}</Text>
              </View>
            ) : (
              completedDrives.map((drive) => (
                <CompletedDriveCard
                  key={drive.id}
                  drive={drive}
                  onPress={() => router.push(`/event/${drive.id}`)}
                />
              ))
            )
          ) : eventList.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{emptyMessage}</Text>
            </View>
          ) : (
            eventList.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => router.push(`/event/${event.id}`)}
                onToggleGoing={() => toggleGoing(event.id)}
                showComplete={tab === 'rsvps' && canCompleteEvent(event)}
                onComplete={() => void completeDrive(event.id)}
                completing={completingId === event.id}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  localHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  localHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.pill,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radius.pill,
  },
  tabActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  list: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  image: {
    height: 180,
  },
  imageInner: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  imageOverlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  dateBadge: {
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  dateDay: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  dateMonth: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: '700',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    padding: Spacing.md,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  metaRow: {
    marginTop: Spacing.md,
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  rsvpCountText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  attendees: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  attendeeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    flexShrink: 1,
  },
  rsvpButton: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  rsvpButtonActive: {
    backgroundColor: Colors.greenLight,
  },
  rsvpText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  rsvpTextActive: {
    color: Colors.primary,
  },
  completeHint: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: Colors.orange,
    borderRadius: Radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 96,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    opacity: 0.7,
  },
  completeButtonText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 14,
  },
  completedCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#C5DFCA',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  completedImage: {
    height: 140,
  },
  completedImageOverlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.md,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.greenLight,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#C5DFCA',
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  completedBody: {
    padding: Spacing.md,
    gap: 4,
    backgroundColor: Colors.greenLight,
  },
  completedMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  completedImpact: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  empty: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
});
