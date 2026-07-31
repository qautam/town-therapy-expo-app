export type VolunteerLevelName =
  | 'Supporter'
  | 'Contributor'
  | 'Guardian'
  | 'Champion'
  | 'Elite'
  | 'Legend';

export type VolunteerLevelId =
  | 'supporter'
  | 'contributor'
  | 'guardian'
  | 'champion'
  | 'elite'
  | 'legend';

export type VolunteerLevel = {
  id: VolunteerLevelId;
  name: VolunteerLevelName;
  rankOrder: number;
  /** Minimum completed drives/events required to reach this level */
  minEvents: number;
  /** Inclusive upper bound for this tier (null = no cap) */
  maxEvents: number | null;
  color: string;
  bgColor: string;
  description: string;
};

/**
 * Level ladder based on drives/events completed.
 * Keep in sync with supabase/volunteer_levels seed data.
 *
 * Supporter (Seed): 0–3 drives
 * Contributor (Sapling): 4–10 drives
 * Guardian (Small tree): 11–20 drives
 * Champion (Young tree): 21–30 drives
 * Elite (Big one): 31–40 drives
 * Legend (Mighty tree): 41+ drives
 */
export const VOLUNTEER_LEVELS: VolunteerLevel[] = [
  {
    id: 'supporter',
    name: 'Supporter',
    rankOrder: 1,
    minEvents: 0,
    maxEvents: 3,
    color: '#6B6B6B',
    bgColor: '#F0EDE6',
    description: '0–3 drives completed. Every town hero starts here.',
  },
  {
    id: 'contributor',
    name: 'Contributor',
    rankOrder: 2,
    minEvents: 4,
    maxEvents: 10,
    color: '#2E86AB',
    bgColor: '#E5F2F8',
    description: '4–10 drives completed. You’re showing up for Hazaribagh.',
  },
  {
    id: 'guardian',
    name: 'Guardian',
    rankOrder: 3,
    minEvents: 11,
    maxEvents: 20,
    color: '#2D4F4F',
    bgColor: '#E8EFEF',
    description: '11–20 drives completed. A steady force for the town.',
  },
  {
    id: 'champion',
    name: 'Champion',
    rankOrder: 4,
    minEvents: 21,
    maxEvents: 30,
    color: '#B8860B',
    bgColor: '#FDF6E3',
    description: '21–30 drives completed. Leading by example.',
  },
  {
    id: 'elite',
    name: 'Elite',
    rankOrder: 5,
    minEvents: 31,
    maxEvents: 40,
    color: '#7B4397',
    bgColor: '#F3E8F8',
    description: '31–40 drives completed. One of the most active changemakers.',
  },
  {
    id: 'legend',
    name: 'Legend',
    rankOrder: 6,
    minEvents: 41,
    maxEvents: null,
    color: '#C0392B',
    bgColor: '#FCEAE8',
    description: '41+ drives completed. Hazaribagh legend.',
  },
];

export function resolveVolunteerLevelId(eventsAttended: number): VolunteerLevelId {
  const events = Math.max(0, eventsAttended);
  let current = VOLUNTEER_LEVELS[0];

  for (const level of VOLUNTEER_LEVELS) {
    if (events >= level.minEvents) current = level;
  }

  return current.id;
}

export function getVolunteerLevelById(levelId: VolunteerLevelId) {
  return VOLUNTEER_LEVELS.find((level) => level.id === levelId) ?? VOLUNTEER_LEVELS[0];
}

export function getVolunteerLevel(eventsAttended: number) {
  return getVolunteerLevelById(resolveVolunteerLevelId(eventsAttended));
}

export function getVolunteerLevelProgress(eventsAttended: number) {
  const events = Math.max(0, eventsAttended);
  const current = getVolunteerLevel(events);
  const next = VOLUNTEER_LEVELS.find((level) => level.rankOrder === current.rankOrder + 1) ?? null;

  if (!next) {
    return {
      current,
      next: null,
      eventsAttended: events,
      progress: 1,
      drivesToNext: 0,
    };
  }

  const range = next.minEvents - current.minEvents;
  const earned = events - current.minEvents;

  return {
    current,
    next,
    eventsAttended: events,
    progress: Math.min(1, earned / range),
    drivesToNext: Math.max(0, next.minEvents - events),
  };
}

export function formatLevelRange(level: VolunteerLevel) {
  if (level.maxEvents == null) return `${level.minEvents}+ drives`;
  if (level.minEvents === 0) return `0–${level.maxEvents} drives`;
  return `${level.minEvents}–${level.maxEvents} drives`;
}

export type VolunteerGrowthStageId =
  | 'seed'
  | 'sapling'
  | 'small_tree'
  | 'young_tree'
  | 'mature_tree'
  | 'mighty_tree';

export type VolunteerGrowthStage = {
  id: VolunteerGrowthStageId;
  label: string;
  color: string;
  bgColor: string;
};

/** Visual growth next to a volunteer’s name as they climb the ladder. */
export const VOLUNTEER_GROWTH_STAGES: Record<VolunteerLevelId, VolunteerGrowthStage> = {
  supporter: {
    id: 'seed',
    label: 'Seed',
    color: '#C8C8D4',
    bgColor: '#E8EFEF',
  },
  contributor: {
    id: 'sapling',
    label: 'Sapling',
    color: '#C8C8D4',
    bgColor: '#E8EFEF',
  },
  guardian: {
    id: 'small_tree',
    label: 'Small tree',
    color: '#43A047',
    bgColor: '#E8F5E9',
  },
  champion: {
    id: 'young_tree',
    label: 'Young tree',
    color: '#2E7D32',
    bgColor: '#E3F2E6',
  },
  elite: {
    id: 'mature_tree',
    label: 'Big one',
    color: '#1B5E20',
    bgColor: '#DCEFE0',
  },
  legend: {
    id: 'mighty_tree',
    label: 'Mighty tree',
    color: '#14532D',
    bgColor: '#D4EBDA',
  },
};

export function getVolunteerGrowthStage(levelId: VolunteerLevelId) {
  return VOLUNTEER_GROWTH_STAGES[levelId] ?? VOLUNTEER_GROWTH_STAGES.supporter;
}

/** Compact emoji for journey strips & identity chips */
export const VOLUNTEER_GROWTH_EMOJI: Record<VolunteerLevelId, string> = {
  supporter: '🌱',
  contributor: '🌿',
  guardian: '🌳',
  champion: '🌲',
  elite: '🌴',
  legend: '🌟',
};

export function getVolunteerGrowthEmoji(levelId: VolunteerLevelId) {
  return VOLUNTEER_GROWTH_EMOJI[levelId] ?? '🌱';
}

/** @deprecated levels are based on drives only */
export function calculateImpactScore(eventsAttended: number, _reportsFlagged?: number) {
  return Math.max(0, eventsAttended);
}

/** @deprecated use resolveVolunteerLevelId(eventsAttended) */
export const getImpactScore = calculateImpactScore;
