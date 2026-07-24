import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Report } from '@/types/database';

function ReportCard({ report }: { report: Report }) {
  const statusColor =
    report.status === 'resolved'
      ? Colors.primary
      : report.status === 'in_progress'
        ? Colors.orange
        : Colors.textSecondary;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{report.title}</Text>
        <Text style={[styles.cardStatus, { color: statusColor }]}>
          {report.status.replace('_', ' ')}
        </Text>
      </View>
      <Text style={styles.cardMeta}>{report.category}</Text>
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

  const loadReports = useCallback(async () => {
    if (!guestId) {
      setReports([]);
      return;
    }
    const data = await api.listReports(guestId);
    setReports(data);
  }, [guestId]);

  useEffect(() => {
    loadReports().finally(() => setLoading(false));
  }, [loadReports]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  }, [loadReports]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Your reports"
        subtitle="Track civic issues you've flagged for the town."
      />

      <View style={styles.content}>
        <Pressable style={styles.reportButton} onPress={() => router.push('/report/new')}>
          <View style={styles.reportIcon}>
            <Ionicons name="add" size={22} color={Colors.primary} />
          </View>
          <Text style={styles.reportText}>Report an issue</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : reports.length === 0 ? (
          <EmptyState
            icon="megaphone-outline"
            title="No reports yet"
            description="Spot a broken light or overflowing bin? Tap Report to log it — every report drives real change."
          />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
            }>
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
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
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 16,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  reportIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  loader: {
    marginTop: Spacing.xl,
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
