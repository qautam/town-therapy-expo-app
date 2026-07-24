import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IMPACT_ESTIMATES, type VolunteerImpactSummary } from '@/lib/impactMetrics';
import { Colors, Radius, Spacing } from '@/constants/theme';

type Props = {
  impact: VolunteerImpactSummary;
  compact?: boolean;
  onPressExpand?: () => void;
};

function MetricTile({
  icon,
  value,
  label,
  detail,
  color,
  bgColor,
}: VolunteerImpactSummary['highlights'][0]) {
  return (
    <View style={[styles.metricTile, { backgroundColor: bgColor }]}>
      <View style={[styles.metricIcon, { backgroundColor: Colors.white }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {!detail ? null : <Text style={styles.metricDetail}>{detail}</Text>}
    </View>
  );
}

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.max(progress * 100, 4)}%`, backgroundColor: color }]} />
    </View>
  );
}

export function PersonalImpactDashboard({ impact, compact = false, onPressExpand }: Props) {
  const showTownPulse = impact.town.resolved > 0 || impact.town.issues > 0;

  return (
    <View style={styles.wrapper}>
      <LinearGradient colors={[Colors.primary, Colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroEyebrow}>YOUR HAZARIBAGH IMPACT</Text>
            <Text style={styles.heroTitle}>{impact.headline}</Text>
            <Text style={styles.heroSubtitle}>{impact.subheadline}</Text>
          </View>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreValue}>{impact.impactScore}</Text>
            <Text style={styles.scoreLabel}>pts</Text>
          </View>
        </View>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{impact.volunteerHours}h</Text>
            <Text style={styles.heroStatLabel}>Volunteered</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{impact.spotsImproved}</Text>
            <Text style={styles.heroStatLabel}>Spots helped</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{impact.reportsFlagged}</Text>
            <Text style={styles.heroStatLabel}>Reports filed</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.grid}>
        {impact.highlights.map((item) => (
          <MetricTile key={item.id} {...item} />
        ))}
      </View>

      {!compact ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Real-world ripple</Text>
            {impact.ripple.map((line, index) => (
              <View key={index} style={styles.rippleRow}>
                <View style={styles.rippleDot} />
                <Text style={styles.rippleText}>{line}</Text>
              </View>
            ))}
          </View>

          {showTownPulse ? (
            <View style={styles.townCard}>
              <Text style={styles.sectionTitle}>Town pulse</Text>
              <Text style={styles.townCopy}>
                Across Town Therapy, neighbors are tracking {impact.town.issues} open issue
                {impact.town.issues === 1 ? '' : 's'} and {impact.town.resolved} resolved reform
                {impact.town.resolved === 1 ? '' : 's'}.
              </Text>
              <View style={styles.townRow}>
                <View style={styles.townMetric}>
                  <Text style={styles.townMetricValue}>{impact.documentationSharePercent}%</Text>
                  <Text style={styles.townMetricLabel}>Of town reports you documented</Text>
                </View>
                <View style={styles.townMetric}>
                  <Text style={styles.townMetricValue}>{impact.resolutionRatePercent}%</Text>
                  <Text style={styles.townMetricLabel}>Of your reports resolved</Text>
                </View>
              </View>
            </View>
          ) : null}
        </>
      ) : null}

      <View style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalTitle}>{impact.nextGoal.title}</Text>
          <Text style={styles.goalTarget}>{impact.nextGoal.targetLabel}</Text>
        </View>
        <Text style={styles.goalSubtitle}>{impact.nextGoal.subtitle}</Text>
        <ProgressBar progress={impact.nextGoal.progress} color={Colors.primary} />
      </View>

      {compact && onPressExpand ? (
        <Pressable style={styles.expandButton} onPress={onPressExpand}>
          <Text style={styles.expandButtonText}>Open full impact dashboard</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
        </Pressable>
      ) : null}

      <Text style={styles.footnote}>
        Estimates use average Town Therapy cleanup drive data (~{IMPACT_ESTIMATES.hoursPerDrive} hrs, ~
        {IMPACT_ESTIMATES.wasteKgPerDrive} kg waste per drive).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.md,
  },
  hero: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  heroTitle: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 220,
  },
  scoreBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 26,
  },
  scoreLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '700',
  },
  heroStats: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  heroStatLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  heroDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricTile: {
    width: '48.5%',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    minHeight: 132,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  metricDetail: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 15,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  rippleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  rippleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  rippleText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  townCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  townCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  townRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  townMetric: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  townMetricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  townMetricLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 14,
  },
  goalCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  goalTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  goalTarget: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  goalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: Spacing.sm,
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
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    backgroundColor: Colors.greenLight,
  },
  expandButtonText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  footnote: {
    fontSize: 11,
    lineHeight: 15,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
