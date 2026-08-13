-- Badge catalog + fields needed for unlock criteria
-- Run in SQL Editor after schema.sql / grants.sql

-- Optional display fields on badge definitions
alter table public.badges
  add column if not exists description text not null default '';

alter table public.badges
  add column if not exists tier text not null default 'gold';

-- Count of times a volunteer was featured as community hero (admin can bump)
alter table public.newsletter_subscribers
  add column if not exists community_hero_features integer not null default 0
    check (community_hero_features >= 0);

-- Photos on community wall posts (Town Lens)
alter table public.community_posts
  add column if not exists image_url text;

-- Seed / upsert all badges (criteria live on every profile via app evaluation)
insert into public.badges (id, label, icon, color, bg_color, requirement_type, requirement_count, description, tier) values
  ('first-report', 'First Report', 'flag', '#FF4500', '#FFE8DC', 'reports', 1,
   'Submit your first grievance report', 'coral'),
  ('first-cleanup', 'First Cleanup', 'sparkles', '#FFD635', '#FFF6D6', 'events', 1,
   'Attend your first town drive or event', 'gold'),
  ('active-volunteer', 'Active Volunteer', 'people', '#5B7C99', '#EEF2F6', 'events', 5,
   'Attend 5+ drives or events', 'silver'),
  ('community-hero', 'Community Hero', 'trophy', '#D4A017', '#FFF6D6', 'hero_features', 1,
   'Get featured as a community hero once', 'gold'),
  ('ten-events', '10 Events Joined', 'calendar', '#B87333', '#F5E6D8', 'events', 10,
   'Attend 10+ drives or events', 'bronze'),
  ('the-reporter', 'The Reporter', 'megaphone', '#E8874A', '#FDF0E6', 'reports', 10,
   'Report 10+ grievances', 'coral'),
  ('tree-planter', 'Tree Planter', 'leaf', '#2E7D32', '#E8F5E9', 'tree_events', 1,
   'Join a tree planting drive', 'silver'),
  ('local-legend', 'Local Legend', 'ribbon', '#C98900', '#FFF6D6', 'hero_features', 3,
   'Featured as community hero 3+ times', 'gold'),
  ('town-lens', 'Town Lens', 'camera', '#2E86AB', '#E5F2F8', 'wall_photos', 10,
   'Add 10+ photos on the community wall', 'silver'),
  ('the-mighty-one', 'The Mighty One', 'flame', '#14532D', '#D4EBDA', 'events', 50,
   'Attend 50+ drives or events', 'platinum')
on conflict (id) do update set
  label = excluded.label,
  icon = excluded.icon,
  color = excluded.color,
  bg_color = excluded.bg_color,
  requirement_type = excluded.requirement_type,
  requirement_count = excluded.requirement_count,
  description = excluded.description,
  tier = excluded.tier;

-- Drop legacy numeric badge ids if present from early drafts
delete from public.badges where id ~ '^[0-9]+$';
delete from public.badges where id = 'twenty-five-reports';

-- Refresh volunteer_profiles view to expose hero feature count + hours
create or replace view public.volunteer_profiles as
select
  ns.id,
  ns.email,
  ns.full_name,
  ns.guest_id,
  ns.volunteer_code,
  ns.event_updates,
  ns.town_newsletter,
  ns.events_attended,
  ns.reports_flagged,
  ns.hours_volunteered,
  ns.community_hero_features,
  ns.bio,
  ns.cause,
  ns.skills,
  ns.availability,
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

grant select on public.volunteer_profiles to anon, authenticated;
