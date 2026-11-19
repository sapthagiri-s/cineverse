-- =====================================================================
-- CINEVERSE — DATABASE SETUP (Supabase)
--
-- Run this once: in your Supabase project open SQL Editor → New query,
-- paste this whole file and press Run. Running it again is safe.
--
-- It creates:
--   titles       every movie and series (the same fields as JS/data.js)
--   collections  the homepage rows (Trending, Popular, Free to Watch…)
--   admins       the people allowed to change titles
--   media        a storage bucket for posters, backdrops and subtitle files
--
-- Security (Row Level Security): anyone can READ published titles and the
-- homepage rows; only admins can add, change or delete anything.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

-- One row per movie or series. "data" holds the title in the same shape
-- as a title in JS/data.js (title, type, year, poster, trailer, watch…).
create table if not exists public.titles (
    id          text primary key
                check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    data        jsonb not null
                check (
                    jsonb_typeof(data) = 'object'
                    and coalesce(data ->> 'title', '') <> ''
                    and data ->> 'type' in ('movie', 'series')
                ),
    published   boolean not null default true,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- Homepage rows: an ordered list of title ids.
create table if not exists public.collections (
    id          text primary key
                check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    name        text not null,
    title_ids   text[] not null default '{}',
    position    integer not null default 0,
    updated_at  timestamptz not null default now()
);

-- People allowed to edit (linked to Supabase Auth users).
create table if not exists public.admins (
    user_id     uuid primary key references auth.users (id) on delete cascade,
    email       text,
    created_at  timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------

-- Keeps updated_at current on every change.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists titles_touch_updated_at on public.titles;
create trigger titles_touch_updated_at
    before update on public.titles
    for each row execute function public.touch_updated_at();

drop trigger if exists collections_touch_updated_at on public.collections;
create trigger collections_touch_updated_at
    before update on public.collections
    for each row execute function public.touch_updated_at();

-- true when the signed-in user is in public.admins. It lives in a "private"
-- schema, which the website's API can't reach; the security rules below use it.
create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.admins where user_id = (select auth.uid())
    );
$$;


-- ---------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------

alter table public.titles      enable row level security;
alter table public.collections enable row level security;
alter table public.admins      enable row level security;

-- titles
drop policy if exists "Anyone can read published titles" on public.titles;
create policy "Anyone can read published titles"
    on public.titles for select
    to anon, authenticated
    using (published or (select private.is_admin()));

drop policy if exists "Admins can add titles" on public.titles;
create policy "Admins can add titles"
    on public.titles for insert
    to authenticated
    with check ((select private.is_admin()));

drop policy if exists "Admins can edit titles" on public.titles;
create policy "Admins can edit titles"
    on public.titles for update
    to authenticated
    using ((select private.is_admin()))
    with check ((select private.is_admin()));

drop policy if exists "Admins can delete titles" on public.titles;
create policy "Admins can delete titles"
    on public.titles for delete
    to authenticated
    using ((select private.is_admin()));

-- collections (homepage rows)
drop policy if exists "Anyone can read homepage rows" on public.collections;
create policy "Anyone can read homepage rows"
    on public.collections for select
    to anon, authenticated
    using (true);

drop policy if exists "Admins can add homepage rows" on public.collections;
create policy "Admins can add homepage rows"
    on public.collections for insert
    to authenticated
    with check ((select private.is_admin()));

drop policy if exists "Admins can edit homepage rows" on public.collections;
create policy "Admins can edit homepage rows"
    on public.collections for update
    to authenticated
    using ((select private.is_admin()))
    with check ((select private.is_admin()));

drop policy if exists "Admins can delete homepage rows" on public.collections;
create policy "Admins can delete homepage rows"
    on public.collections for delete
    to authenticated
    using ((select private.is_admin()));

-- admins: a signed-in user can only see their own admin entry.
drop policy if exists "Admins can see themselves" on public.admins;
create policy "Admins can see themselves"
    on public.admins for select
    to authenticated
    using (user_id = (select auth.uid()));


-- ---------------------------------------------------------------------
-- 4. Data API access
--    New Supabase projects no longer open tables to the website
--    automatically, so the access is granted here. Row Level Security
--    above still decides what each person can actually do.
-- ---------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

-- Start from nothing (older projects open new tables to everyone), then
-- grant only what the website and the admin page need.
revoke all on public.titles, public.collections, public.admins from anon, authenticated;

grant select on public.titles, public.collections to anon, authenticated;
grant insert, update, delete on public.titles, public.collections to authenticated;
grant select on public.admins to authenticated;

-- Server-side tools that use the secret key (automations, scripts).
grant select, insert, update, delete on public.titles, public.collections, public.admins to service_role;

grant usage on schema private to anon, authenticated;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;


-- ---------------------------------------------------------------------
-- 5. Storage for posters, backdrops and subtitle files
--    (videos go to a video host such as Bunny Stream; see README)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'media', 'media', true,
    10485760, -- 10 MB per file
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'text/vtt']
)
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can upload media" on storage.objects;
create policy "Admins can upload media"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'media' and (select private.is_admin()));

drop policy if exists "Admins can list media" on storage.objects;
create policy "Admins can list media"
    on storage.objects for select
    to authenticated
    using (bucket_id = 'media' and (select private.is_admin()));

drop policy if exists "Admins can replace media" on storage.objects;
create policy "Admins can replace media"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'media' and (select private.is_admin()))
    with check (bucket_id = 'media' and (select private.is_admin()));

drop policy if exists "Admins can delete media" on storage.objects;
create policy "Admins can delete media"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'media' and (select private.is_admin()));

-- Earlier versions of this file kept is_admin() in the public schema.
drop function if exists public.is_admin();


-- ---------------------------------------------------------------------
-- 6. Make yourself an admin
--    First create your login: Authentication → Users → Add user
--    (your email + a strong password, tick "Auto Confirm User").
--    Then replace the email below with yours and run this file again
--    (or just this statement).
-- ---------------------------------------------------------------------

insert into public.admins (user_id, email)
select id, email from auth.users
where lower(email) = lower('you@example.com')
on conflict (user_id) do nothing;
