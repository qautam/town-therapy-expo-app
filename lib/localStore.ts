import AsyncStorage from '@react-native-async-storage/async-storage';

import { badges as seedBadges, communityPosts as seedPosts, events as seedEvents, user as seedUser } from '@/constants/data';
import {
  decrementGuestStat,
  getGuestId,
  getGuestProfile,
  incrementGuestStat,
  updateGuestProfile,
} from '@/lib/guest';
import { getCachedNewsletter, setCachedNewsletter } from '@/lib/newsletter';
import { applyLocalLevelFields } from '@/lib/volunteerProfileMapper';
import { presentLocalEmergencyNotification, presentLocalNewEventNotification } from '@/lib/pushNotifications';
import type {
  Badge,
  CommunityPost,
  CreateEmergencyAlertInput,
  CreateEventInput,
  CreatePostInput,
  CreateReportInput,
  DashboardStats,
  Event,
  NewsletterSignupInput,
  NewsletterSubscription,
  NewsletterUpdateInput,
  Profile,
  PushTokenRecord,
  Report,
  EmergencyAlert,
  DepartmentContact,
  UpdateProfileInput,
  UpdateEventInput,
} from '@/types/database';

const STORAGE_KEY = '@town_therapy_local_db';
const ADMIN_SESSION_KEY = '@town_therapy_admin_session';

type LocalAdmin = {
  id: string;
  email: string;
  password: string;
  profile: Profile;
};

type LocalDb = {
  admins: LocalAdmin[];
  reports: Report[];
  events: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    starts_at: string;
    location_label: string;
    image_url: string | null;
  }>;
  rsvps: Array<{ event_id: string; guest_id: string }>;
  posts: CommunityPost[];
  postLikes: Array<{ post_id: string; guest_id: string }>;
  unlockedBadges: string[];
  newsletterSubscribers: NewsletterSubscription[];
  pushTokens: PushTokenRecord[];
  emergencyAlerts: EmergencyAlert[];
  departmentContacts: DepartmentContact[];
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseEventDate(date: string, month: string, time: string) {
  const monthMap: Record<string, number> = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
  };
  const year = new Date().getFullYear();
  const [hourMin, ampm] = time.split(' ');
  const [hourStr, minStr] = hourMin.split(':');
  let hour = parseInt(hourStr, 10);
  const min = parseInt(minStr, 10);
  if (ampm === 'PM' && hour < 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  return new Date(year, monthMap[month] ?? 6, parseInt(date, 10), hour, min).toISOString();
}

function createDefaultDb(): LocalDb {
  const adminId = 'local-admin';
  const profile: Profile = {
    id: adminId,
    full_name: seedUser.name,
    email: seedUser.email,
    tagline: seedUser.tagline,
    role: 'admin',
    interests: seedUser.interests,
    skills: seedUser.skills,
    availability: seedUser.availability,
    hours_volunteered: seedUser.stats.hours,
    events_joined: seedUser.stats.events,
    reports_submitted: seedUser.stats.reports,
  };

  return {
    admins: [{ id: adminId, email: seedUser.email, password: 'towntherapy', profile }],
    reports: [],
    events: seedEvents.map((event, index) => ({
      id: `local-event-${index + 1}`,
      title: event.title,
      description: event.description,
      category: event.category,
      starts_at: parseEventDate(event.date, event.month, event.time),
      location_label: event.location,
      image_url: event.image,
    })),
    rsvps: [],
    posts: seedPosts.map((post, index) => ({
      id: `local-post-${index + 1}`,
      user_id: 'seed',
      category: post.category,
      title: post.title,
      description: post.description,
      featured: post.featured ?? false,
      created_at: new Date(Date.now() - index * 86400000).toISOString(),
      author_name: post.author,
      author_initial: post.authorInitial,
      likes: post.likes,
      liked_by_me: false,
    })),
    postLikes: [],
    unlockedBadges: seedBadges.filter((b) => !b.locked).map((b) => b.id),
    newsletterSubscribers: [],
    pushTokens: [],
    emergencyAlerts: [],
    departmentContacts: [],
  };
}

async function readDb(): Promise<LocalDb> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const db = createDefaultDb();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return db;
  }
  const parsed = JSON.parse(raw) as LocalDb;
  return {
    ...parsed,
    pushTokens: parsed.pushTokens ?? [],
    emergencyAlerts: parsed.emergencyAlerts ?? [],
    departmentContacts: parsed.departmentContacts ?? [],
  };
}

async function notifyVolunteersAboutEmergency(alert: EmergencyAlert) {
  const db = await readDb();
  const volunteerGuestIds = new Set(db.newsletterSubscribers.map((subscriber) => subscriber.guest_id));
  const shouldNotify = db.pushTokens.some((token) => volunteerGuestIds.has(token.guest_id));

  if (shouldNotify) {
    await presentLocalEmergencyNotification(alert);
  }
}

async function notifyLocalSubscribersAboutEvent(event: Event) {
  const db = await readDb();
  const eligibleGuestIds = new Set(
    db.newsletterSubscribers.filter((subscriber) => subscriber.event_updates).map((s) => s.guest_id)
  );
  const shouldNotify = db.pushTokens.some(
    (token) => token.event_updates && eligibleGuestIds.has(token.guest_id)
  );

  if (shouldNotify) {
    await presentLocalNewEventNotification(event);
  }
}

async function writeDb(db: LocalDb) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

async function syncSubscriptionStats(guestId: string, eventsAttended: number, reportsFlagged: number) {
  const db = await readDb();
  const subscription = db.newsletterSubscribers.find((s) => s.guest_id === guestId);
  if (!subscription) return null;

  const updated = applyLocalLevelFields({
    ...subscription,
    events_attended: eventsAttended,
    reports_flagged: reportsFlagged,
  });

  db.newsletterSubscribers = db.newsletterSubscribers.map((s) =>
    s.guest_id === guestId ? updated : s
  );
  await writeDb(db);
  await setCachedNewsletter(updated);
  return updated;
}

async function getAdminSessionId() {
  return AsyncStorage.getItem(ADMIN_SESSION_KEY);
}

function formatEvent(db: LocalDb, event: LocalDb['events'][0], guestId: string | null): Event {
  const attendeeCount = db.rsvps.filter((r) => r.event_id === event.id).length;
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    starts_at: event.starts_at,
    location_label: event.location_label,
    image_url: event.image_url,
    attendee_count: Math.max(attendeeCount, 1),
    is_going: guestId ? db.rsvps.some((r) => r.event_id === event.id && r.guest_id === guestId) : false,
  };
}

export const localApi = {
  async getAdminSession() {
    const adminId = await getAdminSessionId();
    if (!adminId) return { user: null, session: null };

    const db = await readDb();
    const admin = db.admins.find((a) => a.id === adminId);
    return admin ? { user: admin.profile, session: { userId: admin.id } } : { user: null, session: null };
  },

  async adminSignIn(email: string, password: string) {
    const db = await readDb();
    const admin = db.admins.find((a) => a.email === email && a.password === password);
    if (!admin) throw new Error('Invalid admin email or password.');
    if (admin.profile.role !== 'admin') throw new Error('Admin access only.');

    await AsyncStorage.setItem(ADMIN_SESSION_KEY, admin.id);
    return admin.profile;
  },

  async adminSignOut() {
    await AsyncStorage.removeItem(ADMIN_SESSION_KEY);
  },

  async getVolunteerProfile() {
    return getGuestProfile();
  },

  async updateVolunteerProfile(input: UpdateProfileInput & { full_name?: string }) {
    return updateGuestProfile(input);
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const db = await readDb();
    const resolved = db.reports.filter((r) => r.status === 'resolved').length;
    return {
      issues: db.reports.filter((r) => r.status !== 'resolved').length || seedUser.dashboard.issues,
      resolved: resolved || seedUser.dashboard.resolved,
      neighbors: Math.max(db.reports.length, seedUser.dashboard.neighbors),
    };
  },

  async listReports(guestId: string) {
    const db = await readDb();
    return db.reports
      .filter((r) => r.user_id === guestId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async createReport(guestId: string, input: CreateReportInput) {
    const db = await readDb();
    const guest = await getGuestProfile();
    const report: Report = {
      id: createId('report'),
      user_id: guestId,
      title: input.title,
      description: input.description,
      category: input.category,
      status: 'open',
      location_label: input.location_label ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      photo_url: input.photo_uri ?? null,
      created_at: new Date().toISOString(),
      author_name: guest.full_name,
    };
    db.reports.unshift(report);
    await writeDb(db);
    const profile = await incrementGuestStat('reports_submitted');
    await syncSubscriptionStats(guestId, profile.events_joined, profile.reports_submitted);
    return report;
  },

  async listEvents(guestId: string | null, onlyRsvps = false) {
    const db = await readDb();
    return db.events
      .map((event) => formatEvent(db, event, guestId))
      .filter((event) => !onlyRsvps || event.is_going)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  },

  async getEvent(eventId: string, guestId: string | null) {
    const db = await readDb();
    const event = db.events.find((item) => item.id === eventId);
    return event ? formatEvent(db, event, guestId) : null;
  },

  async toggleRsvp(guestId: string, eventId: string) {
    const db = await readDb();
    const existing = db.rsvps.find((r) => r.event_id === eventId && r.guest_id === guestId);
    if (existing) {
      db.rsvps = db.rsvps.filter((r) => r !== existing);
    } else {
      db.rsvps.push({ event_id: eventId, guest_id: guestId });
    }
    await writeDb(db);
    const profile = existing
      ? await decrementGuestStat('events_joined')
      : await incrementGuestStat('events_joined');
    await syncSubscriptionStats(guestId, profile.events_joined, profile.reports_submitted);
    const event = db.events.find((e) => e.id === eventId);
    return event ? formatEvent(db, event, guestId) : null;
  },

  async listPosts(guestId: string | null, category?: string) {
    const db = await readDb();
    return db.posts
      .filter((post) => !category || category === 'All' || post.category === category)
      .map((post) => ({
        ...post,
        liked_by_me: guestId
          ? db.postLikes.some((l) => l.post_id === post.id && l.guest_id === guestId)
          : false,
        likes: db.postLikes.filter((l) => l.post_id === post.id).length || post.likes,
      }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async createPost(guestId: string, input: CreatePostInput) {
    const db = await readDb();
    const guest = await getGuestProfile();
    const post: CommunityPost = {
      id: createId('post'),
      user_id: guestId,
      category: input.category,
      title: input.title,
      description: input.description,
      featured: false,
      created_at: new Date().toISOString(),
      author_name: guest.full_name,
      author_initial: guest.full_name.charAt(0).toUpperCase(),
      likes: 0,
      liked_by_me: false,
    };
    db.posts.unshift(post);
    await writeDb(db);
    return post;
  },

  async toggleLike(guestId: string, postId: string) {
    const db = await readDb();
    const existing = db.postLikes.find((l) => l.post_id === postId && l.guest_id === guestId);
    if (existing) {
      db.postLikes = db.postLikes.filter((l) => l !== existing);
    } else {
      db.postLikes.push({ post_id: postId, guest_id: guestId });
    }
    await writeDb(db);
    const post = db.posts.find((p) => p.id === postId);
    if (!post) return null;
    return {
      ...post,
      likes: db.postLikes.filter((l) => l.post_id === postId).length,
      liked_by_me: !existing,
    };
  },

  async listBadges(): Promise<Badge[]> {
    const db = await readDb();
    return seedBadges.map((badge) => ({
      id: badge.id,
      label: badge.label,
      icon: badge.icon,
      color: badge.color,
      bg_color: badge.bgColor,
      locked: badge.locked ? !db.unlockedBadges.includes(badge.id) : false,
    }));
  },

  async listAllReportsForAdmin() {
    const db = await readDb();
    return db.reports.sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async updateReportStatus(reportId: string, status: Report['status']) {
    const db = await readDb();
    const report = db.reports.find((r) => r.id === reportId);
    if (!report) throw new Error('Report not found.');
    report.status = status;
    await writeDb(db);
    return report;
  },

  async deleteReport(reportId: string) {
    const db = await readDb();
    const exists = db.reports.some((report) => report.id === reportId);
    if (!exists) throw new Error('Report not found.');
    db.reports = db.reports.filter((report) => report.id !== reportId);
    await writeDb(db);
  },

  async markReportForwarded(reportId: string, departmentEmail: string) {
    const db = await readDb();
    const report = db.reports.find((r) => r.id === reportId);
    if (!report) throw new Error('Report not found.');

    report.forwarded_at = new Date().toISOString();
    report.forwarded_to = departmentEmail;
    if (report.status === 'open') report.status = 'in_progress';

    await writeDb(db);
    return report;
  },

  async getNewsletterSubscription(guestId: string) {
    const cached = await getCachedNewsletter();
    if (cached?.guest_id === guestId) return applyLocalLevelFields(cached);

    const db = await readDb();
    const subscription = db.newsletterSubscribers.find((s) => s.guest_id === guestId) ?? null;
    if (!subscription) return null;
    const leveled = applyLocalLevelFields(subscription);
    await setCachedNewsletter(leveled);
    return leveled;
  },

  async newsletterSignUp(guestId: string, input: NewsletterSignupInput) {
    const db = await readDb();
    const email = input.email.trim().toLowerCase();
    const existing = db.newsletterSubscribers.find((s) => s.email === email);
    const guestProfile = await getGuestProfile();

    const subscription: NewsletterSubscription = existing
      ? {
          ...existing,
          guest_id: guestId,
          full_name: input.full_name.trim(),
          event_updates: input.event_updates,
          town_newsletter: input.town_newsletter,
          events_attended: Math.max(existing.events_attended ?? 0, guestProfile.events_joined),
          reports_flagged: Math.max(existing.reports_flagged ?? 0, guestProfile.reports_submitted),
        }
      : {
          id: createId('newsletter'),
          email,
          full_name: input.full_name.trim(),
          guest_id: guestId,
          event_updates: input.event_updates,
          town_newsletter: input.town_newsletter,
          events_attended: guestProfile.events_joined,
          reports_flagged: guestProfile.reports_submitted,
          subscribed_at: new Date().toISOString(),
        };

    const leveled = applyLocalLevelFields(subscription);

    if (existing) {
      db.newsletterSubscribers = db.newsletterSubscribers.map((s) =>
        s.email === email ? leveled : s
      );
    } else {
      db.newsletterSubscribers.push(leveled);
    }

    await writeDb(db);
    await setCachedNewsletter(leveled);
    await updateGuestProfile({
      full_name: leveled.full_name,
      registered: true,
      tagline: 'Supporter of Hazaribagh — rising through the ranks.',
    });
    return leveled;
  },

  async newsletterSignIn(guestId: string, email: string) {
    const db = await readDb();
    const normalized = email.trim().toLowerCase();
    const subscription = db.newsletterSubscribers.find((s) => s.email === normalized);
    if (!subscription) {
      throw new Error('No subscription found for this email. Sign up first.');
    }

    const guestProfile = await getGuestProfile();
    const linked = applyLocalLevelFields({
      ...subscription,
      guest_id: guestId,
      events_attended: Math.max(subscription.events_attended ?? 0, guestProfile.events_joined),
      reports_flagged: Math.max(subscription.reports_flagged ?? 0, guestProfile.reports_submitted),
    });

    db.newsletterSubscribers = db.newsletterSubscribers.map((s) =>
      s.email === normalized ? linked : s
    );
    await writeDb(db);
    await setCachedNewsletter(linked);
    await updateGuestProfile({
      full_name: linked.full_name,
      registered: true,
      events_joined: linked.events_attended,
      reports_submitted: linked.reports_flagged,
    });
    return linked;
  },

  async updateNewsletterSubscription(guestId: string, input: NewsletterUpdateInput) {
    const db = await readDb();
    const subscription = db.newsletterSubscribers.find((s) => s.guest_id === guestId);
    if (!subscription) throw new Error('No active subscription on this device.');

    const updated = applyLocalLevelFields({ ...subscription, ...input });
    db.newsletterSubscribers = db.newsletterSubscribers.map((s) =>
      s.guest_id === guestId ? updated : s
    );
    await writeDb(db);
    await setCachedNewsletter(updated);
    if (input.full_name) await updateGuestProfile({ full_name: input.full_name });
    return updated;
  },

  async newsletterUnsubscribe(guestId: string) {
    const db = await readDb();
    db.newsletterSubscribers = db.newsletterSubscribers.filter((s) => s.guest_id !== guestId);
    db.pushTokens = db.pushTokens.filter((token) => token.guest_id !== guestId);
    await writeDb(db);
    await setCachedNewsletter(null);
    await updateGuestProfile({ registered: false });
  },

  async registerPushToken(
    guestId: string,
    expoPushToken: string,
    platform: PushTokenRecord['platform'],
    eventUpdates: boolean
  ) {
    const db = await readDb();
    const existing = db.pushTokens.find((token) => token.expo_push_token === expoPushToken);
    const now = new Date().toISOString();

    if (existing) {
      db.pushTokens = db.pushTokens.map((token) =>
        token.expo_push_token === expoPushToken
          ? { ...token, guest_id: guestId, platform, event_updates: eventUpdates, updated_at: now }
          : token
      );
    } else {
      db.pushTokens.push({
        id: createId('push'),
        guest_id: guestId,
        expo_push_token: expoPushToken,
        platform,
        event_updates: eventUpdates,
        created_at: now,
        updated_at: now,
      });
    }

    await writeDb(db);
  },

  async removePushToken(guestId: string, expoPushToken: string) {
    const db = await readDb();
    db.pushTokens = db.pushTokens.filter(
      (token) => !(token.guest_id === guestId && token.expo_push_token === expoPushToken)
    );
    await writeDb(db);
  },

  async createEvent(input: CreateEventInput) {
    const db = await readDb();
    const eventRow = {
      id: createId('event'),
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category.trim() || 'Cleanup',
      starts_at: input.starts_at,
      location_label: input.location_label.trim(),
      image_url: input.image_url ?? null,
    };

    db.events.unshift(eventRow);
    await writeDb(db);

    const event = formatEvent(db, eventRow, null);
    await notifyLocalSubscribersAboutEvent(event);
    return event;
  },

  async updateEvent(eventId: string, input: UpdateEventInput) {
    const db = await readDb();
    const event = db.events.find((item) => item.id === eventId);
    if (!event) throw new Error('Event not found.');

    let imageUrl = event.image_url;
    if (input.image_uri) {
      imageUrl = input.image_uri;
    } else if (input.remove_image) {
      imageUrl = null;
    }

    event.title = input.title.trim();
    event.description = input.description.trim();
    event.category = input.category.trim() || 'Cleanup';
    event.starts_at = input.starts_at;
    event.location_label = input.location_label.trim();
    event.image_url = imageUrl;

    await writeDb(db);
    return formatEvent(db, event, null);
  },

  async deleteEvent(eventId: string) {
    const db = await readDb();
    db.events = db.events.filter((event) => event.id !== eventId);
    db.rsvps = db.rsvps.filter((rsvp) => rsvp.event_id !== eventId);
    await writeDb(db);
  },

  async createEmergencyAlert(guestId: string, input: CreateEmergencyAlertInput) {
    const db = await readDb();
    const guest = await getGuestProfile();
    const now = new Date().toISOString();

    db.emergencyAlerts = db.emergencyAlerts.map((alert) =>
      alert.guest_id === guestId && alert.status !== 'resolved'
        ? { ...alert, status: 'resolved' as const, updated_at: now }
        : alert
    );

    const alert: EmergencyAlert = {
      id: createId('sos'),
      guest_id: guestId,
      citizen_name: guest.full_name || 'Citizen',
      location_label: input.location_label,
      latitude: input.latitude,
      longitude: input.longitude,
      message: input.message?.trim() || null,
      status: 'active',
      responded_by_guest_id: null,
      responded_by_name: null,
      created_at: now,
      updated_at: now,
    };

    db.emergencyAlerts.unshift(alert);
    await writeDb(db);
    await notifyVolunteersAboutEmergency(alert);
    return alert;
  },

  async listActiveEmergencyAlerts() {
    const db = await readDb();
    return db.emergencyAlerts
      .filter((alert) => alert.status === 'active' || alert.status === 'responding')
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async listAllEmergencyAlerts() {
    const db = await readDb();
    return db.emergencyAlerts.sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async respondToEmergencyAlert(alertId: string, responderGuestId: string, responderName: string) {
    const db = await readDb();
    const alert = db.emergencyAlerts.find((item) => item.id === alertId);
    if (!alert) throw new Error('Emergency alert not found.');
    if (alert.status === 'resolved') throw new Error('This alert is already resolved.');

    const updated: EmergencyAlert = {
      ...alert,
      status: 'responding',
      responded_by_guest_id: responderGuestId,
      responded_by_name: responderName,
      updated_at: new Date().toISOString(),
    };

    db.emergencyAlerts = db.emergencyAlerts.map((item) => (item.id === alertId ? updated : item));
    await writeDb(db);
    return updated;
  },

  async resolveEmergencyAlert(alertId: string) {
    const db = await readDb();
    const alert = db.emergencyAlerts.find((item) => item.id === alertId);
    if (!alert) throw new Error('Emergency alert not found.');

    const updated: EmergencyAlert = {
      ...alert,
      status: 'resolved',
      updated_at: new Date().toISOString(),
    };

    db.emergencyAlerts = db.emergencyAlerts.map((item) => (item.id === alertId ? updated : item));
    await writeDb(db);
    return updated;
  },

  async listDepartmentContacts() {
    const db = await readDb();
    return db.departmentContacts.sort((a, b) => a.department_id.localeCompare(b.department_id));
  },

  async saveDepartmentContact(departmentId: string, email: string) {
    const db = await readDb();
    const now = new Date().toISOString();
    const normalized = email.trim().toLowerCase();
    const existing = db.departmentContacts.find((contact) => contact.department_id === departmentId);

    if (existing) {
      db.departmentContacts = db.departmentContacts.map((contact) =>
        contact.department_id === departmentId
          ? { ...contact, email: normalized, updated_at: now }
          : contact
      );
    } else {
      db.departmentContacts.push({
        department_id: departmentId,
        email: normalized,
        updated_at: now,
      });
    }

    await writeDb(db);
    return db.departmentContacts.find((contact) => contact.department_id === departmentId)!;
  },

  getGuestId,
};
