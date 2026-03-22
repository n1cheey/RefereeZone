create extension if not exists pgcrypto;

create table if not exists public.allowed_access (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  allowed_role text not null check (allowed_role in ('Instructor', 'Table', 'Referee', 'Stuff')),
  license_number text not null default 'Pending',
  display_name text default '',
  created_at timestamptz not null default now()
);

alter table public.allowed_access
add column if not exists license_number text not null default 'Pending';

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('Instructor', 'Table', 'Referee', 'Stuff')),
  photo_url text not null default 'https://picsum.photos/seed/referee/300/300',
  license_number text not null,
  allowed_access_id uuid references public.allowed_access(id),
  created_at timestamptz not null default now()
);

create table if not exists public.nominations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  game_code text not null,
  teams text not null,
  match_date date not null,
  match_time time not null,
  venue text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.nomination_referees (
  id uuid primary key default gen_random_uuid(),
  nomination_id uuid not null references public.nominations(id) on delete cascade,
  referee_id uuid not null references public.profiles(id) on delete cascade,
  slot_number integer not null check (slot_number between 1 and 3),
  status text not null default 'Pending' check (status in ('Pending', 'Accepted', 'Declined')),
  responded_at timestamptz,
  unique (nomination_id, slot_number)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  nomination_id uuid not null references public.nominations(id) on delete cascade,
  referee_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_role text not null check (author_role in ('Referee', 'Instructor')),
  status text not null default 'Draft' check (status in ('Draft', 'Submitted', 'Reviewed')),
  score integer not null default 0,
  three_po_iot text not null default '',
  criteria text not null default '',
  teamwork text not null default '',
  generally text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (nomination_id, referee_id, author_id)
);

create table if not exists public.ranking_evaluations (
  id uuid primary key default gen_random_uuid(),
  referee_id uuid not null references public.profiles(id) on delete cascade,
  game_code text not null,
  evaluation_date date not null,
  score integer not null check (score in (-1, 0, 1)),
  note text not null default '',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.ranking_performance (
  referee_id uuid primary key references public.profiles(id) on delete cascade,
  physical_fitness integer not null default 0 check (physical_fitness in (-1, 0, 1)),
  mechanics integer not null default 0 check (mechanics in (-1, 0, 1)),
  iot integer not null default 0 check (iot in (-1, 0, 1)),
  criteria_score integer not null default 0 check (criteria_score in (-1, 0, 1)),
  teamwork_score integer not null default 0 check (teamwork_score in (-1, 0, 1)),
  game_control integer not null default 0 check (game_control in (-1, 0, 1)),
  new_philosophy integer not null default 0 check (new_philosophy in (-1, 0, 1)),
  communication integer not null default 0 check (communication in (-1, 0, 1)),
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now()
);

alter table public.allowed_access enable row level security;
alter table public.profiles enable row level security;
alter table public.nominations enable row level security;
alter table public.nomination_referees enable row level security;
alter table public.reports enable row level security;
alter table public.ranking_evaluations enable row level security;
alter table public.ranking_performance enable row level security;

create or replace function public.current_user_role()
returns text
language sql
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
for select using (id = auth.uid() or public.current_user_role() = 'Instructor');

drop policy if exists "nominations role read" on public.nominations;
create policy "nominations role read" on public.nominations
for select using (
  public.current_user_role() = 'Instructor'
  or exists (
    select 1 from public.nomination_referees nr
    where nr.nomination_id = nominations.id and nr.referee_id = auth.uid()
  )
);

drop policy if exists "nomination_referees role read" on public.nomination_referees;
create policy "nomination_referees role read" on public.nomination_referees
for select using (
  public.current_user_role() = 'Instructor'
  or referee_id = auth.uid()
);

drop policy if exists "reports role read" on public.reports;
create policy "reports role read" on public.reports
for select using (
  public.current_user_role() = 'Instructor'
  or (author_id = auth.uid())
  or (
    referee_id = auth.uid()
    and author_role = 'Instructor'
    and status = 'Reviewed'
  )
);

drop policy if exists "ranking referee read" on public.ranking_evaluations;
create policy "ranking referee read" on public.ranking_evaluations
for select using (public.current_user_role() = 'Instructor' or referee_id = auth.uid());

drop policy if exists "ranking performance read" on public.ranking_performance;
create policy "ranking performance read" on public.ranking_performance
for select using (public.current_user_role() = 'Instructor' or referee_id = auth.uid());
