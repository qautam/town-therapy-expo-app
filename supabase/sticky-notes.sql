-- Town chalkboard sticky notes (sync across devices)
-- Citizen notes expire after 7 days. Admin-pinned notes stay until unpinned/deleted.
-- Safe to re-run.

create table if not exists public.sticky_notes (
  id uuid primary key default uuid_generate_v4(),
  guest_id text not null,
  author_name text not null default 'Citizen',
  body text not null check (char_length(trim(body)) between 1 and 180),
  color text not null default '#F4F1E0',
  pinned boolean not null default false,
  pinned_by uuid references public.profiles(id) on delete set null,
  pinned_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists sticky_notes_created_at_idx
  on public.sticky_notes (created_at desc);

create index if not exists sticky_notes_pinned_idx
  on public.sticky_notes (pinned, created_at desc);

alter table public.sticky_notes enable row level security;

drop policy if exists "Sticky notes are viewable by everyone" on public.sticky_notes;
create policy "Sticky notes are viewable by everyone"
  on public.sticky_notes for select using (true);

drop policy if exists "Anyone can post a sticky note" on public.sticky_notes;
create policy "Anyone can post a sticky note"
  on public.sticky_notes for insert with check (true);

drop policy if exists "Anyone can erase sticky notes" on public.sticky_notes;
create policy "Anyone can erase sticky notes"
  on public.sticky_notes for delete using (true);

drop policy if exists "Admins can pin sticky notes" on public.sticky_notes;
create policy "Admins can pin sticky notes"
  on public.sticky_notes for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Remove expired citizen notes (pinned notes are never purged here)
create or replace function public.purge_expired_sticky_notes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.sticky_notes
  where not pinned
    and created_at < now() - interval '7 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

grant execute on function public.purge_expired_sticky_notes() to anon, authenticated;

-- One-shot cleanup when this migration is applied
select public.purge_expired_sticky_notes();
