import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEMO_VOLUNTEER_NAME, isLegacyVolunteerName, normalizeVolunteerName } from '@/lib/volunteerName';
import { hoursFromDrives } from '@/lib/volunteerHours';
import type { UpdateProfileInput } from '@/types/database';

const GUEST_ID_KEY = '@town_therapy_guest_id';
const GUEST_PROFILE_KEY = '@town_therapy_guest_profile';

export type GuestProfile = {
  full_name: string;
  bio: string;
  interests: string;
  skills: string;
  availability: string;
  tagline: string;
  registered: boolean;
  reports_submitted: number;
  events_joined: number;
  hours_volunteered: number;
};

const defaultGuestProfile = (): GuestProfile => ({
  full_name: '',
  bio: '',
  interests: '',
  skills: '',
  availability: '',
  tagline: 'Making Hazaribagh better, one step at a time.',
  registered: false,
  reports_submitted: 0,
  events_joined: 0,
  hours_volunteered: 0,
});

export async function getGuestId(): Promise<string> {
  const existing = await AsyncStorage.getItem(GUEST_ID_KEY);
  if (existing) return existing;

  const guestId = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  await AsyncStorage.setItem(GUEST_ID_KEY, guestId);
  return guestId;
}

export async function getGuestProfile(): Promise<GuestProfile> {
  const raw = await AsyncStorage.getItem(GUEST_PROFILE_KEY);
  if (!raw) {
    const profile = defaultGuestProfile();
    await AsyncStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));
    return profile;
  }

  const profile = { ...defaultGuestProfile(), ...JSON.parse(raw) } as GuestProfile;

  // Clear demo default name for guests who never registered (was prefilled as "Gautam").
  if (
    !profile.registered &&
    (isLegacyVolunteerName(profile.full_name) ||
      profile.full_name.trim().toLowerCase() === DEMO_VOLUNTEER_NAME.toLowerCase())
  ) {
    profile.full_name = '';
    await AsyncStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));
    return profile;
  }

  if (isLegacyVolunteerName(profile.full_name)) {
    profile.full_name = '';
    await AsyncStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));
  }
  return profile;
}

export async function updateGuestProfile(input: UpdateProfileInput & { full_name?: string }) {
  const profile = await getGuestProfile();
  const updated = {
    ...profile,
    ...input,
    full_name: input.full_name ? normalizeVolunteerName(input.full_name) : profile.full_name,
  };
  await AsyncStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(updated));
  return updated;
}

export async function incrementGuestStat(field: keyof Pick<GuestProfile, 'reports_submitted' | 'events_joined'>) {
  const profile = await getGuestProfile();
  profile[field] += 1;
  if (field === 'events_joined') {
    profile.hours_volunteered = hoursFromDrives(profile.events_joined);
  }
  await AsyncStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export async function decrementGuestStat(field: 'events_joined') {
  const profile = await getGuestProfile();
  profile[field] = Math.max(0, profile[field] - 1);
  profile.hours_volunteered = hoursFromDrives(profile.events_joined);
  await AsyncStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));
  return profile;
}
