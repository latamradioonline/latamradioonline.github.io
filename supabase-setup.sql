-- Supabase setup/migration for LATAM Radio Online.
-- Safe to run from the Supabase SQL Editor. Never expose a service_role key in browser code.
-- The administrator email already supplied in the previous SQL is retained below.

-- Site settings used by app.js and admin.js (radio URL, donation link, social links, etc.).
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

-- Newsletter table: stores optional name and required email, as submitted by index.html.
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

-- Existing public.noticias remains unchanged and is still used by the news feed.
-- Admin access is determined by the verified Supabase Auth email above.
-- Users must register/sign in with latamradio345@gmail.com for admin access.
