-- Content management tables and row-level access for LATAM Radio Online.
-- Run this migration in Supabase SQL Editor. Never put a service_role key in browser code.

-- Public sections managed from admin.html: streaming, podcast, playlists, schedule.
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

-- Fields are duplicated as convenient columns for straightforward filtering/rendering.
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
  for select to anon, authenticated using (published or lower(auth.jwt() ->> 'email') = 'latamradio345@gmail.com');
drop policy if exists "Admin manages site content" on public.site_content;
create policy "Admin manages site content" on public.site_content
  for all to authenticated using (lower(auth.jwt() ->> 'email') = 'latamradio345@gmail.com')
  with check (lower(auth.jwt() ->> 'email') = 'latamradio345@gmail.com');

-- Preserve the existing noticias table while ensuring columns used by the public site/admin exist.
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
  for all to authenticated using (lower(auth.jwt() ->> 'email') = 'latamradio345@gmail.com')
  with check (lower(auth.jwt() ->> 'email') = 'latamradio345@gmail.com');

-- The administrator email must match the Supabase Auth account used to sign in.
