export const VOLUNTEER_CAUSES = [
  'Environment',
  'Traffic',
  'Roads',
  'Cleanliness',
  'Animal welfare',
  'Art & culture',
  'Education',
] as const;

export const VOLUNTEER_SKILLS = [
  'Photography',
  'Public speaking',
  'Event coordination',
  'Graphic design',
  'Social media',
  'Teaching',
  'Gardening',
  'Fundraising',
] as const;

export const VOLUNTEER_AVAILABILITY = ['Weekdays', 'Weekends', 'Flexible'] as const;

export type VolunteerCause = (typeof VOLUNTEER_CAUSES)[number];
export type VolunteerSkill = (typeof VOLUNTEER_SKILLS)[number];
export type VolunteerAvailability = (typeof VOLUNTEER_AVAILABILITY)[number];

export const BIO_MAX_WORDS = 20;

/** Prefer a non-empty profile value, then fall back to newsletter storage. */
export function coalesceVolunteerPref(
  profileValue?: string | null,
  newsletterValue?: string | null
): string {
  const fromProfile = profileValue?.trim();
  if (fromProfile) return fromProfile;
  return newsletterValue?.trim() ?? '';
}

export function countWords(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Keep typing fluid, but never store more than BIO_MAX_WORDS. */
export function clampBioWords(text: string, max = BIO_MAX_WORDS) {
  const parts = text.trimStart().split(/(\s+)/);
  let words = 0;
  let out = '';
  for (const part of parts) {
    if (/^\s+$/.test(part)) {
      if (words > 0) out += part;
      continue;
    }
    if (!part) continue;
    if (words >= max) break;
    out += part;
    words += 1;
  }
  return out;
}
