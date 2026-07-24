import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api } from '@/lib/api';
import { getGuestId, getGuestProfile, updateGuestProfile, type GuestProfile } from '@/lib/guest';
import type {
  NewsletterSignupInput,
  NewsletterSubscription,
  NewsletterUpdateInput,
  UpdateProfileInput,
} from '@/types/database';

type VolunteerContextValue = {
  guestId: string | null;
  profile: GuestProfile | null;
  newsletter: NewsletterSubscription | null;
  loading: boolean;
  refresh: () => Promise<{
    guestId: string;
    profile: GuestProfile;
    newsletter: NewsletterSubscription | null;
  }>;
  updateProfile: (input: UpdateProfileInput & { full_name?: string }) => Promise<void>;
  newsletterSignUp: (input: NewsletterSignupInput) => Promise<void>;
  newsletterSignIn: (email: string) => Promise<void>;
  updateNewsletter: (input: NewsletterUpdateInput) => Promise<void>;
  newsletterUnsubscribe: () => Promise<void>;
};

const VolunteerContext = createContext<VolunteerContextValue | null>(null);

export function VolunteerProvider({ children }: { children: ReactNode }) {
  const [guestId, setGuestId] = useState<string | null>(null);
  const [profile, setProfile] = useState<GuestProfile | null>(null);
  const [newsletter, setNewsletter] = useState<NewsletterSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const id = await getGuestId();
    const [guestProfile, subscription] = await Promise.all([
      getGuestProfile(),
      api.getNewsletterSubscription(id),
    ]);
    setGuestId(id);
    setProfile(guestProfile);
    setNewsletter(subscription);
    return { guestId: id, profile: guestProfile, newsletter: subscription };
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const updateProfile = useCallback(async (input: UpdateProfileInput & { full_name?: string }) => {
    const updated = await updateGuestProfile(input);
    setProfile(updated);
  }, []);

  const newsletterSignUp = useCallback(
    async (input: NewsletterSignupInput) => {
      if (!guestId) throw new Error('Device not ready yet.');
      const subscription = await api.newsletterSignUp(guestId, input);
      setNewsletter(subscription);
      setProfile(await getGuestProfile());
    },
    [guestId]
  );

  const newsletterSignIn = useCallback(
    async (email: string) => {
      if (!guestId) throw new Error('Device not ready yet.');
      const subscription = await api.newsletterSignIn(guestId, email);
      setNewsletter(subscription);
      setProfile(await getGuestProfile());
    },
    [guestId]
  );

  const updateNewsletter = useCallback(
    async (input: NewsletterUpdateInput) => {
      if (!guestId) throw new Error('Device not ready yet.');
      const subscription = await api.updateNewsletterSubscription(guestId, input);
      setNewsletter(subscription);
      if (input.full_name) setProfile(await getGuestProfile());
    },
    [guestId]
  );

  const newsletterUnsubscribe = useCallback(async () => {
    if (!guestId) throw new Error('Device not ready yet.');
    await api.newsletterUnsubscribe(guestId);
    setNewsletter(null);
  }, [guestId]);

  const value = useMemo(
    () => ({
      guestId,
      profile,
      newsletter,
      loading,
      refresh,
      updateProfile,
      newsletterSignUp,
      newsletterSignIn,
      updateNewsletter,
      newsletterUnsubscribe,
    }),
    [
      guestId,
      profile,
      newsletter,
      loading,
      refresh,
      updateProfile,
      newsletterSignUp,
      newsletterSignIn,
      updateNewsletter,
      newsletterUnsubscribe,
    ]
  );

  return <VolunteerContext.Provider value={value}>{children}</VolunteerContext.Provider>;
}

export function useVolunteer() {
  const context = useContext(VolunteerContext);
  if (!context) throw new Error('useVolunteer must be used within VolunteerProvider');
  return context;
}
