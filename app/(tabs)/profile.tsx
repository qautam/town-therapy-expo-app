import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PersonalImpactDashboard } from '@/components/PersonalImpactDashboard';
import { TownTherapyLogo } from '@/components/TownTherapyLogo';
import { VolunteerLevelCard } from '@/components/VolunteerLevelCard';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useVolunteer } from '@/context/VolunteerContext';
import { badges, brand } from '@/constants/data';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { getEmptyImpactPreview, type VolunteerImpactSummary } from '@/lib/impactMetrics';
import { getVolunteerLevel } from '@/lib/volunteerLevels';
import type { Badge } from '@/types/database';

function BadgeGrid({ badgeList }: { badgeList: Badge[] }) {
  const unlocked = badgeList.filter((b) => !b.locked).length;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Badges</Text>
        <Text style={styles.sectionCount}>
          {unlocked}/{badgeList.length}
        </Text>
      </View>
      <View style={styles.badgeGrid}>
        {badgeList.map((badge) => (
          <View key={badge.id} style={[styles.badge, badge.locked && styles.badgeLocked]}>
            <View style={[styles.badgeIcon, { backgroundColor: badge.bg_color }]}>
              <Ionicons
                name={badge.icon as keyof typeof Ionicons.glyphMap}
                size={18}
                color={badge.color}
              />
            </View>
            <Text style={[styles.badgeLabel, badge.locked && styles.badgeLabelLocked]} numberOfLines={2}>
              {badge.label}
            </Text>
            {badge.locked ? <Text style={styles.lockedText}>Locked</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
  color = Colors.text,
  bg = Colors.card,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  color?: string;
  bg?: string;
}) {
  return (
    <Pressable style={[styles.menuRow, { backgroundColor: bg }]} onPress={onPress}>
      <Ionicons name={icon} size={22} color={color === Colors.red ? Colors.red : Colors.primary} />
      <View style={styles.menuText}>
        <Text style={[styles.menuTitle, color === Colors.red && { color: Colors.red }]}>{title}</Text>
        {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, newsletter, guestId } = useVolunteer();
  const { admin } = useAdminAuth();
  const [badgeList, setBadgeList] = useState<Badge[]>(
    badges.map((b) => ({ ...b, bg_color: b.bgColor, locked: b.locked ?? false }))
  );
  const [impact, setImpact] = useState<VolunteerImpactSummary | null>(null);

  const isRegistered = profile?.registered ?? Boolean(newsletter);
  const eventsAttended = newsletter?.events_attended ?? profile?.events_joined ?? 0;
  const reportsFlagged = newsletter?.reports_flagged ?? profile?.reports_submitted ?? 0;
  const level = useMemo(() => getVolunteerLevel(eventsAttended), [eventsAttended]);

  useEffect(() => {
    if (!guestId) return;
    api.listBadges().then(setBadgeList);
  }, [guestId]);

  useEffect(() => {
    if (!guestId) return;

    if (!isRegistered) {
      setImpact(getEmptyImpactPreview());
      return;
    }

    api.getVolunteerImpactSummary(guestId).then(setImpact);
  }, [guestId, isRegistered, eventsAttended, reportsFlagged]);


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View
            style={[
              styles.logoRing,
              isRegistered && { borderColor: level.color, backgroundColor: level.bgColor },
            ]}>
            <TownTherapyLogo size={88} />
          </View>
          <Text style={styles.name}>{profile?.full_name ?? 'Volunteer'}</Text>
          {isRegistered ? (
            <View style={[styles.levelPill, { backgroundColor: level.bgColor }]}>
              <Text style={[styles.levelPillText, { color: level.color }]}>{level.name}</Text>
            </View>
          ) : null}
          <Text style={styles.email}>
            {newsletter?.email ?? 'Sign up to create your volunteer profile'}
          </Text>
          <Text style={styles.tagline}>
            {isRegistered
              ? profile?.tagline
              : 'Join to track drives, reports, and rise from Supporter to Legend.'}
          </Text>
        </View>

        {isRegistered && impact ? (
          <View style={styles.levelSection}>
            <Text style={styles.sectionTitle}>Personal impact</Text>
            <PersonalImpactDashboard
              impact={impact}
              compact
              onPressExpand={() => router.push('/impact')}
            />
          </View>
        ) : null}

        {isRegistered ? (
          <View style={styles.levelSection}>
            <Text style={styles.sectionTitle}>Your impact level</Text>
            <VolunteerLevelCard
              eventsAttended={eventsAttended}
              reportsFlagged={reportsFlagged}
            />
          </View>
        ) : (
          <Pressable style={styles.signUpCard} onPress={() => router.push('/newsletter')}>
            <Ionicons name="person-add-outline" size={24} color={Colors.primary} />
            <View style={styles.signUpText}>
              <Text style={styles.signUpTitle}>Create your volunteer profile</Text>
              <Text style={styles.signUpSubtitle}>
                Sign up with email to unlock levels, track drives attended, and reports flagged.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
          </Pressable>
        )}

        <Pressable style={styles.newsletterCard} onPress={() => router.push('/newsletter')}>
          <View style={styles.newsletterIcon}>
            <Ionicons name="mail" size={20} color={Colors.primary} />
          </View>
          <View style={styles.newsletterText}>
            <Text style={styles.newsletterTitle}>
              {newsletter ? 'Email preferences' : 'Sign up for updates'}
            </Text>
            <Text style={styles.newsletterSubtitle}>
              {newsletter
                ? `Subscribed as ${newsletter.email}`
                : 'Get event reminders and town news in your inbox'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
        </Pressable>

        {isRegistered ? <BadgeGrid badgeList={badgeList} /> : null}

        {isRegistered ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Volunteer profile</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>INTERESTS</Text>
                <Text style={styles.infoValue}>{profile?.interests ?? '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>SKILLS</Text>
                <Text style={styles.infoValue}>{profile?.skills ?? '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>AVAILABILITY</Text>
                <Text style={styles.infoValue}>{profile?.availability ?? '—'}</Text>
              </View>
            </View>
          </View>
        ) : null}

        <MenuRow
          icon="sparkles"
          title="Civic Tips Assistant"
          subtitle="Ask about volunteering, community, or civic action."
          bg={Colors.orangeLight}
        />
        <MenuRow
          icon="shield-outline"
          title={admin ? 'Admin panel' : 'Admin login'}
          subtitle={admin ? 'Manage civic reports' : 'Town admins only'}
          onPress={() => router.push(admin ? '/admin' : '/admin/login')}
        />

        <Text style={styles.footer}>
          {brand.name} · {brand.location}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRing: {
    padding: 4,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  avatarLargeText: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: '700',
  },
  name: {
    marginTop: Spacing.md,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  levelPill: {
    marginTop: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  levelPillText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  email: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  tagline: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.text,
    textAlign: 'center',
  },
  levelSection: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  signUpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.greenLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  signUpText: { flex: 1 },
  signUpTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  signUpSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },
  newsletterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  newsletterIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newsletterText: { flex: 1 },
  newsletterTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  newsletterSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },
  section: {
    marginTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionCount: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  badge: {
    width: '31%',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
    minHeight: 90,
  },
  badgeLocked: {
    opacity: 0.5,
  },
  badgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  badgeLabelLocked: {
    color: Colors.textMuted,
  },
  lockedText: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  infoRow: {
    marginBottom: Spacing.md,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginTop: Spacing.md,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  menuSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontSize: 12,
    color: Colors.textMuted,
  },
});
