import { isSupabaseConfigured } from '@/lib/config';
import { decrementGuestStat, getGuestId, incrementGuestStat } from '@/lib/guest';
import { getCachedNewsletter, setCachedNewsletter } from '@/lib/newsletter';
import { localApi } from '@/lib/localStore';
import { getSupabase, REPORT_PHOTOS_BUCKET } from '@/lib/supabase';
import { enrichVolunteerProfile, applyLocalLevelFields } from '@/lib/volunteerProfileMapper';
import type {
  Badge,
  CommunityPost,
  CreatePostInput,
  CreateReportInput,
  CreateEventInput,
  CreateEmergencyAlertInput,
  DashboardStats,
  DepartmentContact,
  EmergencyAlert,
  Event,
  NewsletterSignupInput,
  NewsletterSubscription,
  NewsletterUpdateInput,
  Profile,
  Report,
  UpdateProfileInput,
  UpdateEventInput,
  VolunteerProfileRecord,
} from '@/types/database';
import { buildVolunteerImpactSummary, type VolunteerImpactSummary } from '@/lib/impactMetrics';

function formatEventRow(
  row: {
    id: string;
    title: string;
    description: string;
    category: string;
    starts_at: string;
    location_label: string;
    image_url: string | null;
  },
  attendeeCount: number,
  isGoing: boolean
): Event {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    starts_at: row.starts_at,
    location_label: row.location_label,
    image_url: row.image_url,
    attendee_count: attendeeCount,
    is_going: isGoing,
  };
}

async function uploadReportPhoto(ownerId: string, photoUri: string) {
  const supabase = getSupabase();
  if (!supabase) return photoUri;

  const response = await fetch(photoUri);
  const blob = await response.blob();
  const ext = photoUri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const path = `${ownerId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(REPORT_PHOTOS_BUCKET).upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(REPORT_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function uploadEventPhoto(photoUri: string) {
  const supabase = getSupabase();
  if (!supabase) return photoUri;

  const response = await fetch(photoUri);
  const blob = await response.blob();
  const ext = photoUri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const path = `events/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(REPORT_PHOTOS_BUCKET).upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(REPORT_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function resolveEventImageUrl(
  input: CreateEventInput & { remove_image?: boolean },
  existingImageUrl: string | null = null
) {
  if (input.image_uri) {
    return isSupabaseConfigured
      ? await uploadEventPhoto(input.image_uri)
      : input.image_uri;
  }
  if (input.remove_image) return null;
  return existingImageUrl ?? input.image_url ?? null;
}

function buildEventPayload(input: CreateEventInput, imageUrl: string | null) {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category.trim() || 'Cleanup',
    starts_at: input.starts_at,
    location_label: input.location_label.trim(),
    image_url: imageUrl,
  };
}

function mapVolunteerProfileRow(row: Record<string, unknown>): NewsletterSubscription {
  return {
    id: row.id as string,
    email: row.email as string,
    full_name: row.full_name as string,
    guest_id: row.guest_id as string,
    event_updates: row.event_updates as boolean,
    town_newsletter: row.town_newsletter as boolean,
    events_attended: row.events_attended as number,
    reports_flagged: row.reports_flagged as number,
    volunteer_level_id: row.volunteer_level_id as string,
    level_name: row.level_name as string,
    level_rank: row.level_rank as number,
    level_min_events: row.level_min_events as number,
    level_max_events: (row.level_max_events as number | null) ?? null,
    level_color: row.level_color as string,
    level_bg_color: row.level_bg_color as string,
    level_description: row.level_description as string,
    next_level_name: (row.next_level_name as string | null) ?? null,
    next_level_min_events: (row.next_level_min_events as number | null) ?? null,
    subscribed_at: row.subscribed_at as string,
    updated_at: row.updated_at as string,
  };
}

async function fetchVolunteerProfileRow(guestId: string) {
  const supabase = getSupabase()!;
  const { data, error } = await supabase
    .from('volunteer_profiles')
    .select('*')
    .eq('guest_id', guestId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapVolunteerProfileRow(data as Record<string, unknown>) : null;
}

async function syncVolunteerStatsInSupabase(
  guestId: string,
  eventsAttended: number,
  reportsFlagged: number
) {
  const supabase = getSupabase()!;
  const { data: existing } = await supabase
    .from('newsletter_subscribers')
    .select('id')
    .eq('guest_id', guestId)
    .maybeSingle();

  if (!existing) return null;

  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .update({
      events_attended: eventsAttended,
      reports_flagged: reportsFlagged,
    })
    .eq('guest_id', guestId)
    .select('*')
    .single();

  if (error) throw error;
  return fetchVolunteerProfileRow(guestId);
}

export const api = {
  getGuestId,

  async getAdminSession() {
    if (!isSupabaseConfigured) return localApi.getAdminSession();

    const supabase = getSupabase()!;
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return { user: null, session: null };

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!profile || profile.role !== 'admin') {
      await supabase.auth.signOut();
      return { user: null, session: null };
    }

    return { user: profile as Profile, session: { userId } };
  },

  async adminSignIn(email: string, password: string) {
    if (!isSupabaseConfigured) return localApi.adminSignIn(email, password);

    const supabase = getSupabase()!;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) throw new Error('Profile not found.');
    if (profile.role !== 'admin') {
      await supabase.auth.signOut();
      throw new Error('Admin access only.');
    }

    return profile as Profile;
  },

  async adminSignOut() {
    if (!isSupabaseConfigured) return localApi.adminSignOut();
    await getSupabase()!.auth.signOut();
  },

  async getVolunteerProfile() {
    if (!isSupabaseConfigured) return localApi.getVolunteerProfile();
    return getGuestId().then(() => localApi.getVolunteerProfile());
  },

  async updateVolunteerProfile(input: UpdateProfileInput & { full_name?: string }) {
    if (!isSupabaseConfigured) return localApi.updateVolunteerProfile(input);
    return localApi.updateVolunteerProfile(input);
  },

  async getDashboardStats(): Promise<DashboardStats> {
    if (!isSupabaseConfigured) return localApi.getDashboardStats();

    const supabase = getSupabase()!;
    const [{ count: openCount }, { count: resolvedCount }, { count: reportCount }] =
      await Promise.all([
        supabase.from('reports').select('*', { count: 'exact', head: true }).neq('status', 'resolved'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
        supabase.from('reports').select('*', { count: 'exact', head: true }),
      ]);

    return {
      issues: openCount ?? 0,
      resolved: resolvedCount ?? 0,
      neighbors: Math.max(reportCount ?? 0, 2),
    };
  },

  async getVolunteerImpactSummary(guestId: string): Promise<VolunteerImpactSummary> {
    const [town, reports, subscription, profile] = await Promise.all([
      api.getDashboardStats(),
      api.listReports(guestId),
      api.getNewsletterSubscription(guestId),
      localApi.getVolunteerProfile(),
    ]);

    const eventsAttended = subscription?.events_attended ?? profile.events_joined ?? 0;
    const reportsFlagged = subscription?.reports_flagged ?? profile.reports_submitted ?? 0;
    const reportsResolved = reports.filter((report) => report.status === 'resolved').length;

    const townReportTotal = town.issues + town.resolved;

    return buildVolunteerImpactSummary({
      eventsAttended,
      reportsFlagged,
      reportsResolved,
      town,
      townReportTotal: Math.max(townReportTotal, reportsFlagged),
    });
  },

  async listReports(guestId: string) {
    if (!isSupabaseConfigured) return localApi.listReports(guestId);

    const supabase = getSupabase()!;
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('guest_id', guestId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Report[];
  },

  async createReport(guestId: string, input: CreateReportInput) {
    const guest = await localApi.getVolunteerProfile();
    let photoUrl = input.photo_uri ?? null;

    if (isSupabaseConfigured && input.photo_uri) {
      photoUrl = await uploadReportPhoto(guestId, input.photo_uri);
    }

    if (!isSupabaseConfigured) {
      return localApi.createReport(guestId, { ...input, photo_uri: photoUrl ?? undefined });
    }

    const supabase = getSupabase()!;
    const { data, error } = await supabase
      .from('reports')
      .insert({
        guest_id: guestId,
        reporter_name: guest.full_name,
        title: input.title,
        description: input.description,
        category: input.category,
        location_label: input.location_label,
        latitude: input.latitude,
        longitude: input.longitude,
        photo_url: photoUrl,
      })
      .select('*')
      .single();

    if (error) throw error;
    const profile = await incrementGuestStat('reports_submitted');
    await syncVolunteerStatsInSupabase(
      guestId,
      profile.events_joined,
      profile.reports_submitted
    );
    return { ...(data as Report), user_id: guestId, author_name: guest.full_name };
  },

  async listEvents(guestId: string | null, onlyRsvps = false) {
    if (!isSupabaseConfigured) return localApi.listEvents(guestId, onlyRsvps);

    const supabase = getSupabase()!;
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('starts_at', { ascending: true });

    if (error) throw error;

    const { data: rsvps } = await supabase.from('event_rsvps').select('event_id, guest_id');
    const rsvpRows = rsvps ?? [];

    return (events ?? [])
      .map((event) => {
        const attendeeCount = rsvpRows.filter((r) => r.event_id === event.id).length;
        const isGoing = guestId
          ? rsvpRows.some((r) => r.event_id === event.id && r.guest_id === guestId)
          : false;
        return formatEventRow(event, Math.max(attendeeCount, isGoing ? 1 : 0), isGoing);
      })
      .filter((event) => !onlyRsvps || event.is_going);
  },

  async getEvent(eventId: string, guestId: string | null) {
    if (!isSupabaseConfigured) return localApi.getEvent(eventId, guestId);

    const supabase = getSupabase()!;
    const { data, error } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select('guest_id')
      .eq('event_id', eventId);

    const rsvpRows = rsvps ?? [];
    const isGoing = guestId
      ? rsvpRows.some((rsvp) => rsvp.guest_id === guestId)
      : false;

    return formatEventRow(data, Math.max(rsvpRows.length, isGoing ? 1 : 0), isGoing);
  },

  async toggleRsvp(guestId: string, eventId: string) {
    if (!isSupabaseConfigured) return localApi.toggleRsvp(guestId, eventId);

    const supabase = getSupabase()!;
    const { data: existing } = await supabase
      .from('event_rsvps')
      .select('id')
      .eq('event_id', eventId)
      .eq('guest_id', guestId)
      .maybeSingle();

    if (existing) {
      await supabase.from('event_rsvps').delete().eq('id', existing.id);
    } else {
      await supabase.from('event_rsvps').insert({ event_id: eventId, guest_id: guestId });
    }

    const profile = existing
      ? await decrementGuestStat('events_joined')
      : await incrementGuestStat('events_joined');
    await syncVolunteerStatsInSupabase(
      guestId,
      profile.events_joined,
      profile.reports_submitted
    );

    const events = await api.listEvents(guestId);
    return events.find((event) => event.id === eventId) ?? null;
  },

  async registerPushToken(
    guestId: string,
    expoPushToken: string,
    platform: 'ios' | 'android' | 'web',
    eventUpdates: boolean
  ) {
    if (!isSupabaseConfigured) {
      return localApi.registerPushToken(guestId, expoPushToken, platform, eventUpdates);
    }

    const supabase = getSupabase()!;
    const { error } = await supabase.from('push_tokens').upsert(
      {
        guest_id: guestId,
        expo_push_token: expoPushToken,
        platform,
        event_updates: eventUpdates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'expo_push_token' }
    );

    if (error) throw error;
  },

  async removePushToken(guestId: string, expoPushToken: string) {
    if (!isSupabaseConfigured) return localApi.removePushToken(guestId, expoPushToken);

    const supabase = getSupabase()!;
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('guest_id', guestId)
      .eq('expo_push_token', expoPushToken);

    if (error) throw error;
  },

  async createEvent(input: CreateEventInput) {
    const imageUrl = await resolveEventImageUrl(input);
    const payload = buildEventPayload(input, imageUrl);

    if (!isSupabaseConfigured) return localApi.createEvent(payload);

    const supabase = getSupabase()!;
    const { data, error } = await supabase
      .from('events')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;

    const event = formatEventRow(data, 0, false);

    try {
      await supabase.functions.invoke('notify-new-event', {
        body: { event_id: data.id },
      });
    } catch {
      // Push delivery is best-effort; the event is still created.
    }

    return event;
  },

  async updateEvent(eventId: string, input: UpdateEventInput) {
    if (!isSupabaseConfigured) return localApi.updateEvent(eventId, input);

    const supabase = getSupabase()!;
    const { data: existing, error: fetchError } = await supabase
      .from('events')
      .select('image_url')
      .eq('id', eventId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) throw new Error('Event not found.');

    const imageUrl = await resolveEventImageUrl(input, existing.image_url);
    const payload = buildEventPayload(input, imageUrl);

    const { data, error } = await supabase
      .from('events')
      .update(payload)
      .eq('id', eventId)
      .select('*')
      .single();

    if (error) throw error;

    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select('guest_id')
      .eq('event_id', eventId);

    const rsvpRows = rsvps ?? [];
    return formatEventRow(data, Math.max(rsvpRows.length, 1), false);
  },

  async deleteEvent(eventId: string) {
    if (!isSupabaseConfigured) return localApi.deleteEvent(eventId);

    const supabase = getSupabase()!;
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) throw error;
  },

  async listPosts(guestId: string | null, category?: string) {
    if (!isSupabaseConfigured) return localApi.listPosts(guestId, category);

    const supabase = getSupabase()!;
    let query = supabase.from('community_posts').select('*').order('created_at', { ascending: false });

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;

    const postIds = (data ?? []).map((p) => p.id);
    const { data: likes } = await supabase
      .from('post_likes')
      .select('post_id, guest_id')
      .in('post_id', postIds.length ? postIds : ['00000000-0000-0000-0000-000000000000']);

    return (data ?? []).map((row) => {
      const authorName = row.author_name ?? 'Neighbor';
      const postLikes = (likes ?? []).filter((l) => l.post_id === row.id);
      return {
        id: row.id,
        user_id: row.guest_id ?? row.id,
        category: row.category,
        title: row.title,
        description: row.description,
        featured: row.featured,
        created_at: row.created_at,
        author_name: authorName,
        author_initial: authorName.charAt(0).toUpperCase(),
        likes: postLikes.length,
        liked_by_me: guestId ? postLikes.some((l) => l.guest_id === guestId) : false,
      } satisfies CommunityPost;
    });
  },

  async createPost(guestId: string, input: CreatePostInput) {
    if (!isSupabaseConfigured) return localApi.createPost(guestId, input);

    const guest = await localApi.getVolunteerProfile();
    const supabase = getSupabase()!;
    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        guest_id: guestId,
        author_name: guest.full_name,
        ...input,
      })
      .select('*')
      .single();

    if (error) throw error;

    return {
      id: data.id,
      user_id: guestId,
      category: data.category,
      title: data.title,
      description: data.description,
      featured: data.featured,
      created_at: data.created_at,
      author_name: guest.full_name,
      author_initial: guest.full_name.charAt(0).toUpperCase(),
      likes: 0,
      liked_by_me: false,
    } satisfies CommunityPost;
  },

  async toggleLike(guestId: string, postId: string) {
    if (!isSupabaseConfigured) return localApi.toggleLike(guestId, postId);

    const supabase = getSupabase()!;
    const { data: existing } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('guest_id', guestId)
      .maybeSingle();

    if (existing) {
      await supabase.from('post_likes').delete().eq('id', existing.id);
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, guest_id: guestId });
    }

    const posts = await api.listPosts(guestId);
    return posts.find((post) => post.id === postId) ?? null;
  },

  async listBadges(): Promise<Badge[]> {
    if (!isSupabaseConfigured) return localApi.listBadges();
    return localApi.listBadges();
  },

  async listAllReportsForAdmin() {
    if (!isSupabaseConfigured) return localApi.listAllReportsForAdmin();

    const supabase = getSupabase()!;
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Report[];
  },

  async updateReportStatus(reportId: string, status: Report['status']) {
    if (!isSupabaseConfigured) return localApi.updateReportStatus(reportId, status);

    const supabase = getSupabase()!;
    const { data, error } = await supabase
      .from('reports')
      .update({ status })
      .eq('id', reportId)
      .select('*')
      .single();

    if (error) throw error;
    return data as Report;
  },

  async deleteReport(reportId: string) {
    if (!isSupabaseConfigured) return localApi.deleteReport(reportId);

    const supabase = getSupabase()!;
    const { error } = await supabase.from('reports').delete().eq('id', reportId);
    if (error) throw error;
  },

  async markReportForwarded(reportId: string, departmentEmail: string) {
    if (!isSupabaseConfigured) return localApi.markReportForwarded(reportId, departmentEmail);

    const supabase = getSupabase()!;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('reports')
      .update({
        forwarded_at: now,
        forwarded_to: departmentEmail,
        status: 'in_progress',
      })
      .eq('id', reportId)
      .select('*')
      .single();

    if (error) throw error;
    return data as Report;
  },

  async listDepartmentContacts() {
    if (!isSupabaseConfigured) return localApi.listDepartmentContacts();

    const supabase = getSupabase()!;
    const { data, error } = await supabase
      .from('department_contacts')
      .select('*')
      .order('department_id', { ascending: true });

    if (error) throw error;
    return (data ?? []) as DepartmentContact[];
  },

  async saveDepartmentContact(departmentId: string, email: string) {
    if (!isSupabaseConfigured) return localApi.saveDepartmentContact(departmentId, email);

    const supabase = getSupabase()!;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('department_contacts')
      .upsert(
        {
          department_id: departmentId,
          email: email.trim().toLowerCase(),
          updated_at: now,
        },
        { onConflict: 'department_id' }
      )
      .select('*')
      .single();

    if (error) throw error;
    return data as DepartmentContact;
  },

  async createEmergencyAlert(guestId: string, input: CreateEmergencyAlertInput) {
    if (!isSupabaseConfigured) return localApi.createEmergencyAlert(guestId, input);

    const guest = await localApi.getVolunteerProfile();
    const supabase = getSupabase()!;
    const now = new Date().toISOString();

    await supabase
      .from('emergency_alerts')
      .update({ status: 'resolved', updated_at: now })
      .eq('guest_id', guestId)
      .neq('status', 'resolved');

    const { data, error } = await supabase
      .from('emergency_alerts')
      .insert({
        guest_id: guestId,
        citizen_name: guest.full_name || 'Citizen',
        location_label: input.location_label,
        latitude: input.latitude,
        longitude: input.longitude,
        message: input.message?.trim() || null,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as EmergencyAlert;
  },

  async listActiveEmergencyAlerts() {
    if (!isSupabaseConfigured) return localApi.listActiveEmergencyAlerts();

    const supabase = getSupabase()!;
    const { data, error } = await supabase
      .from('emergency_alerts')
      .select('*')
      .in('status', ['active', 'responding'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as EmergencyAlert[];
  },

  async listAllEmergencyAlerts() {
    if (!isSupabaseConfigured) return localApi.listAllEmergencyAlerts();

    const supabase = getSupabase()!;
    const { data, error } = await supabase
      .from('emergency_alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as EmergencyAlert[];
  },

  async respondToEmergencyAlert(alertId: string, responderGuestId: string, responderName: string) {
    if (!isSupabaseConfigured) {
      return localApi.respondToEmergencyAlert(alertId, responderGuestId, responderName);
    }

    const supabase = getSupabase()!;
    const { data, error } = await supabase
      .from('emergency_alerts')
      .update({
        status: 'responding',
        responded_by_guest_id: responderGuestId,
        responded_by_name: responderName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .neq('status', 'resolved')
      .select('*')
      .single();

    if (error) throw error;
    return data as EmergencyAlert;
  },

  async resolveEmergencyAlert(alertId: string) {
    if (!isSupabaseConfigured) return localApi.resolveEmergencyAlert(alertId);

    const supabase = getSupabase()!;
    const { data, error } = await supabase
      .from('emergency_alerts')
      .update({ status: 'resolved', updated_at: new Date().toISOString() })
      .eq('id', alertId)
      .select('*')
      .single();

    if (error) throw error;
    return data as EmergencyAlert;
  },

  async getNewsletterSubscription(guestId: string) {
    if (!isSupabaseConfigured) return localApi.getNewsletterSubscription(guestId);

    const cached = await getCachedNewsletter();
    if (cached?.guest_id === guestId) return applyLocalLevelFields(cached);

    const row = await fetchVolunteerProfileRow(guestId);
    if (row) {
      await setCachedNewsletter(row);
      return row;
    }
    return null;
  },

  async getVolunteerLevelProfile(guestId: string): Promise<VolunteerProfileRecord | null> {
    const subscription = await api.getNewsletterSubscription(guestId);
    if (!subscription) return null;
    return enrichVolunteerProfile(subscription);
  },

  async listVolunteerLevels() {
    if (!isSupabaseConfigured) {
      const { VOLUNTEER_LEVELS } = await import('@/lib/volunteerLevels');
      return VOLUNTEER_LEVELS.map((level) => ({
        id: level.id,
        name: level.name,
        rank_order: level.rankOrder,
        min_events_attended: level.minEvents,
        max_events_attended: level.maxEvents,
        color: level.color,
        bg_color: level.bgColor,
        description: level.description,
      }));
    }

    const supabase = getSupabase()!;
    const { data, error } = await supabase
      .from('volunteer_levels')
      .select('*')
      .order('rank_order', { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  async newsletterSignUp(guestId: string, input: NewsletterSignupInput) {
    if (!isSupabaseConfigured) return localApi.newsletterSignUp(guestId, input);

    const guestProfile = await localApi.getVolunteerProfile();
    const supabase = getSupabase()!;
    const email = input.email.trim().toLowerCase();
    const payload = {
      email,
      full_name: input.full_name.trim(),
      guest_id: guestId,
      event_updates: input.event_updates,
      town_newsletter: input.town_newsletter,
      events_attended: guestProfile.events_joined,
      reports_flagged: guestProfile.reports_submitted,
    };

    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .upsert(payload, { onConflict: 'email' })
      .select('*')
      .single();

    if (error) throw error;
    const row = await fetchVolunteerProfileRow(guestId);
    const subscription = row ?? applyLocalLevelFields(data as NewsletterSubscription);
    await setCachedNewsletter(subscription);
    await localApi.updateVolunteerProfile({
      full_name: subscription.full_name,
      registered: true,
      tagline: 'Supporter of Hazaribagh — rising through the ranks.',
    });
    return subscription;
  },

  async newsletterSignIn(guestId: string, email: string) {
    if (!isSupabaseConfigured) return localApi.newsletterSignIn(guestId, email);

    const guestProfile = await localApi.getVolunteerProfile();
    const supabase = getSupabase()!;
    const normalized = email.trim().toLowerCase();
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .eq('email', normalized)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('No subscription found for this email. Sign up first.');

    const mergedEvents = Math.max(data.events_attended ?? 0, guestProfile.events_joined);
    const mergedReports = Math.max(data.reports_flagged ?? 0, guestProfile.reports_submitted);

    const { data: linked, error: linkError } = await supabase
      .from('newsletter_subscribers')
      .update({
        guest_id: guestId,
        events_attended: mergedEvents,
        reports_flagged: mergedReports,
      })
      .eq('email', normalized)
      .select('*')
      .single();

    if (linkError) throw linkError;
    const row = await fetchVolunteerProfileRow(guestId);
    const subscription = row ?? applyLocalLevelFields(linked as NewsletterSubscription);
    await setCachedNewsletter(subscription);
    await localApi.updateVolunteerProfile({
      full_name: subscription.full_name,
      registered: true,
      events_joined: mergedEvents,
      reports_submitted: mergedReports,
    });
    return subscription;
  },

  async updateNewsletterSubscription(guestId: string, input: NewsletterUpdateInput) {
    if (!isSupabaseConfigured) return localApi.updateNewsletterSubscription(guestId, input);

    const supabase = getSupabase()!;
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .update(input)
      .eq('guest_id', guestId)
      .select('*')
      .single();

    if (error) throw error;
    const row = await fetchVolunteerProfileRow(guestId);
    const subscription = row ?? applyLocalLevelFields(data as NewsletterSubscription);
    await setCachedNewsletter(subscription);
    return subscription;
  },

  async newsletterUnsubscribe(guestId: string) {
    if (!isSupabaseConfigured) return localApi.newsletterUnsubscribe(guestId);

    const supabase = getSupabase()!;
    const { error } = await supabase.from('newsletter_subscribers').delete().eq('guest_id', guestId);
    if (error) throw error;
    await setCachedNewsletter(null);
  },
};

export function formatEventDateParts(startsAt: string) {
  const date = new Date(startsAt);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;

  return {
    date: date.getDate().toString(),
    month: months[date.getMonth()],
    time: `${hour12}:${minutes} ${ampm}`,
  };
}

export function formatPostTimestamp(iso: string) {
  const date = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${months[date.getMonth()]} ${date.getDate()} · ${hour12}:${minutes} ${ampm}`;
}
