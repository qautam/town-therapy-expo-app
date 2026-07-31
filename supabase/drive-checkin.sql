-- Volunteer drive check-in: mark attendance after a drive ends
-- Safe to re-run

alter table public.event_rsvps
  add column if not exists completed_at timestamptz;

create index if not exists event_rsvps_completed_at_idx
  on public.event_rsvps (guest_id, completed_at);

-- Repair: drives/hours only count RSVPs the volunteer marked complete
update public.newsletter_subscribers ns
set
  events_attended = coalesce((
    select count(*)::integer
    from public.event_rsvps er
    where er.guest_id = ns.guest_id
      and er.completed_at is not null
  ), 0),
  hours_volunteered = coalesce((
    select count(*)::integer
    from public.event_rsvps er
    where er.guest_id = ns.guest_id
      and er.completed_at is not null
  ), 0) * 3;
