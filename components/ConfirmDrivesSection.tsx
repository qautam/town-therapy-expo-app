import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { api, formatEventDateParts } from '@/lib/api';
import { cacheGetOrFetch, cacheInvalidate } from '@/lib/queryCache';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { VolunteerDriveCheckIn } from '@/types/database';

const DRIVES_TTL_MS = 90_000;

type Props = {
  guestId: string;
  onCompleted?: () => void;
};

export function ConfirmDrivesSection({ guestId, onCompleted }: Props) {
  const [drives, setDrives] = useState<VolunteerDriveCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (force = false) => {
      setError(null);
      try {
        const rows = await cacheGetOrFetch(
          `drive-checkins:${guestId}`,
          DRIVES_TTL_MS,
          () => api.listVolunteerDriveCheckIns(guestId),
          {
            force,
            onCacheHit: (cached) => {
              setDrives(cached);
              setLoading(false);
            },
          }
        );
        setDrives(rows);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load drives.');
      } finally {
        setLoading(false);
      }
    },
    [guestId]
  );

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load])
  );

  const markComplete = async (driveId: string) => {
    setBusyId(driveId);
    setError(null);
    try {
      const result = await api.completeVolunteerDrive(guestId, driveId);
      cacheInvalidate(`drive-checkins:${guestId}`);
      cacheInvalidate('home:');
      cacheInvalidate('events:');
      setDrives(result.drives);
      onCompleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark complete.');
    } finally {
      setBusyId(null);
    }
  };

  const pending = drives.filter((d) => !d.completed);
  const done = drives.filter((d) => d.completed);

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Confirm your drives</Text>
      <Text style={styles.subtitle}>
        After a drive ends, tap Complete so it counts toward your hours and level.
      </Text>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.md }} />
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && drives.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No past drives yet. RSVP to a drive, go help out, then come back here to mark it complete.
          </Text>
        </View>
      ) : null}

      {pending.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.listLabel}>Waiting for you</Text>
          {pending.map((drive) => {
            const { date, month, time } = formatEventDateParts(drive.starts_at);
            const busy = busyId === drive.id;
            return (
              <View key={drive.id} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {drive.title}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {date} {month} · {time} · {drive.location_label}
                  </Text>
                </View>
                <Pressable
                  style={[styles.completeBtn, busy && styles.completeBtnDisabled]}
                  onPress={() => markComplete(drive.id)}
                  disabled={Boolean(busyId)}>
                  {busy ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <Text style={styles.completeBtnText}>Complete</Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}

      {done.length > 0 ? (
        <View style={styles.list}>
          <Text style={styles.listLabel}>Completed</Text>
          {done.map((drive) => {
            const { date, month } = formatEventDateParts(drive.starts_at);
            return (
              <View key={drive.id} style={[styles.row, styles.rowDone]}>
                <View style={styles.checkIcon}>
                  <Ionicons name="checkmark" size={14} color={Colors.primary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {drive.title}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {date} {month} · counted toward your impact
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  error: {
    marginTop: Spacing.sm,
    color: Colors.red,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  list: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  listLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  rowDone: {
    backgroundColor: Colors.greenLight,
    borderColor: '#C5DFCA',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  rowMeta: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  completeBtn: {
    backgroundColor: Colors.orange,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 88,
    alignItems: 'center',
  },
  completeBtnDisabled: {
    opacity: 0.7,
  },
  completeBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
