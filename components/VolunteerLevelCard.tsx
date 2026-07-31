import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { VolunteerGrowthTree } from '@/components/VolunteerGrowthTree';
import {
  formatLevelRange,
  getVolunteerGrowthStage,
  getVolunteerLevelProgress,
  VOLUNTEER_LEVELS,
  type VolunteerLevelName,
} from '@/lib/volunteerLevels';
import { hoursFromDrives } from '@/lib/volunteerHours';
import { Colors, Radius, Spacing } from '@/constants/theme';

type Props = {
  eventsAttended: number;
  reportsFlagged: number;
  compact?: boolean;
};

export function VolunteerLevelCard({
  eventsAttended,
  reportsFlagged,
  compact = false,
}: Props) {
  const { current, next, progress, drivesToNext } = getVolunteerLevelProgress(eventsAttended);
  const growth = getVolunteerGrowthStage(current.id);
  const nextGrowth = next ? getVolunteerGrowthStage(next.id) : null;
  const hours = hoursFromDrives(eventsAttended);

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={[growth.bgColor, Colors.white]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <VolunteerGrowthTree levelId={current.id} size="lg" />
            <View style={styles.headerText}>
              <Text style={[styles.levelName, { color: current.color }]}>{current.name}</Text>
              <Text style={styles.growthLabel}>{growth.label}</Text>
            </View>
          </View>
          <Text style={styles.scoreLabel}>{formatLevelRange(current)}</Text>
        </View>

        <Text style={styles.description}>{current.description}</Text>

        {!compact ? (
          <View style={styles.journey}>
            <Text style={styles.journeyTitle}>Your growth journey</Text>
            <View style={styles.ladder}>
              {VOLUNTEER_LEVELS.map((level) => {
                const active = level.id === current.id;
                const reached = eventsAttended >= level.minEvents;
                const stage = getVolunteerGrowthStage(level.id);
                return (
                  <View key={level.id} style={styles.ladderItem}>
                    <View
                      style={[
                        styles.ladderTree,
                        active && styles.ladderTreeActive,
                        !reached && styles.ladderTreeLocked,
                      ]}>
                      <VolunteerGrowthTree levelId={level.id} size="sm" />
                    </View>
                    <Text
                      style={[
                        styles.ladderLabel,
                        active && { color: level.color, fontWeight: '800' },
                        !reached && { color: Colors.textMuted },
                      ]}
                      numberOfLines={2}>
                      {stage.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {next ? (
          <View style={styles.progressBlock}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressText}>
                Growing into {nextGrowth?.label ?? next.name}
              </Text>
              <Text style={styles.progressText}>
                {drivesToNext} drive{drivesToNext === 1 ? '' : 's'} left
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={[growth.color, next.color]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${Math.max(progress * 100, 6)}%` }]}
              />
            </View>
          </View>
        ) : (
          <Text style={styles.maxLevel}>Your seed has become a mighty tree for Hazaribagh.</Text>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{eventsAttended}</Text>
            <Text style={styles.statLabel}>Drives completed</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{hours}h</Text>
            <Text style={styles.statLabel}>Hours volunteered</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statValue}>{reportsFlagged}</Text>
            <Text style={styles.statLabel}>Issues documented</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

export function getLevelColor(name: VolunteerLevelName) {
  return VOLUNTEER_LEVELS.find((level) => level.name === name)?.color ?? Colors.primary;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardGradient: {
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  headerText: {
    flexShrink: 1,
  },
  levelName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  growthLabel: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  scoreLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: Spacing.md,
  },
  journey: {
    marginBottom: Spacing.md,
  },
  journeyTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  ladder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ladderItem: {
    alignItems: 'center',
    flex: 1,
  },
  ladderTree: {
    opacity: 1,
  },
  ladderTreeActive: {
    transform: [{ scale: 1.08 }],
  },
  ladderTreeLocked: {
    opacity: 0.38,
  },
  ladderLabel: {
    marginTop: 4,
    fontSize: 8,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 10,
  },
  progressBlock: {
    marginBottom: Spacing.md,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  progressTrack: {
    height: 9,
    backgroundColor: Colors.card,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  maxLevel: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '700',
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statPill: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '600',
  },
});
