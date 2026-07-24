import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
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
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Event } from '@/types/database';

function EventCard({
  event,
  onToggleGoing,
  onPress,
}: {
  event: Event;
  onToggleGoing: () => void;
  onPress: () => void;
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
          </View>

          <View style={styles.viewDetailsRow}>
            <Text style={styles.viewDetailsText}>Tap for full details</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
          </View>
        </View>
      </Pressable>

      <View style={styles.footer}>
          <View style={styles.attendees}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>T</Text>
            </View>
            <Text style={styles.attendeeText}>{event.attendee_count} going</Text>
          </View>
          <Pressable
            style={[styles.rsvpButton, event.is_going && styles.rsvpButtonActive]}
            onPress={onToggleGoing}>
            <Text style={[styles.rsvpText, event.is_going && styles.rsvpTextActive]}>
              {event.is_going ? 'Going ✓' : 'RSVP'}
            </Text>
          </Pressable>
      </View>
    </View>
  );
}

export default function EventsScreen() {
  const router = useRouter();
  const { guestId, newsletter, profile, refresh } = useVolunteer();
  const { celebrateIfLeveledUp } = useLevelUp();
  const [tab, setTab] = useState<'upcoming' | 'rsvps'>('upcoming');
  const [eventList, setEventList] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    if (!guestId) return;
    const data = await api.listEvents(guestId, tab === 'rsvps');
    setEventList(data);
  }, [guestId, tab]);

  useEffect(() => {
    loadEvents().finally(() => setLoading(false));
  }, [loadEvents]);

  const toggleGoing = async (id: string) => {
    if (!guestId) return;

    const beforeEvents = newsletter?.events_attended ?? profile?.events_joined ?? 0;
    await api.toggleRsvp(guestId, id);
    const updated = await refresh();
    const afterEvents =
      updated.newsletter?.events_attended ?? updated.profile.events_joined ?? beforeEvents;

    celebrateIfLeveledUp(beforeEvents, afterEvents);
    await loadEvents();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Events" subtitle="Show up. Participate. Celebrate." />

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
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {eventList.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {tab === 'rsvps' ? 'No RSVPs yet. Join a drive to level up!' : 'No upcoming events.'}
              </Text>
            </View>
          ) : (
            eventList.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => router.push(`/event/${event.id}`)}
                onToggleGoing={() => toggleGoing(event.id)}
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
    fontSize: 14,
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
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  attendeeText: {
    fontSize: 13,
    color: Colors.textSecondary,
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
