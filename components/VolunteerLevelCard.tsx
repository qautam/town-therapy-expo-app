import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import {
  formatLevelRange,
  getVolunteerLevelProgress,
  VOLUNTEER_LEVELS,
  type VolunteerLevelName,
} from '@/lib/volunteerLevels';
import { Colors, Radius, Spacing } from '@/constants/theme';

type Props = {
  eventsAttended: number;
  reportsFlagged: number;
  compact?: boolean;
};

export function VolunteerLevelCard({ eventsAttended, reportsFlagged, compact = false }: Props) {
  const { current, next, progress, drivesToNext } = getVolunteerLevelProgress(eventsAttended);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.levelBadge, { backgroundColor: current.bgColor }]}>
          <Text style={[styles.levelName, { color: current.color }]}>{current.name}</Text>
        </View>
        <Text style={styles.scoreLabel}>{formatLevelRange(current)}</Text>
      </View>

      <Text style={styles.description}>{current.description}</Text>

      {!compact ? (
        <View style={styles.ladder}>
          {VOLUNTEER_LEVELS.map((level) => {
            const active = level.name === current.name;
            const reached = eventsAttended >= level.minEvents;
            return (
              <View key={level.name} style={styles.ladderItem}>
                <View
                  style={[
                    styles.ladderDot,
                    {
                      backgroundColor: reached ? level.color : Colors.border,
                      borderColor: active ? level.color : 'transparent',
                      borderWidth: active ? 2 : 0,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.ladderLabel,
                    active && { color: level.color, fontWeight: '700' },
                    !reached && { color: Colors.textMuted },
                  ]}>
                  {level.name}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {next ? (
        <View style={styles.progressBlock}>
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>
              {Math.round(progress * 100)}% to {next.name}
            </Text>
            <Text style={styles.progressText}>
              {drivesToNext} drive{drivesToNext === 1 ? '' : 's'} left
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[current.color, next.color]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${Math.max(progress * 100, 4)}%` }]}
            />
          </View>
        </View>
      ) : (
        <Text style={styles.maxLevel}>Maximum level reached — you&apos;re a Legend!</Text>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{eventsAttended}</Text>
          <Text style={styles.statLabel}>Drives completed</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{reportsFlagged}</Text>
          <Text style={styles.statLabel}>Reports flagged</Text>
        </View>
      </View>
    </View>
  );
}

export function getLevelColor(name: VolunteerLevelName) {
  return VOLUNTEER_LEVELS.find((level) => level.name === name)?.color ?? Colors.primary;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  levelBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  levelName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  scoreLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  ladder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingHorizontal: 2,
  },
  ladderItem: {
    alignItems: 'center',
    flex: 1,
  },
  ladderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  ladderLabel: {
    fontSize: 8,
    color: Colors.textSecondary,
    textAlign: 'center',
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
    height: 8,
    backgroundColor: Colors.card,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  maxLevel: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statPill: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
});
