-- Storage bucket for report + event photos
-- Run in SQL Editor once

insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', true)
on conflict (id) do update set public = true;

-- Public read
drop policy if exists "Public read report photos" on storage.objects;
create policy "Public read report photos"
  on storage.objects for select
  using (bucket_id = 'report-photos');

-- Authenticated admins / clients can upload
drop policy if exists "Anyone can upload report photos" on storage.objects;
create policy "Anyone can upload report photos"
  on storage.objects for insert
  with check (bucket_id = 'report-photos');

drop policy if exists "Anyone can update report photos" on storage.objects;
create policy "Anyone can update report photos"
  on storage.objects for update
  using (bucket_id = 'report-photos');

drop policy if exists "Anyone can delete report photos" on storage.objects;
create policy "Anyone can delete report photos"
  on storage.objects for delete
  using (bucket_id = 'report-photos');
