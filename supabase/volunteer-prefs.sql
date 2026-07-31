-- Volunteer preference fields for admin skill search
-- Safe to re-run. Includes missing columns from earlier migrations.

alter table public.newsletter_subscribers
  add column if not exists community_hero_features integer not null default 0;

alter table public.newsletter_subscribers
  add column if not exists bio text not null default '';

alter table public.newsletter_subscribers
  add column if not exists cause text not null default '';

alter table public.newsletter_subscribers
  add column if not exists skills text not null default '';

alter table public.newsletter_subscribers
  add column if not exists availability text not null default '';

alter table public.newsletter_subscribers
  add column if not exists hours_volunteered integer not null default 0
    check (hours_volunteered >= 0);

update public.newsletter_subscribers ns
set
  events_attended = coalesce((
    select count(*)::integer
    from public.event_rsvps er
    join public.events e on e.id = er.event_id
    where er.guest_id = ns.guest_id
      and e.starts_at <= now()
  ), 0),
  hours_volunteered = coalesce((
    select count(*)::integer
    from public.event_rsvps er
    join public.events e on e.id = er.event_id
    where er.guest_id = ns.guest_id
      and e.starts_at <= now()
  ), 0) * 3
where true;

create index if not exists newsletter_subscribers_skills_idx
  on public.newsletter_subscribers (skills);

drop view if exists public.volunteer_profiles;

create view public.volunteer_profiles as
select
  ns.id,
  ns.email,
  ns.full_name,
  ns.guest_id,
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
