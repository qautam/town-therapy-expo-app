-- Confirm admin email so login works (run in SQL Editor)

update auth.users
set email_confirmed_at = now()
where email in ('admin@towntherapy.club', 'admin@towntherapy.app')
  and email_confirmed_at is null;

-- Create/repair admin profile if missing
insert into public.profiles (id, full_name, email, role)
select
  id,
  coalesce(raw_user_meta_data->>'full_name', 'Town Admin'),
  email,
  'admin'
from auth.users
where email in ('admin@towntherapy.club', 'admin@towntherapy.app')
on conflict (id) do update
set role = 'admin', email = excluded.email;

-- Allow a signed-in admin to create their own profile row if the trigger missed it.
drop policy if exists "Authenticated users can create own profile" on public.profiles;
create policy "Authenticated users can create own profile"
  on public.profiles for insert
  with check (auth.uid() = id and role = 'admin');
