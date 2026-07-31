-- Confirm admin email so login works (run in SQL Editor)

update auth.users
set email_confirmed_at = now()
where email = 'admin@towntherapy.club'
  and email_confirmed_at is null;

-- Create/repair admin profile if missing
insert into public.profiles (id, full_name, email, role)
select
  id,
  coalesce(raw_user_meta_data->>'full_name', 'Town Admin'),
  email,
  'admin'
from auth.users
where email = 'admin@towntherapy.club'
on conflict (id) do update
set role = 'admin', email = excluded.email;
