import { demoVolunteer } from '@/constants/data';

/** Demo-only label — never prefill registration forms with this. */
export const DEMO_VOLUNTEER_NAME = demoVolunteer.name;

export function isLegacyVolunteerName(name?: string | null) {
  return name?.trim().toLowerCase() === 'xyz';
}

/** Keep a typed name as-is; empty/legacy names stay empty (no demo name injection). */
export function normalizeVolunteerName(name?: string | null, fallback = '') {
  const trimmed = name?.trim();
  if (!trimmed || isLegacyVolunteerName(trimmed)) return fallback;
  return trimmed;
}
