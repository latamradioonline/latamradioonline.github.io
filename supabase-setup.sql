-- Run this once in Supabase SQL Editor.
-- The browser app uses only the publishable/anon key. Never expose a service_role key.
create table if not exists public.site_settings (
  id integer primary key check (id = 1),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can insert site settings" on public.site_settings;
create policy "Admins can insert site settings"
  on public.site_settings for insert
  to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update site settings" on public.site_settings;
create policy "Admins can update site settings"
  on public.site_settings for update
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;

insert into public.site_settings (id, settings)
values (1, '{"stream_url":"","donate_url":"","streaming_url":"","podcast_url":"","playlist_url":"","schedule_url":"","social_links":[]}'::jsonb)
on conflict (id) do nothing;

-- Your existing noticias and suscriptores tables remain separate.
-- IMPORTANT: create the administrator role via a trusted Supabase Admin API/server process,
-- or set app_metadata.role = "admin" for your user in Supabase Auth's user management UI.
-- Never put the service_role key or admin credentials in app.js or admin.js.
