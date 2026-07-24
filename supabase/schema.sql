-- Town Therapy backend schema for Supabase
-- Volunteers use the app without login (guest_id on device).
-- Only admins authenticate via Supabase Auth.

create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  tagline text default '',
  role text not null default 'admin' check (role in ('admin')),
  interests text default '',
  skills text default '',
  availability text default '',
  hours_volunteered integer not null default 0,
  events_joined integer not null default 0,
  reports_submitted integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete set null,
  guest_id text,
  reporter_name text not null default 'Volunteer',
  title text not null,
  description text not null default '',
  category text not null default 'general',
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  location_label text,
  latitude double precision,
  longitude double precision,
  photo_url text,
  forwarded_at timestamptz,
  forwarded_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null default '',
  category text not null default 'Cleanup',
  starts_at timestamptz not null,
  location_label text not null,
  image_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.event_rsvps (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  guest_id text,
  created_at timestamptz not null default now(),
  unique(event_id, guest_id)
);

create table if not exists public.community_posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete set null,
  guest_id text,
  author_name text not null default 'Volunteer',
  category text not null check (category in ('Success', 'Before/After', 'Volunteer', 'Local Hero')),
  title text not null,
  description text not null default '',
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  guest_id text,
  created_at timestamptz not null default now(),
  unique(post_id, guest_id)
);

create table if not exists public.badges (
  id text primary key,
  label text not null,
  icon text not null,
  color text not null,
  bg_color text not null,
  requirement_type text not null,
  requirement_count integer not null default 1
);

-- Volunteer level ladder: Supporter → Contributor → Guardian → Champion → Elite → Legend
-- Level is based on drives/events completed (see seed.sql for ranges).
create table if not exists public.volunteer_levels (
  id text primary key,
  name text not null unique,
  rank_order integer not null unique,
  min_events_attended integer not null,
  max_events_attended integer,
  color text not null,
  bg_color text not null,
  description text not null
);

create or replace function public.resolve_volunteer_level_id(events_attended integer)
returns text
language sql
stable
as $$
  select id
  from public.volunteer_levels
  where min_events_attended <= coalesce(events_attended, 0)
  order by min_events_attended desc
  limit 1;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'admin')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger reports_updated_at before update on public.reports
  for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.community_posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.badges enable row level security;
alter table public.volunteer_levels enable row level security;

-- Profiles: admin only
create policy "Admins can read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Admins can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Reports: anyone can read/create; admins can update status
create policy "Reports are viewable by everyone"
  on public.reports for select using (true);

create policy "Anyone can submit reports"
  on public.reports for insert with check (true);

create policy "Admins can update reports"
  on public.reports for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete reports"
  on public.reports for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Events
create policy "Events are viewable by everyone"
  on public.events for select using (true);

create policy "Admins can manage events"
  on public.events for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- RSVPs: open to all volunteers via guest_id
create policy "RSVPs are viewable by everyone"
  on public.event_rsvps for select using (true);

create policy "Anyone can RSVP"
  on public.event_rsvps for insert with check (true);

create policy "Anyone can cancel own RSVP"
  on public.event_rsvps for delete using (true);

-- Community
create policy "Posts are viewable by everyone"
  on public.community_posts for select using (true);

create policy "Anyone can create posts"
  on public.community_posts for insert with check (true);

create policy "Admins can feature posts"
  on public.community_posts for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Likes are viewable by everyone"
  on public.post_likes for select using (true);

create policy "Anyone can like posts"
  on public.post_likes for insert with check (true);

create policy "Anyone can unlike posts"
  on public.post_likes for delete using (true);

create policy "Badges are viewable by everyone"
  on public.badges for select using (true);

create policy "Volunteer levels are viewable by everyone"
  on public.volunteer_levels for select using (true);

-- Volunteer profiles (created on email sign-up; no app password required)
create table if not exists public.newsletter_subscribers (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  full_name text not null default '',
  guest_id text,
  event_updates boolean not null default true,
  town_newsletter boolean not null default true,
  events_attended integer not null default 0 check (events_attended >= 0),
  reports_flagged integer not null default 0 check (reports_flagged >= 0),
  volunteer_level_id text not null default 'supporter' references public.volunteer_levels(id),
  subscribed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.sync_volunteer_profile_level()
returns trigger
language plpgsql
as $$
begin
  new.volunteer_level_id := public.resolve_volunteer_level_id(new.events_attended);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists newsletter_subscribers_level_sync on public.newsletter_subscribers;
create trigger newsletter_subscribers_level_sync
  before insert or update of events_attended
  on public.newsletter_subscribers
  for each row execute procedure public.sync_volunteer_profile_level();

create or replace view public.volunteer_profiles as
select
  ns.id,
  ns.email,
  ns.full_name,
  ns.guest_id,
  ns.event_updates,
  ns.town_newsletter,
  ns.events_attended,
  ns.reports_flagged,
  ns.volunteer_level_id,
  vl.name as level_name,
  vl.rank_order as level_rank,
  vl.min_events_attended as level_min_events,
  vl.max_events_attended as level_max_events,
  vl.color as level_color,
  vl.bg_color as level_bg_color,
  vl.description as level_description,
  next_level.name as next_level_name,
  next_level.min_events_attended as next_level_min_events,
  ns.subscribed_at,
  ns.updated_at
from public.newsletter_subscribers ns
join public.volunteer_levels vl on vl.id = ns.volunteer_level_id
left join lateral (
  select name, min_events_attended
  from public.volunteer_levels
  where rank_order = vl.rank_order + 1
  limit 1
) next_level on true;

alter table public.newsletter_subscribers enable row level security;

create policy "Newsletter subscribers can read own row"
  on public.newsletter_subscribers for select using (true);

create policy "Anyone can subscribe"
  on public.newsletter_subscribers for insert with check (true);

create policy "Anyone can update subscription"
  on public.newsletter_subscribers for update using (true);

create policy "Anyone can unsubscribe"
  on public.newsletter_subscribers for delete using (true);

-- Expo push tokens for event alerts (opt-in via event_updates on newsletter profile)
create table if not exists public.push_tokens (
  id uuid primary key default uuid_generate_v4(),
  guest_id text not null,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android', 'web')),
  event_updates boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_guest_id_idx on public.push_tokens (guest_id);
create index if not exists push_tokens_event_updates_idx on public.push_tokens (event_updates);

alter table public.push_tokens enable row level security;

create policy "Push tokens are readable for delivery"
  on public.push_tokens for select using (true);

create policy "Anyone can register a push token"
  on public.push_tokens for insert with check (true);

create policy "Anyone can update a push token"
  on public.push_tokens for update using (true);

create policy "Anyone can remove a push token"
  on public.push_tokens for delete using (true);

-- Citizen SOS alerts shared in-app with volunteers and admins
create table if not exists public.emergency_alerts (
  id uuid primary key default uuid_generate_v4(),
  guest_id text not null,
  citizen_name text not null default 'Citizen',
  location_label text not null,
  latitude double precision not null,
  longitude double precision not null,
  message text,
  status text not null default 'active' check (status in ('active', 'responding', 'resolved')),
  responded_by_guest_id text,
  responded_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists emergency_alerts_status_idx on public.emergency_alerts (status, created_at desc);

alter table public.emergency_alerts enable row level security;

create policy "Emergency alerts are viewable by everyone"
  on public.emergency_alerts for select using (true);

create policy "Anyone can create an emergency alert"
  on public.emergency_alerts for insert with check (true);

create policy "Anyone can update emergency alert status"
  on public.emergency_alerts for update using (true);

-- Admin-configured authority emails per report category
create table if not exists public.department_contacts (
  department_id text primary key,
  email text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.department_contacts enable row level security;

create policy "Department contacts are viewable by everyone"
  on public.department_contacts for select using (true);

create policy "Anyone can upsert department contacts"
  on public.department_contacts for insert with check (true);

create policy "Anyone can update department contacts"
  on public.department_contacts for update using (true);
