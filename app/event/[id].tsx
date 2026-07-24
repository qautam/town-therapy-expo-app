import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

import { useLevelUp } from '@/context/LevelUpContext';
import { useVolunteer } from '@/context/VolunteerContext';
import { api, formatEventDateParts } from '@/lib/api';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Event } from '@/types/database';

const DEFAULT_EVENT_IMAGE =
  'https://images.unsplash.com/photo-1559027615-cd4628903328?w=1200&q=80';

function formatFullDate(startsAt: string) {
  const date = new Date(startsAt);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { guestId, newsletter, profile, refresh } = useVolunteer();
  const { celebrateIfLeveledUp } = useLevelUp();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  const loadEvent = useCallback(async () => {
    if (!id) return;
    const data = await api.getEvent(id, guestId);
    setEvent(data);
  }, [guestId, id]);

  useEffect(() => {
    loadEvent().finally(() => setLoading(false));
  }, [loadEvent]);

  const toggleGoing = async () => {
    if (!guestId || !event) return;

    setRsvpLoading(true);
    try {
      const beforeEvents = newsletter?.events_attended ?? profile?.events_joined ?? 0;
      await api.toggleRsvp(guestId, event.id);
      const updated = await refresh();
      const afterEvents =
        updated.newsletter?.events_attended ?? updated.profile.events_joined ?? beforeEvents;

      celebrateIfLeveledUp(beforeEvents, afterEvents);
      await loadEvent();
    } finally {
      setRsvpLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
          </Pressable>
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Event not found</Text>
          <Text style={styles.emptyText}>This event may have been removed or is no longer available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { date, month, time } = formatEventDateParts(event.starts_at);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ImageBackground
          source={{ uri: event.image_url ?? DEFAULT_EVENT_IMAGE }}
          style={styles.hero}
          imageStyle={styles.heroImage}>
          <LinearGradient colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.75)']} style={styles.heroGradient}>
            <View style={styles.header}>
              <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={10}>
                <Ionicons name="arrow-back" size={22} color={Colors.primary} />
              </Pressable>
            </View>

            <View style={styles.heroFooter}>
              <View style={styles.dateBadge}>
                <Text style={styles.dateDay}>{date}</Text>
                <Text style={styles.dateMonth}>{month}</Text>
              </View>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{event.category}</Text>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>

        <View style={styles.body}>
          <Text style={styles.title}>{event.title}</Text>

          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <View style={styles.metaIcon}>
                <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
              </View>
              <View style={styles.metaTextWrap}>
                <Text style={styles.metaLabel}>Date</Text>
                <Text style={styles.metaValue}>{formatFullDate(event.starts_at)}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaIcon}>
                <Ionicons name="time-outline" size={18} color={Colors.primary} />
              </View>
              <View style={styles.metaTextWrap}>
                <Text style={styles.metaLabel}>Time</Text>
                <Text style={styles.metaValue}>{time}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaIcon}>
                <Ionicons name="location-outline" size={18} color={Colors.primary} />
              </View>
              <View style={styles.metaTextWrap}>
                <Text style={styles.metaLabel}>Location</Text>
                <Text style={styles.metaValue}>{event.location_label}</Text>
              </View>
            </View>

            <View style={[styles.metaRow, styles.metaRowLast]}>
              <View style={styles.metaIcon}>
                <Ionicons name="people-outline" size={18} color={Colors.primary} />
              </View>
              <View style={styles.metaTextWrap}>
                <Text style={styles.metaLabel}>Volunteers</Text>
                <Text style={styles.metaValue}>{event.attendee_count} going</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>About this event</Text>
          <Text style={styles.description}>
            {event.description?.trim() || 'Details will be shared closer to the event date.'}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerLabel}>{event.is_going ? 'You are going' : 'Join this drive'}</Text>
          <Text style={styles.footerHint}>
            {event.is_going ? 'Tap to cancel your RSVP' : 'RSVP to count toward your volunteer level'}
          </Text>
        </View>
        <Pressable
          style={[styles.rsvpButton, event.is_going && styles.rsvpButtonActive]}
          onPress={toggleGoing}
          disabled={rsvpLoading || !guestId}>
          {rsvpLoading ? (
            <ActivityIndicator color={event.is_going ? Colors.primary : Colors.white} size="small" />
          ) : (
            <Text style={[styles.rsvpText, event.is_going && styles.rsvpTextActive]}>
              {event.is_going ? 'Going ✓' : 'RSVP'}
            </Text>
          )}
        </Pressable>
      </View>
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
    padding: Spacing.lg,
  },
  content: {
    paddingBottom: Spacing.xl,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  hero: {
    height: 280,
  },
  heroImage: {
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'space-between',
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: Spacing.lg,
  },
  dateBadge: {
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 56,
  },
  dateDay: {
    color: Colors.primary,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  dateMonth: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  categoryBadge: {
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  categoryText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 32,
  },
  metaCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  metaRowLast: {
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  metaIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.greenLight,
  },
  metaTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 21,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
  },
  footerInfo: {
    flex: 1,
    minWidth: 0,
  },
  footerLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  footerHint: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textMuted,
  },
  rsvpButton: {
    minWidth: 108,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  rsvpButtonActive: {
    backgroundColor: Colors.greenLight,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  rsvpText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  rsvpTextActive: {
    color: Colors.primary,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyText: {
    marginTop: Spacing.sm,
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
