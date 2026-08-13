-- Keep volunteer hours/drives/reports in sync with real activity
-- Safe to re-run

alter table public.newsletter_subscribers
  add column if not exists hours_volunteered integer not null default 0
    check (hours_volunteered >= 0);

-- Allow RSVP guest_id reassignment when signing in on a new device
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'event_rsvps'
      and policyname = 'Anyone can update event rsvps'
  ) then
    create policy "Anyone can update event rsvps"
      on public.event_rsvps for update using (true) with check (true);
  end if;
end $$;

-- Move activity when a volunteer links a new device guest_id
create or replace function public.reassign_volunteer_guest(old_guest text, new_guest text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if old_guest is null or new_guest is null or old_guest = new_guest then
    return;
  end if;

  -- Drop conflicting RSVPs already on the new guest
  delete from public.event_rsvps er
  where er.guest_id = old_guest
    and exists (
      select 1
      from public.event_rsvps x
      where x.event_id = er.event_id
        and x.guest_id = new_guest
    );

  update public.event_rsvps
  set guest_id = new_guest
  where guest_id = old_guest;

  update public.reports
  set guest_id = new_guest
  where guest_id = old_guest;
end;
$$;

grant execute on function public.reassign_volunteer_guest(text, text) to anon, authenticated;

-- Repair denormalized counters from completed check-ins + reports
update public.newsletter_subscribers ns
set
  events_attended = coalesce((
    select count(*)::integer
    from public.event_rsvps er
    where er.guest_id = ns.guest_id
      and er.completed_at is not null
  ), 0),
  reports_flagged = coalesce((
    select count(*)::integer from public.reports r where r.guest_id = ns.guest_id
  ), 0),
  hours_volunteered = coalesce((
    select count(*)::integer
    from public.event_rsvps er
    where er.guest_id = ns.guest_id
      and er.completed_at is not null
  ), 0) * 3;

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
