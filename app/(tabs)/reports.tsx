import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ScreenHeader } from '@/components/SectionHeader';
import { Colors, Radius, Spacing } from '@/constants/theme';

export default function ReportsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Your reports"
        subtitle="Track civic issues you've flagged for the town."
      />

      <View style={styles.content}>
        <Pressable style={styles.reportButton}>
          <View style={styles.reportIcon}>
            <Ionicons name="add" size={22} color={Colors.primary} />
          </View>
          <Text style={styles.reportText}>Report an issue</Text>
        </Pressable>

        <EmptyState
          icon="megaphone-outline"
          title="No reports yet"
          description="Spot a broken light or overflowing bin? Tap Report to log it — every report drives real change."
        />
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
});
