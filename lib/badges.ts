import type { BadgeShape, BadgeTier } from '@/components/AchievementBadge';

/** How a badge unlock is measured for a volunteer profile. */
export type BadgeRequirementType =
  | 'reports'
  | 'events'
  | 'tree_events'
  | 'hero_features'
  | 'wall_photos';

export type BadgeDefinition = {
  id: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  tier: BadgeTier;
  shape: BadgeShape;
  requirementType: BadgeRequirementType;
  requirementCount: number;
  /** Short unlock criteria */
  description: string;
};

export type VolunteerBadgeStats = {
  reports: number;
  events: number;
  treeEvents: number;
  heroFeatures: number;
  wallPhotos: number;
};

/**
 * Canonical badge catalog — keep in sync with supabase/badges.sql
 */
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first-report',
    label: 'First Report',
    icon: 'flag',
    color: '#FF4500',
    bgColor: '#FFE8DC',
    tier: 'coral',
    shape: 'flag',
    requirementType: 'reports',
    requirementCount: 1,
    description: 'Submit your first grievance report',
  },
  {
    id: 'first-cleanup',
    label: 'First Cleanup',
    icon: 'sparkles',
    color: '#E8B923',
    bgColor: '#FFF6D6',
    tier: 'gold',
    shape: 'spark',
    requirementType: 'events',
    requirementCount: 1,
    description: 'Attend your first town drive or event',
  },
  {
    id: 'active-volunteer',
    label: 'Active Volunteer',
    icon: 'people',
    color: '#5B7C99',
    bgColor: '#EEF2F6',
    tier: 'silver',
    shape: 'hands',
    requirementType: 'events',
    requirementCount: 5,
    description: 'Attend 5+ drives or events',
  },
  {
    id: 'community-hero',
    label: 'Community Hero',
    icon: 'trophy',
    color: '#D4A017',
    bgColor: '#FFF6D6',
    tier: 'gold',
    shape: 'trophy',
    requirementType: 'hero_features',
    requirementCount: 1,
    description: 'Get featured as a community hero once',
  },
  {
    id: 'ten-events',
    label: '10 Events Joined',
    icon: 'calendar',
    color: '#B87333',
    bgColor: '#F5E6D8',
    tier: 'bronze',
    shape: 'calendar',
    requirementType: 'events',
    requirementCount: 10,
    description: 'Attend 10+ drives or events',
  },
  {
    id: 'the-reporter',
    label: 'The Reporter',
    icon: 'megaphone',
    color: '#E8874A',
    bgColor: '#FDF0E6',
    tier: 'coral',
    shape: 'clipboard',
    requirementType: 'reports',
    requirementCount: 10,
    description: 'Report 10+ grievances',
  },
  {
    id: 'tree-planter',
    label: 'Tree Planter',
    icon: 'leaf',
    color: '#2E7D32',
    bgColor: '#E8F5E9',
    tier: 'silver',
    shape: 'leaf',
    requirementType: 'tree_events',
    requirementCount: 1,
    description: 'Join a tree planting drive',
  },
  {
    id: 'local-legend',
    label: 'Local Legend',
    icon: 'ribbon',
    color: '#C98900',
    bgColor: '#FFF6D6',
    tier: 'gold',
    shape: 'star',
    requirementType: 'hero_features',
    requirementCount: 3,
    description: 'Featured as community hero 3+ times',
  },
  {
    id: 'town-lens',
    label: 'Town Lens',
    icon: 'camera',
    color: '#2E86AB',
    bgColor: '#E5F2F8',
    tier: 'silver',
    shape: 'lens',
    requirementType: 'wall_photos',
    requirementCount: 10,
    description: 'Add 10+ photos on the community wall',
  },
  {
    id: 'the-mighty-one',
    label: 'The Mighty One',
    icon: 'flame',
    color: '#14532D',
    bgColor: '#D4EBDA',
    tier: 'platinum',
    shape: 'crest',
    requirementType: 'events',
    requirementCount: 50,
    description: 'Attend 50+ drives or events',
  },
];

export function progressForRequirement(
  stats: VolunteerBadgeStats,
  type: BadgeRequirementType
): number {
  switch (type) {
    case 'reports':
      return stats.reports;
    case 'events':
      return stats.events;
    case 'tree_events':
      return stats.treeEvents;
    case 'hero_features':
      return stats.heroFeatures;
    case 'wall_photos':
      return stats.wallPhotos;
    default:
      return 0;
  }
}

export function isBadgeUnlocked(def: BadgeDefinition, stats: VolunteerBadgeStats): boolean {
  return progressForRequirement(stats, def.requirementType) >= def.requirementCount;
}

export function evaluateBadges(stats: VolunteerBadgeStats) {
  return BADGE_DEFINITIONS.map((def) => {
    const progress = progressForRequirement(stats, def.requirementType);
    const unlocked = progress >= def.requirementCount;
    return {
      id: def.id,
      label: def.label,
      icon: def.icon,
      color: def.color,
      bg_color: def.bgColor,
      locked: !unlocked,
      tier: def.tier,
      shape: def.shape,
      description: def.description,
      requirement_type: def.requirementType,
      requirement_count: def.requirementCount,
      progress,
    };
  });
}

export const EMPTY_BADGE_STATS: VolunteerBadgeStats = {
  reports: 0,
  events: 0,
  treeEvents: 0,
  heroFeatures: 0,
  wallPhotos: 0,
};
