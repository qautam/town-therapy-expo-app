-- Public volunteer IDs: TT-HZB-{L}{M}{YY}{NNN}
-- e.g. TT-HZB-P826001
-- TT = Town Therapy, HZB = Hazaribagh, L = first letter of name,
-- M = signup month (1–12), YY = year, NNN = order that month
--
-- Safe to re-run. CREATE OR REPLACE VIEW cannot insert/rename columns mid-list,
-- so we DROP + CREATE the volunteer_profiles view.

alter table public.newsletter_subscribers
  add column if not exists volunteer_code text;

create unique index if not exists newsletter_subscribers_volunteer_code_uidx
  on public.newsletter_subscribers (volunteer_code)
  where volunteer_code is not null;

-- Backfill only rows that are still missing a code
with numbered as (
  select
    id,
    subscribed_at,
    full_name,
    row_number() over (
      partition by
        extract(year from subscribed_at),
        extract(month from subscribed_at)
      order by subscribed_at asc, id asc
    ) as seq
  from public.newsletter_subscribers
  where volunteer_code is null
)
update public.newsletter_subscribers ns
set volunteer_code =
  'TT-HZB-'
  || coalesce(
      nullif(
        upper(substr(regexp_replace(coalesce(ns.full_name, ''), '[^A-Za-z]', '', 'g'), 1, 1)),
        ''
      ),
      'X'
    )
  || extract(month from ns.subscribed_at)::int::text
  || to_char(ns.subscribed_at, 'YY')
  || lpad(numbered.seq::text, 3, '0')
from numbered
where ns.id = numbered.id
  and ns.volunteer_code is null;

drop view if exists public.volunteer_profiles;

create view public.volunteer_profiles as
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
