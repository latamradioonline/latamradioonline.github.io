-- Admin-only image upload setup for the private content editor.
-- Run content-management.sql first, then run this file in Supabase SQL Editor.
-- Only the configured admin email may upload, update, or delete files.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-content', 'site-content', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

grant select on storage.objects to anon, authenticated;
grant insert, update, delete on storage.objects to authenticated;

drop policy if exists "Public can view site content images" on storage.objects;
create policy "Public can view site content images" on storage.objects
  for select to anon, authenticated using (bucket_id = 'site-content');

drop policy if exists "Admin uploads site content images" on storage.objects;
create policy "Admin uploads site content images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-content' and lower(auth.jwt() ->> 'email') = 'latamradio345@gmail.com');

drop policy if exists "Admin updates site content images" on storage.objects;
create policy "Admin updates site content images" on storage.objects
  for update to authenticated
  using (bucket_id = 'site-content' and lower(auth.jwt() ->> 'email') = 'latamradio345@gmail.com')
  with check (bucket_id = 'site-content' and lower(auth.jwt() ->> 'email') = 'latamradio345@gmail.com');

drop policy if exists "Admin deletes site content images" on storage.objects;
create policy "Admin deletes site content images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-content' and lower(auth.jwt() ->> 'email') = 'latamradio345@gmail.com');
