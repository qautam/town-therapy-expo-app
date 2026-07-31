import { Spacing } from '@/constants/theme';

/** Horizontal inset on profile hero + white sections — keep cards aligned. */
export const PROFILE_PAGE_GUTTER = Spacing.lg;

/**
 * Volunteer ID width:height on profile.
 * Slightly taller than ISO 7810 (1.586) to fit bio + stats without clipping.
 */
export const VOLUNTEER_ID_CARD_ASPECT = 1.45;

export function getProfileContentWidth(screenWidth: number) {
  return Math.max(0, screenWidth - PROFILE_PAGE_GUTTER * 2);
}

export function getVolunteerIdCardDimensions(screenWidth: number) {
  const width = getProfileContentWidth(screenWidth);
  const height = Math.round(width / VOLUNTEER_ID_CARD_ASPECT);
  return { width, height };
}
