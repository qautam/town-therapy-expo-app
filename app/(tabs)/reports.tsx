import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ScreenHeader } from '@/components/SectionHeader';
import { useVolunteer } from '@/context/VolunteerContext';
import { api } from '@/lib/api';
import { cacheGetOrFetch, cacheGetStale, cacheInvalidate, cacheOnInvalidate } from '@/lib/queryCache';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Report } from '@/types/database';
import { reportSeverityMeta } from '@/constants/reports';

const REPORTS_TTL_MS = 60_000;

function ReportCard({ report }: { report: Report }) {
  const statusColor =
    report.status === 'resolved'
      ? Colors.primary
      : report.status === 'in_progress'
        ? Colors.orange
        : Colors.textSecondary;
  const severity = reportSeverityMeta(report.severity);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{report.title}</Text>
        <Text style={[styles.cardStatus, { color: statusColor }]}>
          {report.status.replace('_', ' ')}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.cardMeta}>{report.category}</Text>
        <View style={[styles.severityBadge, { backgroundColor: severity.softColor }]}>
          <Text style={[styles.severityBadgeText, { color: severity.color }]}>{severity.label}</Text>
        </View>
      </View>
      {report.description ? (
        <Text style={styles.cardBody} numberOfLines={3}>
          {report.description}
        </Text>
      ) : null}
      {report.location_label ? (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.cardLocation}>{report.location_label}</Text>
        </View>
      ) : null}
      {report.latitude != null && report.longitude != null ? (
        <Text style={styles.coords}>
          {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
        </Text>
      ) : null}
    </View>
  );
}

export default function ReportsScreen() {
  const router = useRouter();
  const { guestId } = useVolunteer();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReports = useCallback(
    async (force = false) => {
      if (!guestId) {
        setReports([]);
        setLoading(false);
        return;
      }
      const data = await cacheGetOrFetch(
        `reports:${guestId}`,
        REPORTS_TTL_MS,
        () => api.listReports(guestId),
        {
          force,
          onCacheHit: (cached) => {
            setReports(cached);
            setLoading(false);
          },
        }
      );
      setReports(data);
    },
    [guestId]
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          await loadReports(false);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [loadReports])
  );

  useEffect(() => {
    if (!guestId) return;
    return cacheOnInvalidate(`reports:${guestId}`, () => {
      const cached = cacheGetStale<Report[]>(`reports:${guestId}`);
      if (cached) {
        setReports(cached.value);
        setLoading(false);
      }
      void loadReports(true);
    });
  }, [guestId, loadReports]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (guestId) cacheInvalidate(`reports:${guestId}`);
      await loadReports(true);
    } finally {
      setRefreshing(false);
    }
  }, [guestId, loadReports]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Your reports"
        subtitle="Track civic issues you've flagged for the town."
      />

      <View style={styles.content}>
        <Pressable style={styles.reportButton} onPress={() => router.push('/report/new')}>
          <View style={styles.reportIcon}>
            <Ionicons name="add" size={22} color={Colors.white} />
          </View>
          <View style={styles.reportCopy}>
            <Text style={styles.reportText}>Report an issue</Text>
            <Text style={styles.reportSubtext}>Geotag · photo · send to town</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.white} />
        </Pressable>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              reports.length === 0 && styles.emptyListContent,
            ]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
            }>
            {reports.length === 0 ? (
              <EmptyState
                icon="megaphone-outline"
                title="No reports yet"
                description="Spot a broken light or overflowing bin? Tap Report to log it — every report drives real change."
              />
            ) : (
              reports.map((report) => <ReportCard key={report.id} report={report} />)
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingVertical: 16,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primaryDark,
    shadowColor: Colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  reportIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportCopy: {
    flex: 1,
    minWidth: 0,
  },
  reportText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
  reportSubtext: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    fontWeight: '600',
  },
  loader: {
    marginTop: Spacing.xl,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  cardStatus: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  metaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  severityBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardBody: {
    marginTop: Spacing.sm,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  cardLocation: {
    flex: 1,
    fontSize: 13,
    color: Colors.textMuted,
  },
  coords: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textMuted,
  },
});
