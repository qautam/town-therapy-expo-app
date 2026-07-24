import {
  getVolunteerLevelById,
  resolveVolunteerLevelId,
  VOLUNTEER_LEVELS,
  type VolunteerLevel,
  type VolunteerLevelId,
} from '@/lib/volunteerLevels';
import type { NewsletterSubscription, VolunteerProfileRecord } from '@/types/database';

export function enrichVolunteerProfile(
  subscription: NewsletterSubscription
): VolunteerProfileRecord {
  const eventsAttended = subscription.events_attended ?? 0;
  const reportsFlagged = subscription.reports_flagged ?? 0;
  const levelId =
    (subscription.volunteer_level_id as VolunteerLevelId | undefined) ??
    resolveVolunteerLevelId(eventsAttended);
  const level = getVolunteerLevelById(levelId);
  const nextLevel = subscription.next_level_name
    ? {
        name: subscription.next_level_name,
        minEvents: subscription.next_level_min_events ?? 0,
      }
    : getNextLevel(level);

  const drivesToNext = nextLevel ? Math.max(0, nextLevel.minEvents - eventsAttended) : 0;
  const range = nextLevel ? nextLevel.minEvents - level.minEvents : 1;
  const earned = eventsAttended - level.minEvents;

  return {
    ...subscription,
    volunteer_level_id: levelId,
    level,
    next_level: nextLevel,
    progress: nextLevel ? Math.min(1, earned / range) : 1,
    drives_to_next: drivesToNext,
    reports_flagged: reportsFlagged,
  };
}

function getNextLevel(current: VolunteerLevel) {
  const next = VOLUNTEER_LEVELS.find((level) => level.rankOrder === current.rankOrder + 1);
  return next ? { name: next.name, minEvents: next.minEvents } : null;
}

export function applyLocalLevelFields(
  subscription: NewsletterSubscription
): NewsletterSubscription {
  const eventsAttended = subscription.events_attended ?? 0;
  return {
    ...subscription,
    volunteer_level_id: resolveVolunteerLevelId(eventsAttended),
  };
}
