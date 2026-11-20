-- Complete Supabase setup/migration for LATAM Radio Online.
-- Safe to rerun from Supabase SQL Editor. Never expose a service_role key in browser code.
-- Admin account: latamradio345@gmail.com

-- -----------------------------------------------------------------------------
-- Site settings used by app.js and admin.js.
-- -----------------------------------------------------------------------------
create table if not exists public.site_settings (
  id integer primary key check (id = 1),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
  on public.site_settings for select to anon, authenticated using (true);

drop policy if exists "Admins can insert site settings" on public.site_settings;
create policy "Admins can insert site settings"
  on public.site_settings for insert to authenticated
  with check (lower(auth.jwt() ->> 'email') = 'latamradio345@gmail.com');

drop policy if exists "Admins can update site settings" on public.site_settings;
create policy "Admins can update site settings"
  on public.site_settings for update to authenticated
  using (lower(auth.jwt() ->> 'email') = 'latamradio345@gmail.com')
  with check (lower(auth.jwt() ->> 'email') = 'latamradio345@gmail.com');

insert into public.site_settings (id, settings)
values (1, '{"stream_url":"","donate_url":"","streaming_url":"","podcast_url":"","playlist_url":"","schedule_url":"","social_links":[]}'::jsonb)
on conflict (id) do nothing;

-- If the earlier latam_settings table exists, preserve its settings and social URLs.
do $$
begin
  if to_regclass('public.latam_settings') is not null then
    execute $migration$
      insert into public.site_settings (id, settings)
      select 1,
        jsonb_build_object(
          'stream_url', coalesce(stream_url, ''),
          'donate_url', '',
          'streaming_url', '',
          'podcast_url', '',
          'playlist_url', '',
          'schedule_url', '',
          'social_links', jsonb_strip_nulls(jsonb_build_array(
            case when coalesce(instagram_url, '') <> '' then jsonb_build_object('label','Instagram','url',instagram_url) end,
            case when coalesce(bluesky_url, '') <> '' then jsonb_build_object('label','Bluesky','url',bluesky_url) end,
            case when coalesce(youtube_url, '') <> '' then jsonb_build_object('label','YouTube','url',youtube_url) end,
            case when coalesce(ecovigilante_url, '') <> '' then jsonb_build_object('label','Eco-Vigilante','url',ecovigilante_url) end
          ))
        )
      from public.latam_settings where id = 1
      on conflict (id) do update
      set settings = public.site_settings.settings || excluded.settings,
          updated_at = now()
    $migration$;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Newsletter subscriptions.
-- -----------------------------------------------------------------------------
create table if not exists public.latam_newsletter (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text not null unique
);

alter table public.latam_newsletter enable row level security;
grant insert on public.latam_newsletter to anon, authenticated;
grant select on public.latam_newsletter to authenticated;

drop policy if exists "Cualquiera se suscribe" on public.latam_newsletter;
create policy "Cualquiera se suscribe"
  on public.latam_newsletter for insert to anon, authenticated
  with check (length(trim(email)) > 3 and position('@' in email) > 1);

drop policy if exists "Solo Admin lee newsletter" on public.latam_newsletter;
create policy "Solo Admin lee newsletter"
  on public.latam_newsletter for select to authenticated
  using (lower(auth.jwt() ->> 'email') = 'latamradio345@gmail.com');

-- -----------------------------------------------------------------------------
-- News. Create the table when this is a fresh Supabase project; add missing
-- editor columns without replacing existing news rows on an existing project.
-- -----------------------------------------------------------------------------
create table if not exists public.noticias (
  id uuid primary key default gen_random_uuid(),
  titulo text not null default '',
  resumen text not null default '',
  contenido text not null default '',
  imagen text not null default '',
  categoria text not null default 'Noticias',
  destacada boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.noticias add column if not exists titulo text not null default '';
alter table public.noticias add column if not exists resumen text not null default '';
alter table public.noticias add column if not exists contenido text not null default '';
alter table public.noticias add column if not exists imagen text not null default '';
alter table public.noticias add column if not exists categoria text not null default 'Noticias';
alter table public.noticias add column if not exists destacada boolean not null default false;
alter table public.noticias add column if not exists published boolean not null default false;
alter table public.noticias add column if not exists created_at timestamptz not null default now();

alter table public.noticias enable row level security;
grant select on public.noticias to anon, authenticated;
grant insert, update, delete on public.noticias to authenticated;

drop policy if exists "Public can read published news" on public.noticias;
create policy "Public can read published news" on public.noticias
  for select to anon, authenticated using (published or destacada);

drop policy if exists "Admin manages news" on public.noticias;
create policy "Admin manages news" on public.noticias
  for all to authenticated
  using (lower(auth.jwt() ->> 'email') = 'latamradio345@gmail.com')
  with check (lower(auth.jwt() ->> 'email') = 'latamradio345@gmail.com');

-- -----------------------------------------------------------------------------
-- Streaming, podcasts, playlists and schedule managed from the admin panel.
-- -----------------------------------------------------------------------------
create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('streaming','podcast','playlists','schedule')),
  title text not null,
  data jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_content add column if not exists description text not null default '';
alter table public.site_content add column if not exists media_url text not null default '';
alter table public.site_content add column if not exists image_url text not null default '';
alter table public.site_content add column if not exists host text not null default '';
alter table public.site_content add column if not exists start_time time;
alter table public.site_content add column if not exists end_time time;
alter table public.site_content add column if not exists days text not null default '';
alter table public.site_content add column if not exists updated_at timestamptz not null default now();

alter table public.site_content enable row level security;
grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;

drop policy if exists "Public can view published site content" on public.site_content;
create policy "Public can view published site content" on public.site_content
  for select to anon, authenticated
  using (published or lower(auth.jwt() ->> 'email') = 'latamradio345@gmail.com');

drop policy if exists "Admin manages site content" on public.site_content;
create policy "Admin manages site content" on public.site_content
  for all to authenticated
  using (lower(auth.jwt() ->> 'email') = 'latamradio345@gmail.com')
  with check (lower(auth.jwt() ->> 'email') = 'latamradio345@gmail.com');

-- -----------------------------------------------------------------------------
-- Public news/content image bucket; only the configured admin may manage files.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-content', 'site-content', true, 8388608,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
set public = true,
    file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

grant select on storage.objects to anon, authenticated;
grant insert, update, delete on storage.objects to authenticated;

drop policy if exists "Public can view site content images" on storage.objects;
create policy "Public can view site content images" on storage.objects
  for select to anon, authenticated using (bucket_id = 'site-content');

drop policy if exists "Admin uploads site content images" on storage.objects;
create policy "Admin uploads site content images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-content'
    and lower(auth.jwt() ->> 'email') = 'latamradio345@gmail.com');

drop policy if exists "Admin updates site content images" on storage.objects;
create policy "Admin updates site content images" on storage.objects
  for update to authenticated
  using (bucket_id = 'site-content'
    and lower(auth.jwt() ->> 'email') = 'latamradio345@gmail.com')
  with check (bucket_id = 'site-content'
    and lower(auth.jwt() ->> 'email') = 'latamradio345@gmail.com');

drop policy if exists "Admin deletes site content images" on storage.objects;
create policy "Admin deletes site content images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-content'
    and lower(auth.jwt() ->> 'email') = 'latamradio345@gmail.com');

-- Refresh Supabase REST/PostgREST's schema cache after creating the tables.
notify pgrst, 'reload schema';
