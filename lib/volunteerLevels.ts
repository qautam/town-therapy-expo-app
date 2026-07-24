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
 * Supporter: 0–3 drives
 * Contributor: 4–6 drives
 * Guardian: 7–10 drives
 * Champion: 11–14 drives
 * Elite: 15–19 drives
 * Legend: 20+ drives
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
    description: '1–3 drives completed. Every town hero starts here.',
  },
  {
    id: 'contributor',
    name: 'Contributor',
    rankOrder: 2,
    minEvents: 4,
    maxEvents: 6,
    color: '#2E86AB',
    bgColor: '#E5F2F8',
    description: '4–7 drives completed. You’re showing up for Hazaribagh.',
  },
  {
    id: 'guardian',
    name: 'Guardian',
    rankOrder: 3,
    minEvents: 7,
    maxEvents: 10,
    color: '#2D4F4F',
    bgColor: '#E8EFEF',
    description: '7–11 drives completed. A steady force for the town.',
  },
  {
    id: 'champion',
    name: 'Champion',
    rankOrder: 4,
    minEvents: 11,
    maxEvents: 14,
    color: '#B8860B',
    bgColor: '#FDF6E3',
    description: '11–15 drives completed. Leading by example.',
  },
  {
    id: 'elite',
    name: 'Elite',
    rankOrder: 5,
    minEvents: 15,
    maxEvents: 19,
    color: '#7B4397',
    bgColor: '#F3E8F8',
    description: '15–20 drives completed. One of the most active changemakers.',
  },
  {
    id: 'legend',
    name: 'Legend',
    rankOrder: 6,
    minEvents: 20,
    maxEvents: null,
    color: '#C0392B',
    bgColor: '#FCEAE8',
    description: '20+ drives completed. Hazaribagh legend.',
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

/** @deprecated levels are based on drives only */
export function calculateImpactScore(eventsAttended: number, _reportsFlagged?: number) {
  return Math.max(0, eventsAttended);
}

/** @deprecated use resolveVolunteerLevelId(eventsAttended) */
export const getImpactScore = calculateImpactScore;
