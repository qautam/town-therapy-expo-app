import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/SectionHeader';
import { CommunityPost, communityFilters, communityPosts } from '@/constants/data';
import { Colors, Radius, Spacing } from '@/constants/theme';

const categoryStyles: Record<
  CommunityPost['category'],
  { bg: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  Success: { bg: Colors.tealLight, color: '#2A8F7B', icon: 'sparkles' },
  'Before/After': { bg: Colors.greenLight, color: Colors.primary, icon: 'swap-horizontal' },
  Volunteer: { bg: Colors.orangeLight, color: Colors.orange, icon: 'people' },
  'Local Hero': { bg: Colors.pinkLight, color: Colors.red, icon: 'trophy' },
};

function FilterChips({
  active,
  onChange,
}: {
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}>
      {communityFilters.map((filter) => {
        const isActive = active === filter;
        return (
          <Pressable
            key={filter}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onChange(filter)}>
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{filter}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function PostCard({ post }: { post: CommunityPost }) {
  const style = categoryStyles[post.category];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.authorRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{post.authorInitial}</Text>
          </View>
          <View>
            <Text style={styles.authorName}>{post.author}</Text>
            <Text style={styles.timestamp}>{post.timestamp}</Text>
          </View>
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: style.bg }]}>
          <Ionicons name={style.icon} size={12} color={style.color} />
          <Text style={[styles.categoryText, { color: style.color }]}>{post.category}</Text>
        </View>
      </View>

      <Text style={styles.postTitle}>{post.title}</Text>
      <Text style={styles.postDescription}>{post.description}</Text>

      <View style={styles.cardFooter}>
        <View style={styles.actions}>
          <Pressable style={styles.action}>
            <Ionicons name="heart-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.actionText}>{post.likes}</Text>
          </Pressable>
          <Pressable style={styles.action}>
            <Ionicons name="share-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.actionText}>Share</Text>
          </Pressable>
        </View>
        {post.featured ? (
          <View style={styles.featured}>
            <Ionicons name="star" size={12} color="#B8860B" />
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function CommunityScreen() {
  const [filter, setFilter] = useState('All');

  const posts = useMemo(
    () =>
      filter === 'All'
        ? communityPosts
        : communityPosts.filter((p) => p.category === filter),
    [filter]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Community"
        subtitle="Every good story starts here."
        right={
          <Pressable style={styles.fab}>
            <Ionicons name="add" size={24} color={Colors.white} />
          </Pressable>
        }
      />

      <FilterChips active={filter} onChange={setFilter} />

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.card,
  },
  chipActive: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  chipTextActive: {
    color: Colors.white,
  },
  list: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  authorName: {
    fontWeight: '700',
    color: Colors.text,
    fontSize: 14,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  postDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  featured: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.goldLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  featuredText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B8860B',
  },
});
