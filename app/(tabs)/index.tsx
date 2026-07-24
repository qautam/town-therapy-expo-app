import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ImageBackground, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TownTherapyLogo } from '@/components/TownTherapyLogo';
import { brand, communityWins, heroImage, user } from '@/constants/data';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { SectionHeader } from '@/components/SectionHeader';
import { useVolunteer } from '@/context/VolunteerContext';
import { api, formatEventDateParts } from '@/lib/api';
import type { DashboardStats, Event } from '@/types/database';

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickReportButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.quickReport} onPress={onPress}>
      <View style={styles.quickIcon}>
        <Ionicons name="add" size={22} color={Colors.primary} />
      </View>
      <View style={styles.quickText}>
        <Text style={styles.quickTitle}>Quick Report</Text>
        <Text style={styles.quickSubtitle}>
          Report civic issues with geotagging — public safety & SOS at the bottom.
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.white} />
    </Pressable>
  );
}

function EventCarouselCard({ event, onPress }: { event: Event; onPress: () => void }) {
  const { date, month, time } = formatEventDateParts(event.starts_at);

  return (
    <Pressable style={styles.eventCard} onPress={onPress}>
      <ImageBackground
        source={{ uri: event.image_url ?? undefined }}
        style={styles.eventImage}
        imageStyle={styles.eventImageInner}>
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.eventGradient}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateDay}>{date}</Text>
            <Text style={styles.dateMonth}>{month}</Text>
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventMeta}>
              {time} · {event.location_label}
            </Text>
          </View>
        </LinearGradient>
      </ImageBackground>
    </Pressable>
  );
}

function CommunityWinCard({ win }: { win: (typeof communityWins)[0] }) {
  const iconName = win.icon === 'sparkles' ? 'sparkles' : 'trophy';
  const iconColor = win.icon === 'sparkles' ? Colors.orange : Colors.red;

  return (
    <View style={styles.winCard}>
      <View style={[styles.winIcon, { backgroundColor: Colors.orangeLight }]}>
        <Ionicons name={iconName} size={18} color={iconColor} />
      </View>
      <View style={styles.winContent}>
        <Text style={styles.winTitle}>{win.title}</Text>
        <Text style={styles.winDescription} numberOfLines={2}>
          {win.description}
        </Text>
        <Text style={styles.winMeta}>
          {win.author} · {win.likes} likes
        </Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { guestId, refresh: refreshVolunteer } = useVolunteer();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(user.dashboard);
  const [refreshing, setRefreshing] = useState(false);

  const loadHomeData = useCallback(async () => {
    const [events, stats] = await Promise.all([
      api.listEvents(guestId, false),
      api.getDashboardStats(),
    ]);
    setUpcomingEvents(events.slice(0, 5));
    setDashboardStats(stats);
  }, [guestId]);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadHomeData(), refreshVolunteer()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadHomeData, refreshVolunteer]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }>
      <ImageBackground source={{ uri: heroImage }} style={styles.hero}>
        <LinearGradient
          colors={['rgba(45, 79, 79, 0.55)', 'rgba(36, 63, 63, 0.9)']}
          style={styles.heroGradient}>
          <View style={styles.heroBrandRow}>
            <TownTherapyLogo size={56} withShadow />
            <View style={styles.heroBrandText}>
              <Text style={styles.brandName}>{brand.name}</Text>
              <Text style={styles.brandTagline}>{brand.tagline}</Text>
            </View>
          </View>
          <Text style={styles.greeting}>Hi {user.greeting} 👋</Text>
          <Text style={styles.heroTitle}>{brand.headline}</Text>
          <Text style={styles.motto}>{brand.motto}</Text>
          <View style={styles.statsRow}>
            <StatCard value={dashboardStats.issues} label="Issues" />
            <StatCard value={dashboardStats.resolved} label="Resolved" />
            <StatCard value={dashboardStats.neighbors} label="Neighbors" />
          </View>
        </LinearGradient>
      </ImageBackground>

      <View style={styles.body}>
        <QuickReportButton onPress={() => router.push('/report/new')} />

        <SectionHeader title="Upcoming events" />
        {upcomingEvents.length === 0 ? (
          <Text style={styles.eventsEmpty}>No upcoming events yet. Pull down to refresh.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventsScroll}>
            {upcomingEvents.map((event) => (
              <EventCarouselCard
                key={event.id}
                event={event}
                onPress={() => router.push(`/event/${event.id}`)}
              />
            ))}
          </ScrollView>
        )}

        <SectionHeader title="Community wins" />
        {communityWins.map((win) => (
          <CommunityWinCard key={win.id} win={win} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: Spacing.xl,
  },
  hero: {
    minHeight: 320,
  },
  heroGradient: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'flex-end',
  },
  heroBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  heroBrandText: {
    flex: 1,
  },
  brandName: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  brandTagline: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    marginTop: 2,
  },
  greeting: {
    color: Colors.white,
    fontSize: 16,
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  motto: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 2,
  },
  body: {
    padding: Spacing.lg,
  },
  quickReport: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: {
    flex: 1,
  },
  quickTitle: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  quickSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  eventsScroll: {
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  eventsEmpty: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: Spacing.lg,
  },
  eventCard: {
    width: 280,
    height: 180,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  eventImage: {
    flex: 1,
  },
  eventImageInner: {
    borderRadius: Radius.lg,
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
    fontSize: 16,
    fontWeight: '700',
  },
  eventMeta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  winCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  winIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winContent: {
    flex: 1,
  },
  winTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  winDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  winMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
  },
});
