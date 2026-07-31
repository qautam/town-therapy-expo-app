import { decode as decodeBase64 } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

import { isSupabaseConfigured } from '@/lib/config';
import {
  buildSosMessage,
  hydrateEmergencyAlertRow,
  type HydratedEmergencyAlert,
} from '@/lib/emergencyContactCodec';
import { redactEmergencyPhoneList, redactEmergencyPhones } from '@/lib/emergencyPrivacy';
import { getErrorMessage, isMissingColumnError, toError } from '@/lib/errors';
import { getGuestId, getGuestProfile, updateGuestProfile } from '@/lib/guest';
import { getCachedNewsletter, setCachedNewsletter } from '@/lib/newsletter';
import { localApi } from '@/lib/localStore';
import { normalizePhone } from '@/lib/phone';
import { cacheGetStale, cacheInvalidate, cacheReplace, cacheSet } from '@/lib/queryCache';
import { getSupabase, REPORT_PHOTOS_BUCKET } from '@/lib/supabase';
import { hoursFromDrives } from '@/lib/volunteerHours';
import { isLegacyVolunteerName, normalizeVolunteerName } from '@/lib/volunteerName';
import { buildTownClock, type TownClock } from '@/lib/townTime';
import { weekAgoIso } from '@/lib/townNews';
import { enrichVolunteerProfile, applyLocalLevelFields } from '@/lib/volunteerProfileMapper';
import type {
  Badge,
  CommunityPost,
  CreatePostInput,
  CreateReportInput,
  CreateEventInput,
  CreateEmergencyAlertInput,
  DashboardStats,
  TownNewsSnapshot,
  HomeCloudSnapshot,
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
  TakeVolunteerBreakInput,
  VolunteerDirectoryEntry,
  VolunteerDriveCheckIn,
  VolunteerProfileRecord,
} from '@/types/database';
import {
  BADGE_DEFINITIONS,
  EMPTY_BADGE_STATS,
  progressForRequirement,
  type BadgeDefinition,
  type VolunteerBadgeStats,
} from '@/lib/badges';
import {
  createStickyNote as createLocalStickyNote,
  deleteStickyNote as deleteLocalStickyNote,
  isStickyNoteActive,
  isStickyNoteColor,
  listStickyNotes as listLocalStickyNotes,
  setStickyNotePinned as setLocalStickyNotePinned,
  sortStickyNotes,
  STICKY_NOTE_COLORS,
  type StickyNote,
  type StickyNoteColor,
} from '@/lib/stickyNotes';

const REPORTS_CACHE_TTL_MS = 60_000;

function normalizeReportRow(row: Report & { guest_id?: string }, guestId?: string): Report {
  return {
    ...row,
    user_id: row.user_id || row.guest_id || guestId || '',
  };
}

function afterReportCreated(guestId: string, report: Report) {
  const key = `reports:${guestId}`;
  const existing = cacheGetStale<Report[]>(key)?.value ?? [];
  const merged = [report, ...existing.filter((item) => item.id !== report.id)];
  cacheReplace(key, merged, REPORTS_CACHE_TTL_MS);
}

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
    attendee_count: Math.max(0, attendeeCount),
    is_going: isGoing,
  };
}

/** Parse RSVP total + whether this guest is going from a Supabase events embed. */
function parseEventRsvps(
  eventRsvps: Array<{ guest_id?: string }> | null | undefined,
  guestId: string | null
) {
  const rows = eventRsvps ?? [];
  const attendeeCount = rows.length;
  const isGoing = guestId ? rows.some((r) => r.guest_id === guestId) : false;
  return { attendeeCount, isGoing };
}

function guessImageContentType(uri: string) {
  const ext = uri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
  if (ext === 'png') return { ext, contentType: 'image/png' as const };
  if (ext === 'webp') return { ext, contentType: 'image/webp' as const };
  if (ext === 'heic' || ext === 'heif') return { ext: 'jpg', contentType: 'image/jpeg' as const };
  return { ext: ext === 'jpeg' ? 'jpg' : ext || 'jpg', contentType: 'image/jpeg' as const };
}

/** Read a local ImagePicker URI into an ArrayBuffer (RN-safe — no fetch().blob()). */
async function readLocalImageBytes(photoUri: string) {
  const base64 = await FileSystem.readAsStringAsync(photoUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return decodeBase64(base64);
}

async function uploadReportPhoto(ownerId: string, photoUri: string) {
  const supabase = getSupabase();
  if (!supabase) return photoUri;

  const { ext, contentType } = guessImageContentType(photoUri);
  const path = `${ownerId}/${Date.now()}.${ext}`;
  const bytes = await readLocalImageBytes(photoUri);

  const { error } = await supabase.storage.from(REPORT_PHOTOS_BUCKET).upload(path, bytes, {
    contentType,
    upsert: false,
  });

  if (error) {
    throw new Error(
      error.message.includes('Bucket not found')
        ? 'Photo storage is not set up. Run supabase/storage.sql in the SQL Editor.'
        : `Photo upload failed: ${error.message}`
    );
  }

  const { data } = supabase.storage.from(REPORT_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function uploadEventPhoto(photoUri: string) {
  const supabase = getSupabase();
  if (!supabase) return photoUri;

  const { ext, contentType } = guessImageContentType(photoUri);
  const path = `events/${Date.now()}.${ext}`;
  const bytes = await readLocalImageBytes(photoUri);

  const { error } = await supabase.storage.from(REPORT_PHOTOS_BUCKET).upload(path, bytes, {
    contentType,
    upsert: false,
  });

  if (error) {
    throw new Error(
      error.message.includes('Bucket not found')
        ? 'Photo storage is not set up. Run supabase/storage.sql in the SQL Editor.'
        : `Photo upload failed: ${error.message}`
    );
  }

  const { data } = supabase.storage.from(REPORT_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function resolveEventImageUrl(
  input: CreateEventInput & { remove_image?: boolean },
  existingImageUrl: string | null = null
) {
  if (input.image_uri) {
    if (!isSupabaseConfigured) return input.image_uri;
    try {
      return await uploadEventPhoto(input.image_uri);
    } catch (error) {
      // Don't block publishing — event goes live without cover if upload fails
      console.warn('Event photo upload failed:', error);
      return existingImageUrl ?? input.image_url ?? null;
    }
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
  const eventsAttended = Math.max(0, Number(row.events_attended ?? 0) || 0);
  const reportsFlagged = Math.max(0, Number(row.reports_flagged ?? 0) || 0);
  return {
    id: row.id as string,
    email: row.email as string,
    full_name: normalizeVolunteerName(String(row.full_name ?? '')),
    guest_id: row.guest_id as string,
    event_updates: row.event_updates as boolean,
    town_newsletter: row.town_newsletter as boolean,
    events_attended: eventsAttended,
    reports_flagged: reportsFlagged,
    // Always derive hours from completed drives so stored hours can't drift
    hours_volunteered: hoursFromDrives(eventsAttended),
    community_hero_features: Math.max(0, Number(row.community_hero_features ?? 0) || 0),
    bio: String(row.bio ?? ''),
    cause: String(row.cause ?? ''),
    skills: String(row.skills ?? ''),
    availability: String(row.availability ?? ''),
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
  if (!data) return null;

  if (isLegacyVolunteerName(String(data.full_name ?? ''))) {
    await supabase
      .from('newsletter_subscribers')
      .update({ full_name: '' })
      .eq('guest_id', guestId);
    await updateGuestProfile({ full_name: '' });
    data.full_name = '';
  }

  return mapVolunteerProfileRow(data as Record<string, unknown>);
}

function evaluateBadgeDefinitions(definitions: BadgeDefinition[], stats: VolunteerBadgeStats): Badge[] {
  return definitions.map((def) => {
    const progress = progressForRequirement(stats, def.requirementType);
    return {
      id: def.id,
      label: def.label,
      icon: def.icon,
      color: def.color,
      bg_color: def.bgColor,
      locked: progress < def.requirementCount,
      tier: def.tier,
      shape: def.shape,
      description: def.description,
      requirement_type: def.requirementType,
      requirement_count: def.requirementCount,
      progress,
    } satisfies Badge;
  });
}

async function loadCloudBadgeDefinitions(): Promise<BadgeDefinition[]> {
  const supabase = getSupabase();
  if (!supabase) return BADGE_DEFINITIONS;

  const { data, error } = await supabase
    .from('badges')
    .select('id, label, icon, color, bg_color, requirement_type, requirement_count, description, tier');

  if (error || !data?.length) return BADGE_DEFINITIONS;

  const order = new Map(BADGE_DEFINITIONS.map((d, index) => [d.id, index]));
  const byId = new Map(BADGE_DEFINITIONS.map((d) => [d.id, d]));
  return data
    .map((row) => {
      const fallback = byId.get(row.id);
      return {
        id: row.id,
        label: row.label,
        icon: row.icon,
        color: row.color,
        bgColor: row.bg_color,
        tier: (row.tier as BadgeDefinition['tier']) || fallback?.tier || 'gold',
        shape: fallback?.shape ?? 'crest',
        requirementType:
          (row.requirement_type as BadgeDefinition['requirementType']) ||
          fallback?.requirementType ||
          'events',
        requirementCount: row.requirement_count ?? fallback?.requirementCount ?? 1,
        description: row.description || fallback?.description || '',
      } satisfies BadgeDefinition;
    })
    .sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
}

async function collectCloudBadgeStats(guestId: string): Promise<VolunteerBadgeStats> {
  const supabase = getSupabase()!;
  const { events, reports } = await recountVolunteerActivity(guestId);

  let treeEvents = 0;
  let heroFromPosts = 0;
  let wallPhotos = 0;

  try {
    const [treeResult, featuredResult, photoResult] = await Promise.all([
      supabase
        .from('event_rsvps')
        .select('event_id, events!inner(category)')
        .eq('guest_id', guestId)
        .not('completed_at', 'is', null),
      supabase.from('community_posts').select('id').eq('guest_id', guestId).eq('featured', true),
      supabase.from('community_posts').select('id').eq('guest_id', guestId).not('image_url', 'is', null),
    ]);

    treeEvents = (treeResult.data ?? []).filter((row) => {
      const eventsJoin = row.events as { category?: string } | { category?: string }[] | null;
      const category = Array.isArray(eventsJoin)
        ? eventsJoin[0]?.category ?? ''
        : eventsJoin?.category ?? '';
      return /tree/i.test(category);
    }).length;
    heroFromPosts = featuredResult.data?.length ?? 0;
    wallPhotos = photoResult.data?.length ?? 0;
  } catch (error) {
    console.warn('Badge stat queries partially failed:', error);
  }

  const subscription = await fetchVolunteerProfileRow(guestId).catch(() => null);

  return {
    reports,
    events,
    treeEvents,
    heroFeatures: Math.max(heroFromPosts, subscription?.community_hero_features ?? 0),
    wallPhotos,
  };
}

async function hydrateGuestStatsFromSubscription(subscription: NewsletterSubscription) {
  const profile = await getGuestProfile();
  const events = Math.max(0, Number(subscription.events_attended ?? 0) || 0);
  const reports = Math.max(0, Number(subscription.reports_flagged ?? 0) || 0);
  const hours = hoursFromDrives(events);
  await updateGuestProfile({
    events_joined: events,
    reports_submitted: reports,
    hours_volunteered: hours,
    full_name: normalizeVolunteerName(subscription.full_name),
    bio: profile.bio?.trim() ? profile.bio : (subscription.bio ?? profile.bio),
    interests: profile.interests?.trim() ? profile.interests : (subscription.cause ?? profile.interests),
    skills: profile.skills?.trim() ? profile.skills : (subscription.skills ?? profile.skills),
    availability: profile.availability?.trim()
      ? profile.availability
      : (subscription.availability ?? profile.availability),
  });
}

/** Real activity counts: drives marked complete + reports. */
async function recountVolunteerActivity(guestId: string) {
  const supabase = getSupabase()!;
  const [rsvpResult, reportResult] = await Promise.all([
    supabase
      .from('event_rsvps')
      .select('id', { count: 'exact', head: true })
      .eq('guest_id', guestId)
      .not('completed_at', 'is', null),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('guest_id', guestId),
  ]);
  return {
    events: rsvpResult.count ?? 0,
    reports: reportResult.count ?? 0,
  };
}

/**
 * Rewrite newsletter + local guest stats from real RSVP/report rows.
 * Fixes inflated counters (e.g. Math.max with stale local device data).
 */
async function syncVolunteerStatsFromActivity(guestId: string) {
  const { events, reports } = await recountVolunteerActivity(guestId);
  const hoursVolunteered = hoursFromDrives(events);

  await updateGuestProfile({
    events_joined: events,
    reports_submitted: reports,
    hours_volunteered: hoursVolunteered,
  });

  const supabase = getSupabase()!;
  const { data: existing } = await supabase
    .from('newsletter_subscribers')
    .select('id')
    .eq('guest_id', guestId)
    .maybeSingle();

  if (!existing) return null;

  const { error } = await supabase
    .from('newsletter_subscribers')
    .update({
      events_attended: events,
      reports_flagged: reports,
      hours_volunteered: hoursVolunteered,
    })
    .eq('guest_id', guestId);

  if (error) throw error;

  const row = await fetchVolunteerProfileRow(guestId);
  if (row) await setCachedNewsletter(row);
  return row;
}

/** Move RSVPs/reports when a volunteer signs in on a new device. */
async function reassignVolunteerActivity(fromGuestId: string, toGuestId: string) {
  if (!fromGuestId || !toGuestId || fromGuestId === toGuestId) return;

  const supabase = getSupabase()!;
  const { error } = await supabase.rpc('reassign_volunteer_guest', {
    old_guest: fromGuestId,
    new_guest: toGuestId,
  });

  if (!error) return;

  // Fallback if RPC not installed yet: move RSVPs only (reports need admin/RPC)
  const { data: existingOnNew } = await supabase
    .from('event_rsvps')
    .select('event_id')
    .eq('guest_id', toGuestId);
  const taken = new Set((existingOnNew ?? []).map((row) => row.event_id));

  const { data: oldRsvps } = await supabase
    .from('event_rsvps')
    .select('id, event_id')
    .eq('guest_id', fromGuestId);

  for (const rsvp of oldRsvps ?? []) {
    if (taken.has(rsvp.event_id)) {
      await supabase.from('event_rsvps').delete().eq('id', rsvp.id);
    } else {
      await supabase.from('event_rsvps').update({ guest_id: toGuestId }).eq('id', rsvp.id);
    }
  }
}

function mapStickyNoteRow(row: Record<string, unknown>): StickyNote {
  const colorRaw = String(row.color ?? STICKY_NOTE_COLORS[0]);
  return {
    id: String(row.id),
    guest_id: String(row.guest_id ?? ''),
    author_name: String(row.author_name ?? 'Citizen').trim() || 'Citizen',
    body: String(row.body ?? ''),
    color: isStickyNoteColor(colorRaw) ? colorRaw : STICKY_NOTE_COLORS[0],
    pinned: Boolean(row.pinned),
    pinned_at: (row.pinned_at as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

async function purgeExpiredStickyNotesCloud() {
  const supabase = getSupabase()!;
  try {
    await supabase.rpc('purge_expired_sticky_notes');
  } catch {
    // Migration may not be applied yet — client filter still hides expired notes.
  }
}

async function listCloudStickyNotes(): Promise<StickyNote[]> {
  if (!isSupabaseConfigured) return listLocalStickyNotes();

  try {
    // Purge in background — don't block the chalkboard paint
    void purgeExpiredStickyNotesCloud();

    const supabase = getSupabase()!;
    const { data, error } = await supabase
      .from('sticky_notes')
      .select('id, guest_id, author_name, body, color, pinned, pinned_at, created_at')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(80);

    if (error) throw error;

    return sortStickyNotes(
      (data ?? []).map(mapStickyNoteRow).filter((note) => isStickyNoteActive(note))
    ).slice(0, 40);
  } catch (error) {
    console.warn('Sticky notes cloud unavailable:', error);
    return [];
  }
}

async function createCloudStickyNote(input: {
  guestId: string;
  body: string;
  authorName?: string;
  color?: StickyNoteColor;
}): Promise<StickyNote[]> {
  if (!isSupabaseConfigured) {
    return createLocalStickyNote(input);
  }

  const body = input.body.trim().slice(0, 180);
  if (!body) throw new Error('Write something on the sticky note first.');

  const supabase = getSupabase()!;
  const { error } = await supabase.from('sticky_notes').insert({
    guest_id: input.guestId,
    author_name: input.authorName?.trim() || 'Citizen',
    body,
    color: input.color && isStickyNoteColor(input.color) ? input.color : STICKY_NOTE_COLORS[0],
    pinned: false,
  });

  if (error) throw error;
  cacheInvalidate('home:');
  return listCloudStickyNotes();
}

async function deleteCloudStickyNote(guestId: string, noteId: string): Promise<StickyNote[]> {
  if (!isSupabaseConfigured) return deleteLocalStickyNote(guestId, noteId);

  const supabase = getSupabase()!;
  const { error } = await supabase
    .from('sticky_notes')
    .delete()
    .eq('id', noteId)
    .eq('guest_id', guestId)
    .eq('pinned', false);

  if (error) throw error;
  cacheInvalidate('home:');
  return listCloudStickyNotes();
}

async function deleteCloudStickyNoteAsAdmin(noteId: string): Promise<StickyNote[]> {
  if (!isSupabaseConfigured) return deleteLocalStickyNote(null, noteId, { asAdmin: true });

  const supabase = getSupabase()!;
  const { error } = await supabase.from('sticky_notes').delete().eq('id', noteId);
  if (error) throw error;
  cacheInvalidate('home:');
  return listCloudStickyNotes();
}

async function setCloudStickyNotePinned(noteId: string, pinned: boolean): Promise<StickyNote[]> {
  if (!isSupabaseConfigured) return setLocalStickyNotePinned(noteId, pinned);

  const supabase = getSupabase()!;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('sticky_notes')
    .update({
      pinned,
      pinned_at: pinned ? new Date().toISOString() : null,
      pinned_by: pinned ? user?.id ?? null : null,
    })
    .eq('id', noteId);

  if (error) throw error;
  cacheInvalidate('home:');
  return listCloudStickyNotes();
}

let emergencyPhoneColumnsSupported: boolean | null = null;

async function supportsEmergencyPhoneColumns() {
  if (emergencyPhoneColumnsSupported != null) return emergencyPhoneColumnsSupported;

  const supabase = getSupabase();
  if (!supabase) {
    emergencyPhoneColumnsSupported = false;
    return false;
  }

  const { error } = await supabase.from('emergency_alerts').select('citizen_phone').limit(1);
  if (error && isMissingColumnError(error, 'citizen_phone')) {
    emergencyPhoneColumnsSupported = false;
    return false;
  }

  // Any other select error: don't cache forever as false; assume columns exist and let writes retry.
  if (error) {
    return true;
  }

  emergencyPhoneColumnsSupported = true;
  return true;
}

function toPublicEmergencyAlert(alert: HydratedEmergencyAlert): EmergencyAlert {
  const { _rawMessage: _ignored, ...publicAlert } = alert;
  return publicAlert;
}

function finalizeEmergencyAlertsForViewer(
  alerts: HydratedEmergencyAlert[],
  viewerGuestId: string | null | undefined
) {
  return redactEmergencyPhoneList(
    alerts.map(toPublicEmergencyAlert),
    viewerGuestId
  );
}

const EMERGENCY_ALERT_SELECT_WITH_PHONES =
  'id, guest_id, citizen_name, citizen_phone, location_label, latitude, longitude, message, status, responded_by_guest_id, responded_by_name, responder_phone, created_at, updated_at';

const EMERGENCY_ALERT_SELECT_BASE =
  'id, guest_id, citizen_name, location_label, latitude, longitude, message, status, responded_by_guest_id, responded_by_name, created_at, updated_at';

async function fetchEmergencyAlertRows(options?: {
  activeOnly?: boolean;
}): Promise<HydratedEmergencyAlert[]> {
  const supabase = getSupabase()!;
  let usePhoneColumns = await supportsEmergencyPhoneColumns();

  const runQuery = async (withPhones: boolean) => {
    let query = supabase
      .from('emergency_alerts')
      .select(withPhones ? EMERGENCY_ALERT_SELECT_WITH_PHONES : EMERGENCY_ALERT_SELECT_BASE)
      .order('created_at', { ascending: false });

    if (options?.activeOnly) {
      query = query.in('status', ['active', 'responding']);
    }

    return query;
  };

  let { data, error } = await runQuery(usePhoneColumns);

  if (error && usePhoneColumns && isMissingColumnError(error, 'citizen_phone')) {
    emergencyPhoneColumnsSupported = false;
    usePhoneColumns = false;
    ({ data, error } = await runQuery(false));
  }

  if (error) throw toError(error, 'Could not load SOS alerts.');

  return ((data ?? []) as unknown[]).map((row) =>
    hydrateEmergencyAlertRow(row as Parameters<typeof hydrateEmergencyAlertRow>[0])
  );
}

async function notifyVolunteersAboutEmergencyCloud(alert: EmergencyAlert) {
  try {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data: subscribers, error: subscriberError } = await supabase
      .from('newsletter_subscribers')
      .select('guest_id');

    if (subscriberError || !subscribers?.length) return;

    const guestIds = subscribers
      .map((row) => row.guest_id)
      .filter((id): id is string => Boolean(id) && id !== alert.guest_id);

    if (!guestIds.length) return;

    const { data: tokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('expo_push_token')
      .in('guest_id', guestIds);

    if (tokenError || !tokens?.length) return;

    const { buildEmergencyNotification, sendExpoPushMessages } = await import(
      '@/lib/pushNotifications'
    );
    const content = buildEmergencyNotification(alert);
    const uniqueTokens = [...new Set(tokens.map((row) => row.expo_push_token).filter(Boolean))];

    await sendExpoPushMessages(
      uniqueTokens.map((token) => ({
        to: token,
        title: content.title,
        body: content.body,
        data: content.data,
        sound: 'default' as const,
        channelId: 'emergency',
        priority: 'high' as const,
      }))
    );
  } catch {
    // Best-effort.
  }
}

async function notifyRequesterHelpOnWay(alert: EmergencyAlert) {
  try {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('expo_push_token')
      .eq('guest_id', alert.guest_id);

    if (error || !tokens?.length) return;

    const { buildHelpOnWayNotification, sendExpoPushMessages } = await import(
      '@/lib/pushNotifications'
    );
    const content = buildHelpOnWayNotification({
      alertId: alert.id,
      responderName: alert.responded_by_name || 'A volunteer',
    });

    const uniqueTokens = [...new Set(tokens.map((row) => row.expo_push_token).filter(Boolean))];
    await sendExpoPushMessages(
      uniqueTokens.map((token) => ({
        to: token,
        title: content.title,
        body: content.body,
        data: content.data,
        sound: 'default' as const,
        channelId: 'emergency',
        priority: 'high' as const,
      }))
    );
  } catch {
    // Best-effort — never block SOS response on push delivery.
  }
}

export const api = {
  getGuestId,

  async getTownClock(): Promise<TownClock> {
    return buildTownClock();
  },

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
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        throw new Error(
          'Email not confirmed. In Supabase: Authentication → Users → open the admin → Confirm user. Or run supabase/confirm-admin.sql.'
        );
      }
      throw error;
    }

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
    const updated = await localApi.updateVolunteerProfile(input);
    if (!isSupabaseConfigured) return updated;

    const guestId = await getGuestId();
    const supabase = getSupabase()!;
    const prefs: Record<string, string | undefined> = {
      updated_at: new Date().toISOString(),
    };
    if (input.bio !== undefined) prefs.bio = input.bio ?? '';
    if (input.interests !== undefined) prefs.cause = input.interests ?? '';
    if (input.skills !== undefined) prefs.skills = input.skills ?? '';
    if (input.availability !== undefined) prefs.availability = input.availability ?? '';
    if (input.full_name !== undefined) prefs.full_name = updated.full_name ?? undefined;

    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id')
      .eq('guest_id', guestId)
      .maybeSingle();

    if (existing && Object.keys(prefs).length > 1) {
      const { error } = await supabase.from('newsletter_subscribers').update(prefs).eq('guest_id', guestId);
      if (error) console.warn('Could not sync volunteer prefs to cloud:', error.message);
    }

    return updated;
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const home = await api.getHomeCloudSnapshot(null);
    return home.stats;
  },

  async getTownNewsSnapshot(): Promise<TownNewsSnapshot> {
    const home = await api.getHomeCloudSnapshot(null);
    return home.news;
  },

  /** Fresh town-wide counts + upcoming events from Supabase (or local fallback). */
  async getHomeCloudSnapshot(guestId: string | null): Promise<HomeCloudSnapshot> {
    if (!isSupabaseConfigured) {
      const [stats, news, events] = await Promise.all([
        localApi.getDashboardStats(),
        localApi.getTownNewsSnapshot(),
        localApi.listEvents(guestId, false),
      ]);
      const now = Date.now();
      return {
        stats,
        news,
        events: events.filter((event) => new Date(event.starts_at).getTime() >= now).slice(0, 5),
      };
    }

    const supabase = getSupabase()!;
    const nowIso = new Date().toISOString();
    const weekAgo = weekAgoIso();

    const [
      totalReportsResult,
      resolvedResult,
      drivesResult,
      volunteersResult,
      issuesWeekResult,
      nextEventResult,
      eventsResult,
    ] = await Promise.all([
      supabase.from('reports').select('*', { count: 'exact', head: true }),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
      supabase
        .from('event_rsvps')
        .select('*', { count: 'exact', head: true })
        .not('completed_at', 'is', null),
      supabase.from('newsletter_subscribers').select('*', { count: 'exact', head: true }),
      supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo),
      supabase
        .from('events')
        .select('id, title, starts_at')
        .gte('starts_at', nowIso)
        .order('starts_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('events')
        .select('id, title, description, category, starts_at, location_label, image_url, event_rsvps(guest_id)')
        .gte('starts_at', nowIso)
        .order('starts_at', { ascending: true })
        .limit(8),
    ]);

    const drivesCompleted = drivesResult.count ?? 0;
    const issuesResolved = resolvedResult.count ?? 0;
    const issuesReported = totalReportsResult.count ?? 0;

    const news: TownNewsSnapshot = {
      active_volunteers: volunteersResult.count ?? 0,
      issues_this_week: issuesWeekResult.count ?? 0,
      drives_completed: drivesCompleted,
      issues_resolved: issuesResolved,
      next_event: nextEventResult.data
        ? {
            id: nextEventResult.data.id as string,
            title: nextEventResult.data.title as string,
            starts_at: nextEventResult.data.starts_at as string,
          }
        : null,
    };

    const events = (eventsResult.data ?? []).map((event) => {
      const { attendeeCount, isGoing } = parseEventRsvps(
        event.event_rsvps as Array<{ guest_id: string }> | null,
        guestId
      );
      return formatEventRow(event, attendeeCount, isGoing);
    });

    return {
      stats: {
        drives_completed: drivesCompleted,
        issues_reported: issuesReported,
        issues_resolved: issuesResolved,
      },
      news,
      events: events.slice(0, 5),
    };
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
    return (data ?? []).map((row) => normalizeReportRow(row as Report & { guest_id?: string }, guestId));
  },

  async createReport(guestId: string, input: CreateReportInput) {
    const guest = await localApi.getVolunteerProfile();
    let photoUrl = input.photo_uri ?? null;

    if (isSupabaseConfigured && input.photo_uri) {
      photoUrl = await uploadReportPhoto(guestId, input.photo_uri);
    }

    if (!isSupabaseConfigured) {
      const report = await localApi.createReport(guestId, { ...input, photo_uri: photoUrl ?? undefined });
      afterReportCreated(guestId, report);
      cacheInvalidate('home:');
      return report;
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
        severity: input.severity ?? 'moderate',
        location_label: input.location_label,
        latitude: input.latitude,
        longitude: input.longitude,
        photo_url: photoUrl,
      })
      .select('*')
      .single();

    if (error) throw error;
    await syncVolunteerStatsFromActivity(guestId);
    const report = normalizeReportRow(
      { ...(data as Report), author_name: guest.full_name },
      guestId
    );
    afterReportCreated(guestId, report);
    cacheInvalidate('home:');
    return report;
  },

  async listEvents(guestId: string | null, onlyRsvps = false, limit?: number) {
    if (!isSupabaseConfigured) return localApi.listEvents(guestId, onlyRsvps);

    const supabase = getSupabase()!;
    let query = supabase
      .from('events')
      .select('id, title, description, category, starts_at, location_label, image_url, event_rsvps(guest_id)')
      .order('starts_at', { ascending: true });

    if (typeof limit === 'number') {
      query = query.limit(limit);
    }

    const { data: events, error } = await query;
    if (error) throw error;

    return (events ?? [])
      .map((event) => {
        const { attendeeCount, isGoing } = parseEventRsvps(
          event.event_rsvps as Array<{ guest_id: string }> | null,
          guestId
        );
        return formatEventRow(event, attendeeCount, isGoing);
      })
      .filter((event) => !onlyRsvps || event.is_going);
  },

  async getEvent(eventId: string, guestId: string | null) {
    if (!isSupabaseConfigured) return localApi.getEvent(eventId, guestId);

    const supabase = getSupabase()!;
    const { data, error } = await supabase
      .from('events')
      .select('id, title, description, category, starts_at, location_label, image_url, event_rsvps(guest_id)')
      .eq('id', eventId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const rsvpRows = (data.event_rsvps as Array<{ guest_id: string }> | null) ?? [];
    const { attendeeCount, isGoing } = parseEventRsvps(rsvpRows, guestId);

    return formatEventRow(data, attendeeCount, isGoing);
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

    // RSVP does not change completed-drive stats — skip expensive recount.
    cacheInvalidate('events:');
    cacheInvalidate('home:');
    cacheInvalidate(`drive-checkins:${guestId}`);
    return api.getEvent(eventId, guestId);
  },

  /** Past RSVPs for this volunteer — pending or already marked complete */
  async listVolunteerDriveCheckIns(guestId: string): Promise<VolunteerDriveCheckIn[]> {
    if (!isSupabaseConfigured) return localApi.listVolunteerDriveCheckIns(guestId);

    const supabase = getSupabase()!;
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('event_rsvps')
      .select('completed_at, events!inner(id, title, category, starts_at, location_label, image_url)')
      .eq('guest_id', guestId)
      .lte('events.starts_at', nowIso)
      .order('starts_at', { ascending: false, foreignTable: 'events' });

    if (error) throw error;

    return (data ?? [])
      .map((row) => {
        const eventJoin = row.events as
          | {
              id: string;
              title: string;
              category: string;
              starts_at: string;
              location_label: string;
              image_url: string | null;
            }
          | {
              id: string;
              title: string;
              category: string;
              starts_at: string;
              location_label: string;
              image_url: string | null;
            }[]
          | null;
        const event = Array.isArray(eventJoin) ? eventJoin[0] : eventJoin;
        if (!event) return null;
        return {
          id: event.id,
          title: event.title,
          category: event.category,
          starts_at: event.starts_at,
          location_label: event.location_label,
          image_url: event.image_url,
          completed: Boolean(row.completed_at),
        } satisfies VolunteerDriveCheckIn;
      })
      .filter((row): row is VolunteerDriveCheckIn => Boolean(row));
  },

  /** Volunteer confirms they attended after the drive ended */
  async completeVolunteerDrive(guestId: string, eventId: string) {
    if (!isSupabaseConfigured) return localApi.completeVolunteerDrive(guestId, eventId);

    const supabase = getSupabase()!;
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, starts_at')
      .eq('id', eventId)
      .maybeSingle();
    if (eventError) throw eventError;
    if (!event) throw new Error('Drive not found.');
    if (new Date(event.starts_at).getTime() > Date.now()) {
      throw new Error('You can mark a drive complete only after it has started.');
    }

    const { data: rsvp, error: rsvpError } = await supabase
      .from('event_rsvps')
      .select('id, completed_at')
      .eq('event_id', eventId)
      .eq('guest_id', guestId)
      .maybeSingle();
    if (rsvpError) throw rsvpError;
    if (!rsvp) throw new Error('Join this drive first, then mark it complete after it ends.');

    if (!rsvp.completed_at) {
      const { error: updateError } = await supabase
        .from('event_rsvps')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', rsvp.id);
      if (updateError) throw updateError;
    }

    const subscription = await syncVolunteerStatsFromActivity(guestId);
    cacheInvalidate('events:');
    cacheInvalidate(`drive-checkins:${guestId}`);
    return { subscription, drives: await api.listVolunteerDriveCheckIns(guestId) };
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

    cacheInvalidate('events:');
    cacheInvalidate('home:');

    const event = formatEventRow(data, 0, false);

    // Best-effort push — never block publish on edge function / network
    void supabase.functions.invoke('notify-new-event', {
      body: { event_id: data.id },
    });

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

    cacheInvalidate('events:');
    cacheInvalidate('home:');

    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select('guest_id')
      .eq('event_id', eventId);

    const rsvpRows = rsvps ?? [];
    return formatEventRow(data, rsvpRows.length, false);
  },

  async deleteEvent(eventId: string) {
    if (!isSupabaseConfigured) return localApi.deleteEvent(eventId);

    const supabase = getSupabase()!;
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) throw error;
    cacheInvalidate('events:');
    cacheInvalidate('home:');
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

  async listBadges(guestId: string | null): Promise<Badge[]> {
    if (!isSupabaseConfigured) return localApi.listBadges(guestId);

    const stats = guestId
      ? await collectCloudBadgeStats(guestId)
      : EMPTY_BADGE_STATS;

    const definitions = await loadCloudBadgeDefinitions();
    return evaluateBadgeDefinitions(definitions, stats);
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

    const phone = normalizePhone(input.phone);
    if (!phone) throw new Error('Enter a valid 10-digit phone number.');

    const guest = await localApi.getVolunteerProfile();
    const supabase = getSupabase()!;
    const now = new Date().toISOString();
    const visibleMessage = input.message?.trim() || null;
    const usePhoneColumns = await supportsEmergencyPhoneColumns();

    const { error: resolveError } = await supabase
      .from('emergency_alerts')
      .update({ status: 'resolved', updated_at: now })
      .eq('guest_id', guestId)
      .neq('status', 'resolved');

    if (resolveError) {
      // Non-fatal if there were no prior alerts; only fail hard on auth/network-like issues.
      const message = getErrorMessage(resolveError).toLowerCase();
      if (!message.includes('0 rows') && !message.includes('no rows')) {
        // Continue — creating a new alert is more important than resolving an old one.
      }
    }

    const basePayload = {
      guest_id: guestId,
      citizen_name: guest.full_name || 'Citizen',
      location_label: input.location_label,
      latitude: input.latitude,
      longitude: input.longitude,
    };

    const preferredPayload = usePhoneColumns
      ? {
          ...basePayload,
          citizen_phone: phone,
          message: visibleMessage,
        }
      : {
          ...basePayload,
          message: buildSosMessage({
            visibleMessage,
            citizenPhone: phone,
          }),
        };

    let { data, error } = await supabase
      .from('emergency_alerts')
      .insert(preferredPayload)
      .select('*')
      .single();

    if (error && usePhoneColumns && isMissingColumnError(error, 'citizen_phone')) {
      emergencyPhoneColumnsSupported = false;
      ({ data, error } = await supabase
        .from('emergency_alerts')
        .insert({
          ...basePayload,
          message: buildSosMessage({
            visibleMessage,
            citizenPhone: phone,
          }),
        })
        .select('*')
        .single());
    }

    if (error) throw toError(error, 'Could not create SOS alert. Check your connection and try again.');

    const alert = toPublicEmergencyAlert(
      hydrateEmergencyAlertRow(data as Parameters<typeof hydrateEmergencyAlertRow>[0])
    );
    void notifyVolunteersAboutEmergencyCloud(alert);
    return alert;
  },

  async listActiveEmergencyAlerts(viewerGuestId?: string | null): Promise<EmergencyAlert[]> {
    if (!isSupabaseConfigured) {
      return redactEmergencyPhoneList(await localApi.listActiveEmergencyAlerts(), viewerGuestId);
    }

    const hydrated = await fetchEmergencyAlertRows({ activeOnly: true });
    return finalizeEmergencyAlertsForViewer(hydrated, viewerGuestId);
  },

  async listAllEmergencyAlerts(viewerGuestId?: string | null): Promise<EmergencyAlert[]> {
    if (!isSupabaseConfigured) {
      return redactEmergencyPhoneList(await localApi.listAllEmergencyAlerts(), viewerGuestId);
    }

    const hydrated = await fetchEmergencyAlertRows();
    return finalizeEmergencyAlertsForViewer(hydrated, viewerGuestId);
  },

  async respondToEmergencyAlert(
    alertId: string,
    responderGuestId: string,
    responderName: string,
    responderPhone: string,
    location?: { latitude: number; longitude: number } | null
  ): Promise<EmergencyAlert> {
    if (!isSupabaseConfigured) {
      return localApi.respondToEmergencyAlert(
        alertId,
        responderGuestId,
        responderName,
        responderPhone,
        location
      );
    }

    const phone = normalizePhone(responderPhone);
    if (!phone) throw new Error('Enter a valid 10-digit phone number.');

    const supabase = getSupabase()!;
    const usePhoneColumns = await supportsEmergencyPhoneColumns();
    const now = new Date().toISOString();
    const hasLocation =
      typeof location?.latitude === 'number' && typeof location?.longitude === 'number';

    const { data: existing, error: existingError } = await supabase
      .from('emergency_alerts')
      .select('id, message, status')
      .eq('id', alertId)
      .maybeSingle();

    if (existingError) throw toError(existingError, 'Could not load this SOS alert.');
    if (!existing) throw new Error('Emergency alert not found.');
    if (existing.status === 'resolved') throw new Error('This alert is already resolved.');

    const messageWithPrivate = buildSosMessage({
      previousMessage: existing.message,
      responderPhone: phone,
      responderLatitude: hasLocation ? location!.latitude : null,
      responderLongitude: hasLocation ? location!.longitude : null,
      responderLocationUpdatedAt: hasLocation ? now : null,
    });

    const preferredUpdate = usePhoneColumns
      ? {
          status: 'responding' as const,
          responded_by_guest_id: responderGuestId,
          responded_by_name: responderName,
          responder_phone: phone,
          message: messageWithPrivate,
          ...(hasLocation
            ? {
                responder_latitude: location!.latitude,
                responder_longitude: location!.longitude,
                responder_location_updated_at: now,
              }
            : {}),
          updated_at: now,
        }
      : {
          status: 'responding' as const,
          responded_by_guest_id: responderGuestId,
          responded_by_name: responderName,
          message: messageWithPrivate,
          updated_at: now,
        };

    let { data, error } = await supabase
      .from('emergency_alerts')
      .update(preferredUpdate)
      .eq('id', alertId)
      .neq('status', 'resolved')
      .select('*')
      .single();

    if (
      error &&
      usePhoneColumns &&
      (isMissingColumnError(error, 'responder_phone') ||
        isMissingColumnError(error, 'responder_latitude'))
    ) {
      emergencyPhoneColumnsSupported = false;
      ({ data, error } = await supabase
        .from('emergency_alerts')
        .update({
          status: 'responding',
          responded_by_guest_id: responderGuestId,
          responded_by_name: responderName,
          message: messageWithPrivate,
          updated_at: now,
        })
        .eq('id', alertId)
        .neq('status', 'resolved')
        .select('*')
        .single());
    }

    if (error) throw toError(error, 'Could not update SOS response. Try again.');

    const alert = toPublicEmergencyAlert(
      hydrateEmergencyAlertRow(data as Parameters<typeof hydrateEmergencyAlertRow>[0])
    );

    void supabase.functions.invoke('notify-emergency-response', {
      body: { alert_id: alert.id },
    });
    void notifyRequesterHelpOnWay(alert);

    return alert;
  },

  async updateEmergencyResponderLocation(
    alertId: string,
    responderGuestId: string,
    location: { latitude: number; longitude: number }
  ): Promise<EmergencyAlert> {
    if (!isSupabaseConfigured) {
      return localApi.updateEmergencyResponderLocation(alertId, responderGuestId, location);
    }

    const supabase = getSupabase()!;
    const now = new Date().toISOString();
    const usePhoneColumns = await supportsEmergencyPhoneColumns();

    const { data: existing, error: existingError } = await supabase
      .from('emergency_alerts')
      .select('id, message, status, responded_by_guest_id')
      .eq('id', alertId)
      .maybeSingle();

    if (existingError) throw toError(existingError, 'Could not load this SOS alert.');
    if (!existing) throw new Error('Emergency alert not found.');
    if (existing.status !== 'responding') throw new Error('This alert is not in responding state.');
    if (existing.responded_by_guest_id !== responderGuestId) {
      throw new Error('Only the assigned responder can share live location.');
    }

    const messageWithPrivate = buildSosMessage({
      previousMessage: existing.message,
      responderLatitude: location.latitude,
      responderLongitude: location.longitude,
      responderLocationUpdatedAt: now,
    });

    const preferredUpdate = usePhoneColumns
      ? {
          responder_latitude: location.latitude,
          responder_longitude: location.longitude,
          responder_location_updated_at: now,
          message: messageWithPrivate,
          updated_at: now,
        }
      : {
          message: messageWithPrivate,
          updated_at: now,
        };

    let { data, error } = await supabase
      .from('emergency_alerts')
      .update(preferredUpdate)
      .eq('id', alertId)
      .eq('responded_by_guest_id', responderGuestId)
      .eq('status', 'responding')
      .select('*')
      .single();

    if (
      error &&
      usePhoneColumns &&
      isMissingColumnError(error, 'responder_latitude')
    ) {
      emergencyPhoneColumnsSupported = false;
      ({ data, error } = await supabase
        .from('emergency_alerts')
        .update({
          message: messageWithPrivate,
          updated_at: now,
        })
        .eq('id', alertId)
        .eq('responded_by_guest_id', responderGuestId)
        .eq('status', 'responding')
        .select('*')
        .single());
    }

    if (error) throw toError(error, 'Could not share live location.');

    return toPublicEmergencyAlert(
      hydrateEmergencyAlertRow(data as Parameters<typeof hydrateEmergencyAlertRow>[0])
    );
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
    return toPublicEmergencyAlert(
      hydrateEmergencyAlertRow(data as Parameters<typeof hydrateEmergencyAlertRow>[0])
    );
  },

  async getEmergencyAlert(
    alertId: string,
    viewerGuestId?: string | null
  ): Promise<EmergencyAlert | null> {
    if (!isSupabaseConfigured) {
      const alert = await localApi.getEmergencyAlert(alertId);
      if (!alert) return null;
      return redactEmergencyPhones(alert, viewerGuestId);
    }

    const supabase = getSupabase()!;
    const usePhoneColumns = await supportsEmergencyPhoneColumns();
    const select = usePhoneColumns
      ? EMERGENCY_ALERT_SELECT_WITH_PHONES
      : EMERGENCY_ALERT_SELECT_BASE;

    let { data, error } = await supabase
      .from('emergency_alerts')
      .select(select)
      .eq('id', alertId)
      .maybeSingle();

    if (error && usePhoneColumns && isMissingColumnError(error, 'citizen_phone')) {
      emergencyPhoneColumnsSupported = false;
      ({ data, error } = await supabase
        .from('emergency_alerts')
        .select(EMERGENCY_ALERT_SELECT_BASE)
        .eq('id', alertId)
        .maybeSingle());
    }

    if (error) throw toError(error, 'Could not load SOS alert.');
    if (!data) return null;

    const hydrated = hydrateEmergencyAlertRow(
      data as unknown as Parameters<typeof hydrateEmergencyAlertRow>[0]
    );
    return redactEmergencyPhones(toPublicEmergencyAlert(hydrated), viewerGuestId);
  },

  async getNewsletterSubscription(
    guestId: string,
    options?: { force?: boolean; reconcile?: boolean }
  ) {
    if (!isSupabaseConfigured) return localApi.getNewsletterSubscription(guestId, options);

    // Fast path: AsyncStorage cache (used for instant boot / tab switches)
    if (!options?.force && !options?.reconcile) {
      const cached = await getCachedNewsletter();
      if (cached?.guest_id === guestId) {
        return applyLocalLevelFields({
          ...cached,
          full_name: normalizeVolunteerName(cached.full_name),
        });
      }
    }

    // Expensive recount — only when activity changed (complete drive, report, etc.)
    if (options?.reconcile) {
      const reconciled = await syncVolunteerStatsFromActivity(guestId);
      if (reconciled) return reconciled;
    }

    // Soft refresh: one volunteer_profiles read (no recount)
    const row = await fetchVolunteerProfileRow(guestId);
    if (row) {
      await setCachedNewsletter(row);
      await hydrateGuestStatsFromSubscription(row);
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

    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('guest_id, bio, cause, skills, availability')
      .eq('email', email)
      .maybeSingle();

    if (existing?.guest_id) {
      await reassignVolunteerActivity(existing.guest_id, guestId);
    }

    const { events, reports } = await recountVolunteerActivity(guestId);
    const hoursVolunteered = hoursFromDrives(events);

    const payload = {
      email,
      full_name: input.full_name.trim(),
      guest_id: guestId,
      event_updates: input.event_updates,
      town_newsletter: input.town_newsletter,
      events_attended: events,
      reports_flagged: reports,
      hours_volunteered: hoursVolunteered,
      bio: guestProfile.bio || existing?.bio || '',
      cause: guestProfile.interests || existing?.cause || '',
      skills: guestProfile.skills || existing?.skills || '',
      availability: guestProfile.availability || existing?.availability || '',
    };

    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .upsert(payload, { onConflict: 'email' })
      .select('*')
      .single();

    if (error) throw error;

    const subscription =
      (await syncVolunteerStatsFromActivity(guestId)) ??
      applyLocalLevelFields({
        ...(data as NewsletterSubscription),
        hours_volunteered: hoursVolunteered,
      });
    await setCachedNewsletter(subscription);
    await localApi.updateVolunteerProfile({
      full_name: subscription.full_name,
      registered: true,
      tagline: 'Supporter of Hazaribagh — rising through the ranks.',
      events_joined: subscription.events_attended,
      reports_submitted: subscription.reports_flagged,
      hours_volunteered: subscription.hours_volunteered ?? hoursVolunteered,
    });
    return subscription;
  },

  async newsletterSignIn(guestId: string, email: string) {
    if (!isSupabaseConfigured) return localApi.newsletterSignIn(guestId, email);

    const supabase = getSupabase()!;
    const normalized = email.trim().toLowerCase();
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .eq('email', normalized)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('No subscription found for this email. Sign up first.');

    if (data.guest_id) {
      await reassignVolunteerActivity(data.guest_id, guestId);
    }

    const { data: linked, error: linkError } = await supabase
      .from('newsletter_subscribers')
      .update({ guest_id: guestId })
      .eq('email', normalized)
      .select('*')
      .single();

    if (linkError) throw linkError;

    const subscription =
      (await syncVolunteerStatsFromActivity(guestId)) ??
      applyLocalLevelFields(linked as NewsletterSubscription);
    await setCachedNewsletter(subscription);
    await localApi.updateVolunteerProfile({
      full_name: subscription.full_name,
      registered: true,
      events_joined: subscription.events_attended,
      reports_submitted: subscription.reports_flagged,
      hours_volunteered:
        subscription.hours_volunteered ?? hoursFromDrives(subscription.events_attended),
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
    await updateGuestProfile({ registered: false });
  },

  async takeVolunteerBreak(guestId: string, input: TakeVolunteerBreakInput) {
    if (!isSupabaseConfigured) return localApi.takeVolunteerBreak(guestId, input);

    const supabase = getSupabase()!;
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .update({
        event_updates: input.event_updates,
        town_newsletter: input.town_newsletter,
      })
      .eq('guest_id', guestId)
      .select('*')
      .single();

    if (error) throw error;

    await supabase
      .from('push_tokens')
      .update({ event_updates: input.event_updates })
      .eq('guest_id', guestId);

    const row = await fetchVolunteerProfileRow(guestId);
    const subscription = row ?? applyLocalLevelFields(data as NewsletterSubscription);
    await setCachedNewsletter(subscription);
    await updateGuestProfile({
      registered: false,
      tagline: 'Taking a break — still cheering for Hazaribagh.',
    });
    return subscription;
  },

  async resumeVolunteer(guestId: string) {
    if (!isSupabaseConfigured) return localApi.resumeVolunteer(guestId);

    const subscription = await api.getNewsletterSubscription(guestId);
    if (!subscription) throw new Error('Sign up again to resume volunteering.');

    await updateGuestProfile({
      registered: true,
      full_name: subscription.full_name,
      tagline: 'Back in action for Hazaribagh.',
    });
    return subscription;
  },

  async listVolunteerContacts() {
    if (!isSupabaseConfigured) return localApi.listVolunteerContacts();

    const supabase = getSupabase()!;
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select(
        'guest_id, email, full_name, event_updates, town_newsletter, bio, cause, skills, availability, events_attended, hours_volunteered'
      )
      .order('subscribed_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row) => ({
      guest_id: String(row.guest_id ?? ''),
      email: String(row.email ?? '').trim().toLowerCase(),
      full_name: normalizeVolunteerName(String(row.full_name ?? '')),
      event_updates: Boolean(row.event_updates),
      town_newsletter: Boolean(row.town_newsletter),
      bio: String(row.bio ?? ''),
      cause: String(row.cause ?? ''),
      skills: String(row.skills ?? ''),
      availability: String(row.availability ?? ''),
      events_attended: Number(row.events_attended ?? 0),
      hours_volunteered:
        Number(row.hours_volunteered ?? hoursFromDrives(Number(row.events_attended ?? 0))),
    }));
  },

  async listVolunteersBySkill(skill?: string | null): Promise<VolunteerDirectoryEntry[]> {
    const contacts = await api.listVolunteerContacts();
    const needle = skill?.trim().toLowerCase() ?? '';
    return contacts
      .filter((contact) => {
        if (!needle) return Boolean(contact.skills?.trim());
        return (contact.skills ?? '').trim().toLowerCase() === needle;
      })
      .map((contact) => ({
        guest_id: contact.guest_id ?? '',
        email: contact.email,
        full_name: contact.full_name,
        bio: contact.bio ?? '',
        cause: contact.cause ?? '',
        skills: contact.skills ?? '',
        availability: contact.availability ?? '',
        events_attended: contact.events_attended ?? 0,
        hours_volunteered:
          contact.hours_volunteered ?? hoursFromDrives(contact.events_attended ?? 0),
        registered_active: true,
      }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  },

  listStickyNotes(): Promise<StickyNote[]> {
    return listCloudStickyNotes();
  },

  createStickyNote(guestId: string, body: string, authorName?: string, color?: StickyNoteColor) {
    return createCloudStickyNote({ guestId, body, authorName, color });
  },

  deleteStickyNote(guestId: string, noteId: string) {
    return deleteCloudStickyNote(guestId, noteId);
  },

  /** Admin: pin/unpin so the note stays on the board past 7 days. */
  setStickyNotePinned(noteId: string, pinned: boolean) {
    return setCloudStickyNotePinned(noteId, pinned);
  },

  /** Admin: erase any note from the board. */
  deleteStickyNoteAsAdmin(noteId: string) {
    return deleteCloudStickyNoteAsAdmin(noteId);
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
