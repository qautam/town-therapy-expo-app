import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { api } from '@/lib/api';
import { getGuestId, getGuestProfile, type GuestProfile } from '@/lib/guest';
import { getCachedNewsletter } from '@/lib/newsletter';
import { applyLocalLevelFields } from '@/lib/volunteerProfileMapper';
import type {
  NewsletterSignupInput,
  NewsletterSubscription,
  NewsletterUpdateInput,
  TakeVolunteerBreakInput,
  UpdateProfileInput,
} from '@/types/database';

type RefreshOptions = {
  /** Full recount of completed drives/reports (slow). Use after complete/report only. */
  reconcile?: boolean;
};

type VolunteerContextValue = {
  guestId: string | null;
  profile: GuestProfile | null;
  newsletter: NewsletterSubscription | null;
  loading: boolean;
  /** True after cache or first cloud read — avoid flashing empty stats. */
  statsReady: boolean;
  refresh: (options?: RefreshOptions) => Promise<{
    guestId: string;
    profile: GuestProfile;
    newsletter: NewsletterSubscription | null;
  }>;
  updateProfile: (input: UpdateProfileInput & { full_name?: string }) => Promise<void>;
  newsletterSignUp: (input: NewsletterSignupInput) => Promise<void>;
  newsletterSignIn: (email: string) => Promise<void>;
  updateNewsletter: (input: NewsletterUpdateInput) => Promise<void>;
  newsletterUnsubscribe: () => Promise<void>;
  takeVolunteerBreak: (input: TakeVolunteerBreakInput) => Promise<void>;
  resumeVolunteer: () => Promise<void>;
};

const VolunteerContext = createContext<VolunteerContextValue | null>(null);

/** At most one background recount per this window. */
const RECONCILE_COOLDOWN_MS = 5 * 60_000;

export function VolunteerProvider({ children }: { children: ReactNode }) {
  const [guestId, setGuestId] = useState<string | null>(null);
  const [profile, setProfile] = useState<GuestProfile | null>(null);
  const [newsletter, setNewsletter] = useState<NewsletterSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsReady, setStatsReady] = useState(false);
  const lastReconcileAt = useRef(0);

  const refresh = useCallback(async (options?: RefreshOptions) => {
    const id = await getGuestId();
    setGuestId(id);

    const subscription = await api.getNewsletterSubscription(id, {
      force: true,
      reconcile: Boolean(options?.reconcile),
    });

    if (options?.reconcile) {
      lastReconcileAt.current = Date.now();
    } else if (Date.now() - lastReconcileAt.current > RECONCILE_COOLDOWN_MS) {
      // Soft tab refreshes: recount in the background at most every few minutes
      lastReconcileAt.current = Date.now();
      void api.getNewsletterSubscription(id, { force: true, reconcile: true }).then(async (row) => {
        if (!row) return;
        setNewsletter(row);
        setProfile(await getGuestProfile());
      });
    }

    const guestProfile = await getGuestProfile();
    setProfile(guestProfile);
    setNewsletter(subscription);
    setStatsReady(true);
    return { guestId: id, profile: guestProfile, newsletter: subscription };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const id = await getGuestId();
        if (!active) return;
        setGuestId(id);

        const [guestProfile, cached] = await Promise.all([getGuestProfile(), getCachedNewsletter()]);
        if (!active) return;

        setProfile(guestProfile);
        if (cached?.guest_id === id) {
          setNewsletter(applyLocalLevelFields(cached));
          setStatsReady(true);
        }
        setLoading(false);

        // Soft cloud refresh (single profile read) — not a full recount
        const subscription = await api.getNewsletterSubscription(id, { force: true });
        if (!active) return;
        setNewsletter(subscription);
        setProfile(await getGuestProfile());
        setStatsReady(true);

        // One background recount after boot so multi-device stats stay honest
        lastReconcileAt.current = Date.now();
        void api.getNewsletterSubscription(id, { force: true, reconcile: true }).then(async (row) => {
          if (!active || !row) return;
          setNewsletter(row);
          setProfile(await getGuestProfile());
        });
      } catch {
        if (active) {
          setLoading(false);
          setStatsReady(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const updateProfile = useCallback(async (input: UpdateProfileInput & { full_name?: string }) => {
    const updated = await api.updateVolunteerProfile(input);
    setProfile(updated);
    if (guestId) {
      const cached = await getCachedNewsletter();
      if (cached?.guest_id === guestId) {
        setNewsletter(applyLocalLevelFields(cached));
      } else {
        const subscription = await api.getNewsletterSubscription(guestId, { force: true });
        setNewsletter(subscription);
        setProfile(await getGuestProfile());
      }
    }
  }, [guestId]);

  const newsletterSignUp = useCallback(
    async (input: NewsletterSignupInput) => {
      if (!guestId) throw new Error('Device not ready yet.');
      const subscription = await api.newsletterSignUp(guestId, input);
      setNewsletter(subscription);
      setProfile(await getGuestProfile());
      lastReconcileAt.current = Date.now();
    },
    [guestId]
  );

  const newsletterSignIn = useCallback(
    async (email: string) => {
      if (!guestId) throw new Error('Device not ready yet.');
      const subscription = await api.newsletterSignIn(guestId, email);
      setNewsletter(subscription);
      setProfile(await getGuestProfile());
      lastReconcileAt.current = Date.now();
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
    setProfile(await getGuestProfile());
  }, [guestId]);

  const takeVolunteerBreak = useCallback(
    async (input: TakeVolunteerBreakInput) => {
      if (!guestId) throw new Error('Device not ready yet.');
      const subscription = await api.takeVolunteerBreak(guestId, input);
      setNewsletter(subscription);
      setProfile(await getGuestProfile());
    },
    [guestId]
  );

  const resumeVolunteer = useCallback(async () => {
    if (!guestId) throw new Error('Device not ready yet.');
    const subscription = await api.resumeVolunteer(guestId);
    setNewsletter(subscription);
    setProfile(await getGuestProfile());
  }, [guestId]);

  const value = useMemo(
    () => ({
      guestId,
      profile,
      newsletter,
      loading,
      statsReady,
      refresh,
      updateProfile,
      newsletterSignUp,
      newsletterSignIn,
      updateNewsletter,
      newsletterUnsubscribe,
      takeVolunteerBreak,
      resumeVolunteer,
    }),
    [
      guestId,
      profile,
      newsletter,
      loading,
      statsReady,
      refresh,
      updateProfile,
      newsletterSignUp,
      newsletterSignIn,
      updateNewsletter,
      newsletterUnsubscribe,
      takeVolunteerBreak,
      resumeVolunteer,
    ]
  );

  return <VolunteerContext.Provider value={value}>{children}</VolunteerContext.Provider>;
}

export function useVolunteer() {
  const context = useContext(VolunteerContext);
  if (!context) throw new Error('useVolunteer must be used within VolunteerProvider');
  return context;
}
