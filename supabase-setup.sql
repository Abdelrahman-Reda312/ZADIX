-- ============================================================
-- Zadix website — database setup for Supabase
-- Paste this whole file into: Supabase → SQL Editor → New query → Run
-- Safe to run more than once.
-- ============================================================

-- ---------- Tables ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table if not exists public.site_stats (
  id         int primary key default 1 check (id = 1),   -- single row
  ports      int not null default 13,
  countries  int not null default 2,
  hours      int not null default 24,
  days       int not null default 365,
  med        int not null default 3,
  canal      int not null default 5,
  red        int not null default 5,
  updated_at timestamptz not null default now()
);
insert into public.site_stats (id) values (1) on conflict (id) do nothing;

create table if not exists public.news (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(title) <= 140),
  date       date not null default current_date,
  body       text not null check (char_length(body) <= 3000),
  image      text not null default '' check (char_length(image) <= 500),
  published  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visits (
  id     uuid primary key default gen_random_uuid(),
  page   text not null default '' check (char_length(page) <= 60),
  ref    text not null default '' check (char_length(ref) <= 120),
  vid    text not null default '' check (char_length(vid) <= 40),
  is_new boolean not null default false,
  device text not null default '' check (char_length(device) <= 10),
  lang   text not null default '' check (char_length(lang) <= 10),
  tz     text not null default '' check (char_length(tz) <= 40),
  ts     timestamptz not null default now()
);
create index if not exists visits_ts_idx on public.visits (ts desc);

create table if not exists public.quotes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default '' check (char_length(name) <= 120),
  company    text not null default '' check (char_length(company) <= 160),
  email      text not null default '' check (char_length(email) <= 160),
  phone      text not null default '' check (char_length(phone) <= 60),
  vessel     text not null default '' check (char_length(vessel) <= 120),
  port       text not null default '' check (char_length(port) <= 80),
  eta        text not null default '' check (char_length(eta) <= 80),
  message    text not null default '' check (char_length(message) <= 4000),
  status     text not null default 'new' check (status in ('new', 'handled')),
  created_at timestamptz not null default now()
);

-- ---------- Who is an admin ----------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admins where user_id = auth.uid()); $$;

-- ---------- Row Level Security ----------
alter table public.admins     enable row level security;
alter table public.site_stats enable row level security;
alter table public.news       enable row level security;
alter table public.visits     enable row level security;
alter table public.quotes     enable row level security;

drop policy if exists "admins read self"     on public.admins;
drop policy if exists "stats public read"    on public.site_stats;
drop policy if exists "stats admin write"    on public.site_stats;
drop policy if exists "news public read"     on public.news;
drop policy if exists "news admin write"     on public.news;
drop policy if exists "visits anyone insert" on public.visits;
drop policy if exists "visits admin read"    on public.visits;
drop policy if exists "visits admin delete"  on public.visits;
drop policy if exists "quotes anyone insert" on public.quotes;
drop policy if exists "quotes admin manage"  on public.quotes;

create policy "admins read self"     on public.admins     for select using (user_id = auth.uid());

create policy "stats public read"    on public.site_stats for select using (true);
create policy "stats admin write"    on public.site_stats for update using (public.is_admin()) with check (public.is_admin());

create policy "news public read"     on public.news       for select using (published or public.is_admin());
create policy "news admin write"     on public.news       for all    using (public.is_admin()) with check (public.is_admin());

create policy "visits anyone insert" on public.visits     for insert with check (ts > now() - interval '1 minute');
create policy "visits admin read"    on public.visits     for select using (public.is_admin());
create policy "visits admin delete"  on public.visits     for delete using (public.is_admin());

create policy "quotes anyone insert" on public.quotes     for insert with check (status = 'new');
create policy "quotes admin manage"  on public.quotes     for all    using (public.is_admin()) with check (public.is_admin());

-- ---------- API access ----------
grant usage on schema public to anon, authenticated;
grant select on public.site_stats, public.news to anon, authenticated;
grant insert on public.visits, public.quotes to anon, authenticated;
grant select, insert, update, delete on public.site_stats, public.news, public.visits, public.quotes to authenticated;
grant select on public.admins to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- Make your account the admin ----------
-- First create the user in: Authentication → Users → Add user.
-- Then this line (re-run it after creating the user) marks that account as admin:
insert into public.admins (user_id)
select id from auth.users where email = 'zadix1maritime@gmail.com'
on conflict do nothing;
