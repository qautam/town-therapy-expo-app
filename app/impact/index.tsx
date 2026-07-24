import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PersonalImpactDashboard } from '@/components/PersonalImpactDashboard';
import { TownTherapyLogo } from '@/components/TownTherapyLogo';
import { useVolunteer } from '@/context/VolunteerContext';
import { api } from '@/lib/api';
import { getEmptyImpactPreview, type VolunteerImpactSummary } from '@/lib/impactMetrics';
import { Colors, Spacing } from '@/constants/theme';

export default function ImpactDashboardScreen() {
  const router = useRouter();
  const { guestId, profile, newsletter } = useVolunteer();
  const [impact, setImpact] = useState<VolunteerImpactSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const isRegistered = profile?.registered ?? Boolean(newsletter);

  const loadImpact = useCallback(async () => {
    if (!guestId || !isRegistered) {
      setImpact(getEmptyImpactPreview());
      return;
    }

    const summary = await api.getVolunteerImpactSummary(guestId);
    setImpact(summary);
  }, [guestId, isRegistered]);

  useEffect(() => {
    loadImpact().finally(() => setLoading(false));
  }, [loadImpact]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TownTherapyLogo size={52} withShadow />
            <Text style={styles.headerTitle}>Your Hazaribagh impact</Text>
          </View>
          {!isRegistered ? (
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Preview mode</Text>
              <Text style={styles.noticeText}>
                Create your volunteer profile to start tracking real drives, reports, and town impact.
              </Text>
            </View>
          ) : null}
          {impact ? <PersonalImpactDashboard impact={impact} /> : null}
          {!isRegistered ? (
            <Pressable onPress={() => router.push('/newsletter')}>
              <Text style={styles.linkHint}>Sign up to unlock your personal dashboard →</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  notice: {
    backgroundColor: Colors.orangeLight,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  noticeText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  linkHint: {
    marginTop: Spacing.lg,
    textAlign: 'center',
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});
