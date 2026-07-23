import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { brand, communityWins, events, heroImage, user } from '@/constants/data';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { SectionHeader } from '@/components/SectionHeader';

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickReportButton() {
  return (
    <Pressable style={styles.quickReport}>
      <View style={styles.quickIcon}>
        <Ionicons name="add" size={22} color={Colors.primary} />
      </View>
      <View style={styles.quickText}>
        <Text style={styles.quickTitle}>Quick Report</Text>
        <Text style={styles.quickSubtitle}>
          Spot an issue nearby? Take a photo, tag it, and act.
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.white} />
    </Pressable>
  );
}

function EventCarouselCard({ event }: { event: (typeof events)[0] }) {
  return (
    <Pressable style={styles.eventCard}>
      <ImageBackground source={{ uri: event.image }} style={styles.eventImage} imageStyle={styles.eventImageInner}>
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.eventGradient}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateDay}>{event.date}</Text>
            <Text style={styles.dateMonth}>{event.month}</Text>
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventMeta}>
              {event.time} · {event.location}
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
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ImageBackground source={{ uri: heroImage }} style={styles.hero}>
        <LinearGradient colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.65)']} style={styles.heroGradient}>
          <Text style={styles.greeting}>Hi {user.greeting} 👋</Text>
          <Text style={styles.heroTitle}>{brand.headline}</Text>
          <Text style={styles.motto}>{brand.motto}</Text>
          <View style={styles.statsRow}>
            <StatCard value={user.dashboard.issues} label="Issues" />
            <StatCard value={user.dashboard.resolved} label="Resolved" />
            <StatCard value={user.dashboard.neighbors} label="Neighbors" />
          </View>
        </LinearGradient>
      </ImageBackground>

      <View style={styles.body}>
        <QuickReportButton />

        <SectionHeader title="Upcoming events" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventsScroll}>
          {events.map((event) => (
            <EventCarouselCard key={event.id} event={event} />
          ))}
        </ScrollView>

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
