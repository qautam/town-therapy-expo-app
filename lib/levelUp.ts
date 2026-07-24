import type { IoniconName } from '@/lib/icons';
import { getVolunteerLevel, type VolunteerLevel } from '@/lib/volunteerLevels';

export function getLevelAdvancement(
  beforeEvents: number,
  afterEvents: number
): VolunteerLevel | null {
  if (afterEvents <= beforeEvents) return null;

  const beforeLevel = getVolunteerLevel(beforeEvents);
  const afterLevel = getVolunteerLevel(afterEvents);

  if (afterLevel.rankOrder > beforeLevel.rankOrder) return afterLevel;
  return null;
}

export const LEVEL_ICONS: Record<string, IoniconName> = {
  Supporter: 'heart',
  Contributor: 'people',
  Guardian: 'shield-checkmark',
  Champion: 'trophy',
  Elite: 'star',
  Legend: 'flame',
};
