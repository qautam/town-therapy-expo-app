export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  tagline: string;
  role: 'volunteer' | 'admin';
  interests: string;
  skills: string;
  availability: string;
  hours_volunteered: number;
  events_joined: number;
  reports_submitted: number;
};

export type Report = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  severity?: 'minor' | 'moderate' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  location_label: string | null;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  created_at: string;
  forwarded_at?: string | null;
  forwarded_to?: string | null;
  author_name?: string;
  reporter_name?: string;
  guest_id?: string;
};

export type Event = {
  id: string;
  title: string;
  description: string;
  category: string;
  starts_at: string;
  location_label: string;
  image_url: string | null;
  attendee_count: number;
  is_going: boolean;
  /** Volunteer marked this past drive as completed */
  is_completed?: boolean;
};

/** Past RSVP drives waiting for / already checked in */
export type VolunteerDriveCheckIn = {
  id: string;
  title: string;
  category: string;
  starts_at: string;
  location_label: string;
  image_url: string | null;
  completed: boolean;
};

export type CommunityPost = {
  id: string;
  user_id: string;
  category: 'Success' | 'Before/After' | 'Volunteer' | 'Local Hero';
  title: string;
  description: string;
  featured: boolean;
  created_at: string;
  author_name: string;
  author_initial: string;
  likes: number;
  liked_by_me: boolean;
  guest_id?: string;
  image_url?: string | null;
};

export type Badge = {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg_color: string;
  locked: boolean;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'coral';
  shape?:
    | 'flag'
    | 'spark'
    | 'hands'
    | 'trophy'
    | 'calendar'
    | 'clipboard'
    | 'leaf'
    | 'star'
    | 'lens'
    | 'crest';
  description?: string;
  requirement_type?: string;
  requirement_count?: number;
  progress?: number;
};

export type DashboardStats = {
  drives_completed: number;
  issues_reported: number;
  issues_resolved: number;
};

export type TownNewsSnapshot = {
  active_volunteers: number;
  issues_this_week: number;
  drives_completed: number;
  issues_resolved: number;
  next_event: { id: string; title: string; starts_at: string } | null;
};

/** Single cloud payload so home banner + glance metrics stay in sync. */
export type HomeCloudSnapshot = {
  stats: DashboardStats;
  news: TownNewsSnapshot;
  events: Event[];
};

export type TownNewsItem = {
  id: string;
  icon: string;
  text: string;
  route?: string;
};

export type CreateReportInput = {
  title: string;
  description: string;
  category: string;
  severity?: 'minor' | 'moderate' | 'critical';
  location_label?: string;
  latitude?: number;
  longitude?: number;
  photo_uri?: string;
};

export type EmergencyAlertStatus = 'active' | 'responding' | 'resolved';

export type EmergencyAlert = {
  id: string;
  guest_id: string;
  citizen_name: string;
  citizen_phone: string | null;
  location_label: string;
  latitude: number;
  longitude: number;
  message: string | null;
  status: EmergencyAlertStatus;
  responded_by_guest_id: string | null;
  responded_by_name: string | null;
  responder_phone: string | null;
  responder_latitude: number | null;
  responder_longitude: number | null;
  responder_location_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateEmergencyAlertInput = {
  location_label: string;
  latitude: number;
  longitude: number;
  phone: string;
  message?: string;
};

export type DepartmentContact = {
  department_id: string;
  email: string;
  updated_at: string;
};

export type CreatePostInput = {
  category: CommunityPost['category'];
  title: string;
  description: string;
};

export type CreateEventInput = {
  title: string;
  description: string;
  category: string;
  starts_at: string;
  location_label: string;
  image_url?: string | null;
  image_uri?: string;
};

export type UpdateEventInput = CreateEventInput & {
  remove_image?: boolean;
};

export type PushTokenRecord = {
  id: string;
  guest_id: string;
  expo_push_token: string;
  platform: 'ios' | 'android' | 'web';
  event_updates: boolean;
  created_at: string;
  updated_at?: string;
};

export type UpdateProfileInput = {
  bio?: string;
  interests?: string;
  skills?: string;
  availability?: string;
  tagline?: string;
  full_name?: string;
  registered?: boolean;
  events_joined?: number;
  reports_submitted?: number;
  hours_volunteered?: number;
};

export type NewsletterSubscription = {
  id: string;
  email: string;
  full_name: string;
  guest_id: string;
  /** Public ID: TT-HZB-{L}{M}{YY}{NNN} e.g. TT-HZB-P826001. */
  volunteer_code?: string | null;
  event_updates: boolean;
  town_newsletter: boolean;
  events_attended: number;
  reports_flagged: number;
  hours_volunteered?: number;
  community_hero_features?: number;
  bio?: string;
  cause?: string;
  skills?: string;
  availability?: string;
  volunteer_level_id?: string;
  level_name?: string;
  level_rank?: number;
  level_min_events?: number;
  level_max_events?: number | null;
  level_color?: string;
  level_bg_color?: string;
  level_description?: string;
  next_level_name?: string | null;
  next_level_min_events?: number | null;
  subscribed_at: string;
  updated_at?: string;
};

export type VolunteerDirectoryEntry = {
  guest_id: string;
  email: string;
  full_name: string;
  bio: string;
  cause: string;
  skills: string;
  availability: string;
  events_attended: number;
  hours_volunteered?: number;
  registered_active: boolean;
};

export type VolunteerProfileRecord = NewsletterSubscription & {
  level: {
    id: string;
    name: string;
    rankOrder: number;
    minEvents: number;
    maxEvents: number | null;
    color: string;
    bgColor: string;
    description: string;
  };
  next_level: { name: string; minEvents: number } | null;
  progress: number;
  drives_to_next: number;
};

export type NewsletterSignupInput = {
  email: string;
  full_name: string;
  event_updates: boolean;
  town_newsletter: boolean;
};

export type NewsletterUpdateInput = {
  event_updates?: boolean;
  town_newsletter?: boolean;
  full_name?: string;
};

export type TakeVolunteerBreakInput = {
  event_updates: boolean;
  town_newsletter: boolean;
};
