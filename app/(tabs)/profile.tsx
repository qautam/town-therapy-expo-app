import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { badges, brand, user } from '@/constants/data';
import { Colors, Radius, Spacing } from '@/constants/theme';

function StatBox({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon} size={20} color={Colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function BadgeGrid() {
  const unlocked = badges.filter((b) => !b.locked).length;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Badges</Text>
        <Text style={styles.sectionCount}>
          {unlocked}/{badges.length}
        </Text>
      </View>
      <View style={styles.badgeGrid}>
        {badges.map((badge) => (
          <View key={badge.id} style={[styles.badge, badge.locked && styles.badgeLocked]}>
            <View style={[styles.badgeIcon, { backgroundColor: badge.bgColor }]}>
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
  color = Colors.text,
  bg = Colors.card,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  color?: string;
  bg?: string;
}) {
  return (
    <View style={[styles.menuRow, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={22} color={color === Colors.red ? Colors.red : Colors.primary} />
      <View style={styles.menuText}>
        <Text style={[styles.menuTitle, color === Colors.red && { color: Colors.red }]}>{title}</Text>
        {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>T</Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.tagline}>{user.tagline}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color={Colors.red} />
            <Text style={styles.roleText}>{user.role}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatBox icon="time-outline" value={user.stats.hours} label="Hours" />
          <StatBox icon="calendar-outline" value={user.stats.events} label="Events" />
          <StatBox icon="megaphone-outline" value={user.stats.reports} label="Reports" />
        </View>

        <BadgeGrid />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Volunteer profile</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>INTERESTS</Text>
              <Text style={styles.infoValue}>{user.interests}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>SKILLS</Text>
              <Text style={styles.infoValue}>{user.skills}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>AVAILABILITY</Text>
              <Text style={styles.infoValue}>{user.availability}</Text>
            </View>
            <View style={styles.editRow}>
              <Ionicons name="create-outline" size={16} color={Colors.primary} />
              <Text style={styles.editText}>Edit volunteer info</Text>
            </View>
          </View>
        </View>

        <MenuRow
          icon="sparkles"
          title="Civic Tips Assistant"
          subtitle="Ask about volunteering, community, or civic action."
          bg={Colors.orangeLight}
        />
        <MenuRow icon="shield-outline" title="Admin panel" />
        <MenuRow icon="log-out-outline" title="Log out" color={Colors.red} />

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
  email: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  tagline: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.text,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.red,
    backgroundColor: Colors.white,
  },
  roleText: {
    color: Colors.red,
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
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
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  editText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
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
